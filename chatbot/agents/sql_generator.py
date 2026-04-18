"""SQL Generator Agent - converts natural language to SQL with role-based scoping."""
import re
from typing import Optional
from state import AgentState
from prompts import AGENT_CONFIGS, SQL_GENERATOR_PROMPT, ROLE_CONTEXTS
from database import DB_SCHEMA_DESCRIPTION
from llm import call_llm

# Tables that contain user_id for role filtering (truly personal data only)
# Note: 'reviews' is NOT here because review aggregates (counts, ratings) are public data.
# The LLM prompt instructs it to add user_id filter only for "my reviews" type queries.
USER_SCOPED_TABLES = {"orders", "customer_profiles"}
STORE_SCOPED_TABLES = {"orders", "products", "order_items", "reviews"}

# Tables that non-ADMIN roles should never query directly
_ADMIN_ONLY_TABLES = {"users", "stores"}
# For INDIVIDUAL: can only see own row in users (via user_id filter)
# For CORPORATE: can only see own stores (via owner_id filter)

# SQL keywords that should never be treated as table aliases
_SQL_KEYWORDS = {
    "GROUP", "ORDER", "HAVING", "LIMIT", "WHERE", "ON", "AND", "OR", "NOT",
    "JOIN", "LEFT", "RIGHT", "INNER", "OUTER", "CROSS", "FULL", "NATURAL",
    "SET", "INTO", "VALUES", "FROM", "SELECT", "AS", "IN", "IS", "NULL",
    "BETWEEN", "LIKE", "EXISTS", "UNION", "INTERSECT", "EXCEPT", "CASE",
    "WHEN", "THEN", "ELSE", "END", "ASC", "DESC", "BY", "OFFSET",
}


def _add_where_clause(sql: str, filter_clause: str) -> str:
    """Safely inject a WHERE condition into a SQL SELECT statement."""
    sql_upper = sql.upper()
    if " WHERE " in sql_upper:
        # Add filter right after existing WHERE
        sql = re.sub(r'(?i)\bWHERE\b', f'WHERE {filter_clause} AND', sql, count=1)
    else:
        # Find insertion point: before GROUP BY, ORDER BY, LIMIT, HAVING, or at end
        match = re.search(
            r'(?i)(GROUP\s+BY|ORDER\s+BY|HAVING|LIMIT)\b', sql
        )
        if match:
            pos = match.start(0)
            sql = sql[:pos] + f'WHERE {filter_clause} ' + sql[pos:]
        else:
            # Append before trailing semicolon or at end
            sql = sql.rstrip().rstrip(';')
            sql += f' WHERE {filter_clause}'
    return sql


def _is_personal_query(question: str) -> bool:
    """Detect if the user is asking about their own data vs platform aggregate.
    
    Returns True for personal queries ('my orders', 'what did I buy').
    Returns False for aggregate/platform-wide queries ('top 5 most sold', 'total revenue').
    """
    q = ' ' + question.lower() + ' '
    personal_patterns = [
        r'\bmy\b', r'\bmine\b', r'\bi\s+have\b', r'\bi\s+bought\b',
        r'\bi\s+ordered\b', r'\bi\s+reviewed\b', r'\bi\s+spent\b',
        r"\bi'm\b", r"\bi've\b", r'\bmy\s+order', r'\bmy\s+review',
        r'\bmy\s+purchase', r'\bmy\s+profile', r'\bmy\s+account',
        r'\bmy\s+shipment', r'\bdid\s+i\b', r'\bhave\s+i\b',
    ]
    return any(re.search(p, q) for p in personal_patterns)


def _inject_role_filter(sql: str, role: str, user_id: int, store_id: int, question: str = "") -> str:
    """Enforce role-based WHERE clauses if the LLM omitted them.
    
    For INDIVIDUAL users, only applies user_id filtering to personal queries
    (detected via _is_personal_query). Aggregate/platform-wide queries are
    left unfiltered so users can see platform statistics.
    """
    if role == "ADMIN":
        return sql

    sql_upper = sql.upper()

    if role == "INDIVIDUAL":
        # Always block direct access to users table — only allow own row
        if re.search(r'\busers\b', sql, re.IGNORECASE):
            if not re.search(r'\buser_id\s*=\s*' + str(user_id), sql, re.IGNORECASE) and \
               not re.search(r'\busers\.id\s*=\s*' + str(user_id), sql, re.IGNORECASE) and \
               not re.search(r'\bid\s*=\s*' + str(user_id), sql, re.IGNORECASE):
                sql = _add_where_clause(sql, f"users.id = {user_id}")

        # For aggregate queries (no personal keywords), skip order/table filtering
        # This allows platform-wide stats like "top 5 most sold products"
        if not _is_personal_query(question):
            return sql

        # Personal query: apply user_id filter to scoped tables
        filter_col = "user_id"
        filter_val = user_id
        if re.search(r'\buser_id\s*=\s*' + str(user_id), sql, re.IGNORECASE):
            return sql
        tables_used = [t for t in USER_SCOPED_TABLES if re.search(r'\b' + t + r'\b', sql, re.IGNORECASE)]
        if not tables_used:
            return sql
        for table in tables_used:
            alias_match = re.search(r'\b(' + table + r')\s+(?:AS\s+)?(\w+)', sql, re.IGNORECASE)
            prefix = ""
            if alias_match:
                candidate = alias_match.group(2)
                if candidate.upper() not in _SQL_KEYWORDS:
                    prefix = candidate + "."
            filter_clause = f"{prefix}{filter_col} = {filter_val}"
            sql = _add_where_clause(sql, filter_clause)
            break

    elif role == "CORPORATE" and store_id:
        # Block direct access to users table
        if re.search(r'\busers\b', sql, re.IGNORECASE):
            # Corporate can only see users through orders/reviews on their store
            if not re.search(r'\bstore_id\s*=\s*' + str(store_id), sql, re.IGNORECASE):
                sql = _add_where_clause(sql, f"store_id = {store_id}")
                return sql

        # Filter stores to own store only
        if re.search(r'\bstores\b', sql, re.IGNORECASE):
            if not re.search(r'\bstores\.id\s*=\s*' + str(store_id), sql, re.IGNORECASE) and \
               not re.search(r'\bowner_id\s*=', sql, re.IGNORECASE):
                sql = _add_where_clause(sql, f"stores.id = {store_id}")

        filter_col = "store_id"
        filter_val = store_id
        if re.search(r'\bstore_id\s*=\s*' + str(store_id), sql, re.IGNORECASE):
            return sql
        tables_used = [t for t in STORE_SCOPED_TABLES if re.search(r'\b' + t + r'\b', sql, re.IGNORECASE)]
        if not tables_used:
            return sql
        for table in tables_used:
            # Reviews don't have store_id directly; filter via product_id JOIN
            if table == "reviews" and "store_id" not in sql.lower():
                sql = _add_where_clause(
                    sql,
                    f"product_id IN (SELECT id FROM products WHERE store_id = {filter_val})"
                )
                break
            alias_match = re.search(r'\b(' + table + r')\s+(?:AS\s+)?(\w+)', sql, re.IGNORECASE)
            prefix = ""
            if alias_match:
                candidate = alias_match.group(2)
                if candidate.upper() not in _SQL_KEYWORDS:
                    prefix = candidate + "."
            filter_clause = f"{prefix}{filter_col} = {filter_val}"
            sql = _add_where_clause(sql, filter_clause)
            break

    return sql


# Patterns for deterministic follow-up resolution
_HIGHEST_PATTERN = re.compile(
    r'\b(highest|largest|biggest|most|maximum|max|top)\b', re.IGNORECASE
)
_LOWEST_PATTERN = re.compile(
    r'\b(lowest|smallest|least|minimum|min|bottom|fewest)\b', re.IGNORECASE
)
_SECOND_PATTERN = re.compile(
    r'\b(second|2nd)\b', re.IGNORECASE
)


def _try_deterministic_followup(question: str, last_sql: str, last_columns: str) -> Optional[str]:
    """Try to mechanically transform the previous SQL for common follow-up patterns.
    Returns a new SQL string if matched, None otherwise (fall through to LLM).
    """
    if not last_sql:
        return None

    q_lower = question.lower()

    # Pattern: "which one had the highest/lowest X?"
    is_highest = bool(_HIGHEST_PATTERN.search(question))
    is_lowest = bool(_LOWEST_PATTERN.search(question))
    if not is_highest and not is_lowest:
        return None

    direction = "DESC" if is_highest else "ASC"
    is_second = bool(_SECOND_PATTERN.search(question))

    # Find the target column from the question
    # Extract candidate words: nouns after highest/lowest that might be column names
    col_candidates = re.findall(
        r'\b(?:highest|largest|biggest|most|maximum|max|top|'
        r'lowest|smallest|least|minimum|min|bottom|fewest)\s+'
        r'(\w+)', question, re.IGNORECASE
    )

    # Map common words to likely column names
    _COLUMN_ALIASES = {
        "total": ["grand_total", "total", "amount", "sum"],
        "price": ["unit_price", "price", "amount"],
        "revenue": ["grand_total", "revenue", "total_revenue", "amount"],
        "quantity": ["quantity", "qty", "count"],
        "rating": ["rating", "avg_rating", "average_rating"],
        "count": ["order_count", "count", "cnt"],
        "sales": ["grand_total", "total_sales", "sales"],
        "amount": ["grand_total", "amount", "total"],
        "orders": ["order_count", "total_orders", "count"],
    }

    # Parse last_columns into a list
    available_cols = [c.strip() for c in last_columns.split(",")] if last_columns else []

    # Find the best matching column
    sort_col = None
    for candidate in col_candidates:
        candidate_lower = candidate.lower()
        # Direct match in available columns
        if candidate_lower in [c.lower() for c in available_cols]:
            sort_col = candidate_lower
            break
        # Check aliases
        aliases = _COLUMN_ALIASES.get(candidate_lower, [])
        for alias in aliases:
            if alias.lower() in [c.lower() for c in available_cols]:
                sort_col = alias
                break
        if sort_col:
            break

    if not sort_col:
        # Fallback: look for any numeric-sounding column in previous results
        for col in available_cols:
            cl = col.lower()
            if any(hint in cl for hint in ["total", "price", "amount", "revenue", "count", "sum", "qty", "quantity", "rating"]):
                sort_col = col
                break

    if not sort_col:
        return None

    # Build new SQL from the previous one
    # Strip existing ORDER BY, LIMIT, OFFSET clauses
    base_sql = re.sub(r'(?i)\s+ORDER\s+BY\s+.+$', '', last_sql)
    base_sql = re.sub(r'(?i)\s+LIMIT\s+\d+(\s+OFFSET\s+\d+)?', '', base_sql)
    base_sql = base_sql.rstrip().rstrip(';')

    # Add new ORDER BY and LIMIT
    limit_clause = "LIMIT 1 OFFSET 1" if is_second else "LIMIT 1"
    new_sql = f"{base_sql} ORDER BY {sort_col} {direction} {limit_clause}"

    return new_sql


def sql_generator_agent(state: AgentState) -> dict:
    role = state["user_role"]
    role_context = ROLE_CONTEXTS.get(role, ROLE_CONTEXTS["ADMIN"])

    if role == "CORPORATE" and state.get("store_id"):
        role_context = role_context.format(store_id=state["store_id"])
    elif role == "INDIVIDUAL":
        role_context = role_context.format(user_id=state["user_id"])

    # Include conversation context for multi-turn follow-up questions
    question = state["question"]
    context = state.get("conversation_context", "")
    if context:
        # Extract the last SQL query from context for reference
        last_sql = ""
        sql_matches = re.findall(r'SQL:\s*(.+?)(?:\n|$)', context)
        if sql_matches:
            last_sql = sql_matches[-1].strip()

        # Extract result columns from context for better follow-up understanding
        last_columns = ""
        col_matches = re.findall(r'Result columns:\s*(.+?)(?:\n|$)', context)
        if col_matches:
            last_columns = col_matches[-1].strip()

        # Try deterministic follow-up first (bypass LLM for common patterns)
        det_sql = _try_deterministic_followup(state["question"], last_sql, last_columns)
        if det_sql:
            det_sql = _inject_role_filter(det_sql, role, state.get("user_id", 0), state.get("store_id"), question=state["question"])
            return {"sql_query": det_sql, "error": None}

        question = (
            f"=== CONVERSATION HISTORY ===\n"
            f"{context}\n"
            f"=== END CONVERSATION HISTORY ===\n\n"
            f"The user is asking a FOLLOW-UP question.\n"
        )
        if last_sql:
            question += f"The LAST SQL query was: {last_sql}\n"
        if last_columns:
            question += f"The LAST query returned these columns: {last_columns}\n"
        question += (
            f"\nYou MUST generate a NEW, DIFFERENT SQL query that answers the follow-up.\n"
            f"DO NOT repeat the previous SQL query verbatim.\n"
            f"Use the SAME tables and columns from the previous query as the basis.\n\n"
            f"Follow-up interpretation guide:\n"
            f"- 'which one had the highest/lowest' → use ORDER BY on a numeric column from the previous result, then LIMIT 1\n"
            f"- 'total' usually refers to grand_total or a SUM column from the previous result\n"
            f"- 'second highest/lowest' → use the same query with LIMIT 1 OFFSET 1\n"
            f"- 'what about X' → modify the previous query to focus on X\n"
            f"- 'show more details' → expand columns or remove LIMIT\n"
            f"- 'compare with' → include both the previous subject and the new one\n"
            f"- 'why/how' → drill down into details behind the previous result\n"
            f"- Pronouns like 'it', 'they', 'those', 'that' refer to entities from the previous result\n\n"
            f"CURRENT QUESTION: {state['question']}"
        )

    prompt = SQL_GENERATOR_PROMPT.format(
        schema=DB_SCHEMA_DESCRIPTION,
        role_context=role_context,
        question=question
    )

    sql = call_llm(prompt, max_tokens=1024, system_prompt=AGENT_CONFIGS["sql_agent"]["system_prompt"])
    sql = sql.strip()

    # Clean up: remove markdown code blocks if present
    if sql.startswith("```"):
        lines = sql.split("\n")
        sql = "\n".join(l for l in lines if not l.startswith("```"))
        sql = sql.strip()

    # Clean up: remove common LLM preamble text before the actual SQL
    # Some models prepend "Here is the SQL query:" or similar
    sql_match = re.search(r'(SELECT\b|WITH\b)', sql, re.IGNORECASE)
    if sql_match and sql_match.start() > 0:
        sql = sql[sql_match.start():]

    # Strip trailing explanation text after the SQL (look for double newline or common patterns)
    sql = re.split(r'\n\s*\n', sql)[0].strip()
    sql = re.split(r'\n\s*(?:This|Note|Explanation|The above|Bu sorgu)', sql, flags=re.IGNORECASE)[0].strip()

    # Security: reject non-SELECT queries
    first_word = sql.split()[0].upper() if sql.split() else ""
    if first_word not in ("SELECT", "WITH"):
        # LLM failed to produce valid SQL — use keyword-based fallback
        print(f"[SQL Generator] LLM produced invalid SQL (starts with '{first_word}'), using fallback")
        from llm import _generate_fallback_sql
        sql = _generate_fallback_sql(prompt)
        first_word = sql.split()[0].upper() if sql.split() else ""
        if first_word not in ("SELECT", "WITH"):
            return {"sql_query": None, "error": "Only SELECT queries are allowed."}

    # Security: block UNION/INTERSECT/EXCEPT to prevent cross-table data exfiltration
    _BANNED_SET_OPS = re.compile(r'\b(UNION\s+(ALL\s+)?SELECT|INTERSECT\s+(ALL\s+)?SELECT|EXCEPT\s+(ALL\s+)?SELECT)\b', re.IGNORECASE)
    if _BANNED_SET_OPS.search(sql):
        return {"sql_query": None, "error": "UNION/INTERSECT/EXCEPT queries are not allowed."}

    # Security: block multi-statement SQL (semicolons)
    if ";" in sql.strip().rstrip(";"):
        return {"sql_query": None, "error": "Multi-statement queries are not allowed."}

    # Enforce role-based data isolation
    sql = _inject_role_filter(sql, role, state.get("user_id", 0), state.get("store_id"), question=state["question"])

    return {"sql_query": sql, "error": None}
