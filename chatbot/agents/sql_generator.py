"""SQL Generator Agent - converts natural language to SQL with role-based scoping."""
import re
from typing import Optional
from state import AgentState
from prompts import AGENT_CONFIGS, SQL_GENERATOR_PROMPT, ROLE_CONTEXTS
from database import DB_SCHEMA_DESCRIPTION
from llm import call_llm
import datetime

# Tables that contain user_id for direct personal-data role filtering.
USER_SCOPED_TABLES = {"orders", "reviews", "customer_profiles"}
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
        r'\bi\s+buy\b', r'\bi\s+shop\b', r'\bi\s+spend\b',
        r"\bi'm\b", r"\bi've\b", r'\bmy\s+order', r'\bmy\s+review',
        r'\bmy\s+purchase', r'\bmy\s+profile', r'\bmy\s+account',
        r'\bmy\s+shipment', r'\bmy\s+categor', r'\bmy\s+spend',
        r'\bdid\s+i\b', r'\bhave\s+i\b', r'\bdo\s+i\b',
        r'\bi\s+buy\s+from\b', r'\bi\s+purchased\b',
        r'\bhow\s+much\s+have\s+i\b', r'\bhow\s+many.*\bi\b',
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

        # Tables that contain user-specific data — ALWAYS filter for INDIVIDUAL users
        always_personal_tables = {'orders', 'order_items', 'reviews', 'shipments', 'customer_profiles'}
        has_personal_table = any(re.search(r'\b' + t + r'\b', sql, re.IGNORECASE) for t in always_personal_tables)

        # Platform-wide aggregate queries should NOT be user-filtered
        # (e.g. "top 5 products", "best selling", "most popular products", "product performance")
        platform_patterns = [
            r'\btop\s+\d', r'\bbest\s+sell', r'\bmost\s+(popular|sold|ordered|reviewed)',
            r'\bproduct\s+performance', r'\bproduct\s+ranking', r'\bhighest\s+rated',
            r'\blowest\s+rated', r'\bbest\s+product', r'\bworst\s+product',
            r'\btotal\s+revenue', r'\bplatform\s+', r'\ball\s+products',
            r'\boverall\s+', r'\bstore\s+performance', r'\bcategory\s+performance',
        ]
        is_platform_query = any(re.search(p, question.lower()) for p in platform_patterns)

        # For aggregate queries on general tables (products, categories, stores), skip filtering
        # Also skip for platform-wide analytics queries even if they touch order_items/reviews
        if not _is_personal_query(question) and (not has_personal_table or is_platform_query):
            return sql

        # Personal query: apply user_id filter to scoped tables
        filter_col = "user_id"
        filter_val = user_id
        if re.search(r'\buser_id\s*=\s*' + str(user_id), sql, re.IGNORECASE):
            return sql
        tables_used = [
            t for t in ["orders", "reviews", "customer_profiles", "order_items", "shipments"]
            if re.search(r'\b' + t + r'\b', sql, re.IGNORECASE)
        ]
        if not tables_used:
            return sql
        for table in tables_used:
            if table in {"order_items", "shipments"}:
                sql = _add_where_clause(
                    sql,
                    f"order_id IN (SELECT id FROM orders WHERE user_id = {filter_val})"
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

    elif role == "CORPORATE" and store_id:
        # ── DEFENSE-IN-DEPTH: strip any reference to other stores ──
        # 1) Remove store_id = <other_id> conditions injected by LLM
        sql = re.sub(
            r'\bstore_id\s*=\s*(\d+)',
            lambda m: f'store_id = {store_id}' if int(m.group(1)) != store_id else m.group(0),
            sql, flags=re.IGNORECASE
        )
        # 2) Remove stores.id = <other_id> conditions
        sql = re.sub(
            r'\bstores\.id\s*=\s*(\d+)',
            lambda m: f'stores.id = {store_id}' if int(m.group(1)) != store_id else m.group(0),
            sql, flags=re.IGNORECASE
        )

        # 3) Find the alias used for the stores table (e.g., "stores s" → alias "s")
        stores_alias_match = re.search(r'\bstores\s+(?:AS\s+)?(\w+)', sql, re.IGNORECASE)
        stores_aliases = ['stores', 'store']
        store_filter_alias = "stores"
        if stores_alias_match:
            candidate = stores_alias_match.group(1)
            if candidate.upper() not in _SQL_KEYWORDS:
                stores_aliases.append(candidate)
                store_filter_alias = candidate
        store_filter_clause = f"{store_filter_alias}.id = {store_id}"

        # 4) Strip .name = '...' or LIKE '...' for ALL aliases of the stores table
        for alias in stores_aliases:
            # Direct: alias.name = 'SomeName'
            sql = re.sub(
                rf"\b{re.escape(alias)}\.name\s*(=|LIKE|ILIKE)\s*'[^']*'",
                store_filter_clause,
                sql, flags=re.IGNORECASE
            )
            # Wrapped: LOWER(alias.name) = 'somename'
            sql = re.sub(
                rf"\b(LOWER|UPPER)\s*\(\s*{re.escape(alias)}\.name\s*\)\s*(=|LIKE|ILIKE)\s*'[^']*'",
                store_filter_clause,
                sql, flags=re.IGNORECASE
            )
            # Also catch alias.id = <other_id>
            if alias not in ('stores', 'store'):
                sql = re.sub(
                    rf'\b{re.escape(alias)}\.id\s*=\s*(\d+)',
                    lambda m, sid=store_id: f'{alias}.id = {sid}' if int(m.group(1)) != sid else m.group(0),
                    sql, flags=re.IGNORECASE
                )

        # 5) An LLM may translate "other owner's store" into owner_id = <id>.
        # Corporate users are scoped by authenticated store_id, so owner_id
        # predicates must not become an alternate authorization boundary.
        if re.search(r'\bstores\b', sql, re.IGNORECASE):
            sql = re.sub(
                r'\bowner_id\s*=\s*(\d+)',
                store_filter_clause,
                sql,
                flags=re.IGNORECASE
            )

        # Block direct access to users table
        if re.search(r'\busers\b', sql, re.IGNORECASE):
            # Corporate can only see users through orders/reviews on their store
            if not re.search(r'\bstore_id\s*=\s*' + str(store_id), sql, re.IGNORECASE):
                sql = _add_where_clause(sql, f"store_id = {store_id}")
                return sql

        # Filter stores to own store only
        if re.search(r'\bstores\b', sql, re.IGNORECASE):
            if not re.search(r'\b(?:stores|store|' + re.escape(store_filter_alias) + r')\.id\s*=\s*' + str(store_id), sql, re.IGNORECASE):
                sql = _add_where_clause(sql, store_filter_clause)

        filter_col = "store_id"
        filter_val = store_id
        if re.search(r'\bstore_id\s*=\s*' + str(store_id), sql, re.IGNORECASE):
            return sql

        # Use priority order: prefer tables that have store_id directly
        _STORE_FILTER_PRIORITY = ["orders", "products", "reviews", "order_items"]
        tables_used = [t for t in _STORE_FILTER_PRIORITY if re.search(r'\b' + t + r'\b', sql, re.IGNORECASE)]
        if not tables_used:
            return sql

        for table in tables_used:
            # Reviews don't have store_id directly; filter via product_id JOIN
            if table == "reviews":
                sql = _add_where_clause(
                    sql,
                    f"product_id IN (SELECT id FROM products WHERE store_id = {filter_val})"
                )
                break
            # order_items don't have store_id; filter via order_id → orders
            if table == "order_items":
                sql = _add_where_clause(
                    sql,
                    f"order_id IN (SELECT id FROM orders WHERE store_id = {filter_val})"
                )
                break
            # orders and products HAVE store_id — apply directly
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


def _build_category_sales_timeframe_sql(question: str, role: str, user_id: int, store_id: int):
    """Return deterministic SQL for category sales queries with explicit time windows.

    This avoids LLM drift on questions like "sales by category last month",
    where missing the orders join or order_date filter silently turns the
    answer into an all-time total instead of the requested period.
    """
    q = question.lower()
    if not any(word in q for word in ["sales", "revenue"]):
        return None
    if "categor" not in q:
        return None

    timeframe_clause = None
    if "last month" in q or "previous month" in q:
        timeframe_clause = (
            "o.order_date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') "
            "AND o.order_date < DATE_TRUNC('month', CURRENT_DATE)"
        )
    elif "this month" in q:
        timeframe_clause = "o.order_date >= DATE_TRUNC('month', CURRENT_DATE)"
    elif "this year" in q:
        timeframe_clause = "o.order_date >= DATE_TRUNC('year', CURRENT_DATE)"
    elif "last year" in q or "previous year" in q:
        timeframe_clause = (
            "o.order_date >= DATE_TRUNC('year', CURRENT_DATE - INTERVAL '1 year') "
            "AND o.order_date < DATE_TRUNC('year', CURRENT_DATE)"
        )

    if not timeframe_clause:
        return None

    where_clauses = [
        "o.status != 'CANCELLED'",
        timeframe_clause,
    ]

    if role == "CORPORATE" and store_id:
        where_clauses.append(f"p.store_id = {store_id}")
    elif role == "INDIVIDUAL" and user_id:
        where_clauses.append(f"o.user_id = {user_id}")

    where_sql = " AND ".join(where_clauses)

    return (
        "SELECT c.name AS category_name, "
        "ROUND(SUM(oi.quantity * oi.price), 2) AS total_sales "
        "FROM orders o "
        "JOIN order_items oi ON o.id = oi.order_id "
        "JOIN products p ON oi.product_id = p.id "
        "JOIN categories c ON p.category_id = c.id "
        f"WHERE {where_sql} "
        "GROUP BY c.id, c.name "
        "ORDER BY total_sales DESC"
    )


def _build_personal_spending_sql(question: str, role: str, user_id: int, store_id: int):
    """Return deterministic SQL for individual spending totals."""
    if role != "INDIVIDUAL" or not user_id:
        return None

    q = question.lower()
    if not any(word in q for word in ["spent", "spend", "spending"]):
        return None
    if not _is_personal_query(question):
        return None

    where_clauses = [
        f"o.user_id = {user_id}",
        "o.status != 'CANCELLED'",
    ]

    if "this year" in q:
        where_clauses.append("o.order_date >= DATE_TRUNC('year', CURRENT_DATE)")
    elif "last year" in q or "previous year" in q:
        where_clauses.append(
            "o.order_date >= DATE_TRUNC('year', CURRENT_DATE - INTERVAL '1 year') "
            "AND o.order_date < DATE_TRUNC('year', CURRENT_DATE)"
        )
    elif "this month" in q:
        where_clauses.append("o.order_date >= DATE_TRUNC('month', CURRENT_DATE)")
    elif "last month" in q or "previous month" in q:
        where_clauses.append(
            "o.order_date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') "
            "AND o.order_date < DATE_TRUNC('month', CURRENT_DATE)"
        )
    elif "this week" in q:
        where_clauses.append("o.order_date >= DATE_TRUNC('week', CURRENT_DATE)")
    elif "today" in q:
        where_clauses.append("o.order_date >= DATE_TRUNC('day', CURRENT_DATE)")

    where_sql = " AND ".join(where_clauses)

    return (
        "SELECT ROUND(COALESCE(SUM(o.grand_total), 0), 2) AS total_spent, "
        "COUNT(o.id) AS order_count "
        "FROM orders o "
        f"WHERE {where_sql}"
    )


def _build_month_over_month_comparison_sql(question: str, role: str, user_id: int, store_id: int):
    """Return deterministic SQL for month-over-month comparison questions."""
    q = question.lower()
    if "compare" not in q and " vs " not in q:
        return None
    if "month" not in q:
        return None
    if "this month" not in q or "last month" not in q:
        return None

    filters = ["o.status != 'CANCELLED'"]
    if role == "CORPORATE" and store_id:
        filters.append(f"o.store_id = {store_id}")
    elif role == "INDIVIDUAL" and user_id and _is_personal_query(question):
        filters.append(f"o.user_id = {user_id}")

    filter_sql = " AND ".join(filters)

    return (
        "SELECT p.period AS period, "
        "COUNT(o.id) AS order_count, "
        "ROUND(COALESCE(SUM(o.grand_total), 0), 2) AS total_revenue "
        "FROM (VALUES "
        "('Last Month', DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month'), DATE_TRUNC('month', CURRENT_DATE), 1), "
        "('This Month', DATE_TRUNC('month', CURRENT_DATE), DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month'), 2)"
        ") AS p(period, start_date, end_date, sort_order) "
        "LEFT JOIN orders o "
        "ON o.order_date >= p.start_date "
        "AND o.order_date < p.end_date "
        f"AND {filter_sql} "
        "GROUP BY p.period, p.sort_order "
        "ORDER BY p.sort_order"
    )


def _build_revenue_by_month_sql(question: str, role: str, user_id: int, store_id: int):
    """Return deterministic monthly revenue trend SQL with role scoping."""
    q = question.lower()
    if "month" not in q and "monthly" not in q:
        return None
    if not any(word in q for word in ["revenue", "sales", "income", "spend", "spent"]):
        return None

    filters = ["o.status != 'CANCELLED'"]
    if role == "CORPORATE" and store_id:
        filters.append(f"o.store_id = {store_id}")
    elif role == "INDIVIDUAL" and user_id:
        if not _is_personal_query(question):
            return None
        filters.append(f"o.user_id = {user_id}")

    filter_sql = " AND ".join(filters)

    return (
        "SELECT DATE_TRUNC('month', o.order_date) AS month, "
        "COUNT(o.id) AS order_count, "
        "ROUND(SUM(o.grand_total), 2) AS total_revenue "
        "FROM orders o "
        f"WHERE {filter_sql} "
        "GROUP BY DATE_TRUNC('month', o.order_date) "
        "ORDER BY month"
    )


def _build_shipped_by_air_sql(question: str, role: str, user_id: int, store_id: int):
    """Return deterministic SQL for 'how many orders were shipped by air' style questions."""
    q = question.lower()
    if "shipped" not in q and "shipping" not in q:
        return None
    if "air" not in q and "flight" not in q:
        return None

    where_clauses = ["o.status != 'CANCELLED'"]
    if role == "CORPORATE" and store_id:
        where_clauses.append(f"o.store_id = {store_id}")
    elif role == "INDIVIDUAL" and user_id and _is_personal_query(question):
        where_clauses.append(f"o.user_id = {user_id}")

    where_sql = " AND ".join(where_clauses)

    return (
        "SELECT 'Air' AS shipment_mode, "
        "COUNT(DISTINCT CASE WHEN UPPER(COALESCE(s.mode, '')) = 'FLIGHT' THEN o.id END) AS air_order_count "
        "FROM orders o "
        "LEFT JOIN shipments s ON o.id = s.order_id "
        f"WHERE {where_sql}"
    )


def _build_order_listing_sql(question: str, role: str, user_id: int, store_id: int):
    """Return deterministic SQL for order listing/filtering queries.
    
    Handles:
      - "show my last 5 orders"
      - "show 5 cancelled orders"
      - "list all pending orders"
      - "how many delivered orders"
      - "show orders this month"
      - "show my orders by order id"
      - "list returned orders"
    """
    q = question.lower()
    if "order" not in q:
        return None

    # Must be a listing/show/count request
    listing_triggers = [
        "show", "list", "display", "get", "give", "last", "recent",
        "latest", "newest", "how many", "count", "all",
    ]
    if not any(kw in q for kw in listing_triggers):
        return None

    # Avoid matching aggregate/revenue queries that happen to mention 'orders'
    aggregate_signals = ["revenue", "sales total", "total sales", "average", "top customer",
                         "by category", "per category", "by store", "compare"]
    if any(sig in q for sig in aggregate_signals):
        return None

    # ── Status filter ──
    _STATUS_MAP = {
        "cancelled": "CANCELLED", "canceled": "CANCELLED",
        "pending": "PENDING",
        "confirmed": "CONFIRMED",
        "shipped": "SHIPPED",
        "delivered": "DELIVERED",
        "returned": "RETURNED",
        "out for delivery": "OUT_FOR_DELIVERY",
    }
    status_filter = None
    for keyword, status_val in _STATUS_MAP.items():
        if keyword in q:
            status_filter = status_val
            break

    # ── Count vs listing ──
    is_count = any(kw in q for kw in ["how many", "count", "number of", "total number"])
    wants_delivery_status = any(
        phrase in q
        for phrase in ["delivery status", "shipment status", "shipping status", "delivery", "shipment"]
    )

    # ── Extract LIMIT number ──
    import re as _re
    # Pattern 1: "last 5 orders", "show 10 orders"
    n_match = _re.search(r'(?:last|recent|latest|newest|show|list|get|display)\s+(\d+)', q)
    # Pattern 2: "list the 5 most recent", "show the 5 latest"
    if not n_match:
        n_match = _re.search(r'(?:last|recent|latest|newest|show|list|get|display)\s+\w+\s+(\d+)', q)
    # Pattern 3: "5 cancelled orders", "3 pending orders"
    if not n_match:
        n_match = _re.search(r'(\d+)\s+(?:most\s+recent|order|cancelled|pending|confirmed|shipped|delivered|returned)', q)
    # Pattern 4: any standalone number in the question
    if not n_match:
        n_match = _re.search(r'\b(\d+)\b', q)
        # Only use if it's a reasonable limit (1-100)
        if n_match and not (1 <= int(n_match.group(1)) <= 100):
            n_match = None
    limit = int(n_match.group(1)) if n_match else (None if is_count or status_filter else 10)

    # ── Time filter ──
    time_clause = None
    if "this month" in q:
        time_clause = "o.order_date >= DATE_TRUNC('month', CURRENT_DATE)"
    elif "last month" in q or "previous month" in q:
        time_clause = ("o.order_date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') "
                       "AND o.order_date < DATE_TRUNC('month', CURRENT_DATE)")
    elif "this week" in q:
        time_clause = "o.order_date >= DATE_TRUNC('week', CURRENT_DATE)"
    elif "today" in q:
        time_clause = "o.order_date >= DATE_TRUNC('day', CURRENT_DATE)"
    elif "this year" in q:
        time_clause = "o.order_date >= DATE_TRUNC('year', CURRENT_DATE)"

    # ── Build WHERE ──
    where_clauses = []
    if role == "CORPORATE" and store_id:
        where_clauses.append(f"o.store_id = {store_id}")
    elif role == "INDIVIDUAL" and user_id:
        where_clauses.append(f"o.user_id = {user_id}")
    if status_filter:
        where_clauses.append(f"o.status = '{status_filter}'")
    if time_clause:
        where_clauses.append(time_clause)

    where_sql = "WHERE " + " AND ".join(where_clauses) if where_clauses else ""

    # ── Count query ──
    if is_count:
        return (
            f"SELECT COUNT(*) AS order_count "
            f"FROM orders o "
            f"{where_sql}"
        )

    # ── Listing query — always include order_id ──
    limit_sql = f"LIMIT {limit}" if limit else "LIMIT 50"
    if wants_delivery_status:
        return (
            "SELECT o.id AS order_id, o.order_date, o.status AS order_status, "
            "COALESCE(s.status, 'NOT_SHIPPED') AS delivery_status, "
            "s.tracking_number, s.carrier, s.estimated_arrival, "
            "o.grand_total, o.payment_method "
            "FROM orders o "
            "LEFT JOIN shipments s ON o.id = s.order_id "
            f"{where_sql} "
            f"ORDER BY o.order_date DESC {limit_sql}"
        )

    return (
        "SELECT o.id AS order_id, o.order_date, o.status, "
        "o.grand_total, o.payment_method "
        "FROM orders o "
        f"{where_sql} "
        f"ORDER BY o.order_date DESC {limit_sql}"
    )


def _shipment_timeframe_clause(question: str) -> Optional[str]:
    """Return a shipped_date timeframe clause for shipment-focused questions."""
    q = question.lower()

    if "this week" in q:
        return (
            "s.shipped_date >= DATE_TRUNC('week', CURRENT_DATE) "
            "AND s.shipped_date < DATE_TRUNC('week', CURRENT_DATE + INTERVAL '1 week')"
        )
    if "last week" in q or "previous week" in q:
        return (
            "s.shipped_date >= DATE_TRUNC('week', CURRENT_DATE - INTERVAL '1 week') "
            "AND s.shipped_date < DATE_TRUNC('week', CURRENT_DATE)"
        )
    if "this month" in q:
        return (
            "s.shipped_date >= DATE_TRUNC('month', CURRENT_DATE) "
            "AND s.shipped_date < DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month')"
        )
    if "last month" in q or "previous month" in q:
        return (
            "s.shipped_date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') "
            "AND s.shipped_date < DATE_TRUNC('month', CURRENT_DATE)"
        )
    if "today" in q:
        return (
            "s.shipped_date >= DATE_TRUNC('day', CURRENT_DATE) "
            "AND s.shipped_date < DATE_TRUNC('day', CURRENT_DATE + INTERVAL '1 day')"
        )

    return None


def _build_shipment_status_timeframe_sql(question: str, role: str, user_id: int, store_id: int):
    """Return deterministic SQL for shipment-status questions with an explicit timeframe."""
    q = question.lower()
    if not any(word in q for word in ["shipment", "shipments", "shipping", "delivery", "deliveries"]):
        return None
    if not any(word in q for word in ["status", "statuses", "breakdown", "state"]):
        return None

    timeframe_clause = _shipment_timeframe_clause(question)
    if not timeframe_clause:
        return None

    where_clauses = [
        "o.status != 'CANCELLED'",
        timeframe_clause,
    ]

    if role == "CORPORATE" and store_id:
        where_clauses.append(f"o.store_id = {store_id}")
    elif role == "INDIVIDUAL" and user_id and _is_personal_query(question):
        where_clauses.append(f"o.user_id = {user_id}")

    where_sql = " AND ".join(where_clauses)

    return (
        "SELECT COALESCE(s.status, 'No Shipment Status') AS shipment_status, "
        "COUNT(*) AS shipment_count "
        "FROM shipments s "
        "JOIN orders o ON o.id = s.order_id "
        f"WHERE {where_sql} "
        "GROUP BY COALESCE(s.status, 'No Shipment Status') "
        "ORDER BY shipment_count DESC, shipment_status ASC"
    )


def _build_most_reviewed_product_sql(question: str, role: str, user_id: int, store_id: int):
    """Return deterministic SQL for the demo-critical most-reviewed product query."""
    q = question.lower()
    asks_reviews = (
        ("most" in q and "review" in q)
        or ("top" in q and "review" in q)
        or (("en fazla" in q or "en çok" in q or "en cok" in q) and "yorum" in q)
    )
    asks_product = any(term in q for term in ["product", "products", "ürün", "urun"])
    if not (asks_reviews and asks_product):
        return None

    where_clauses = []
    if role == "CORPORATE" and store_id:
        where_clauses.append(f"p.store_id = {store_id}")

    where_sql = f"WHERE {' AND '.join(where_clauses)} " if where_clauses else ""
    return (
        "SELECT p.name AS product_name, COUNT(r.id) AS review_count, "
        "ROUND(AVG(r.star_rating), 2) AS average_rating "
        "FROM reviews r "
        "JOIN products p ON r.product_id = p.id "
        f"{where_sql}"
        "GROUP BY p.id, p.name "
        "ORDER BY review_count DESC, average_rating DESC "
        "LIMIT 1"
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

    # Early detection: CORPORATE user asking INDIVIDUAL-only questions
    if role == "CORPORATE" and _is_personal_query(state["question"]):
        q = state["question"].lower()
        # These are order/purchase questions that only make sense for INDIVIDUAL users
        personal_order_keywords = ['my order', 'my purchase', 'i bought', 'i ordered',
                                   'my spending', 'have i spent', 'i buy', 'my delivery',
                                   'my shipment', 'my review', 'did i']
        if any(k in q for k in personal_order_keywords):
            return {
                "sql_query": None,
                "error": None,
                "final_answer": (
                    "As a **corporate** user, you don't have personal orders or purchases. "
                    "Your account is linked to your store.\n\n"
                    "Here are some things you can ask instead:\n"
                    "- 📊 *\"What are my store's total sales?\"*\n"
                    "- 👥 *\"Who are my top customers?\"*\n"
                    "- 📦 *\"Show my store's order history\"*\n"
                    "- ⭐ *\"What's the average rating of my products?\"*\n"
                    "- 📈 *\"What's the revenue trend for my store?\"*"
                )
            }

    role_context = ROLE_CONTEXTS.get(role, ROLE_CONTEXTS["ADMIN"])

    if role == "CORPORATE" and state.get("store_id"):
        role_context = role_context.format(store_id=state["store_id"])
    elif role == "INDIVIDUAL":
        role_context = role_context.format(user_id=state["user_id"])

    # Deterministic SQL for common complex queries (LLM truncates these multi-JOIN queries)
    q_lower = state["question"].lower()
    user_id = state.get("user_id", 0)
    store_id = state.get("store_id")

    deterministic_category_sales_sql = _build_category_sales_timeframe_sql(
        state["question"], role, user_id, store_id
    )
    if deterministic_category_sales_sql:
        return {"sql_query": deterministic_category_sales_sql, "error": None}

    deterministic_personal_spending_sql = _build_personal_spending_sql(
        state["question"], role, user_id, store_id
    )
    if deterministic_personal_spending_sql:
        return {"sql_query": deterministic_personal_spending_sql, "error": None}

    deterministic_month_compare_sql = _build_month_over_month_comparison_sql(
        state["question"], role, user_id, store_id
    )
    if deterministic_month_compare_sql:
        return {"sql_query": deterministic_month_compare_sql, "error": None}

    deterministic_revenue_by_month_sql = _build_revenue_by_month_sql(
        state["question"], role, user_id, store_id
    )
    if deterministic_revenue_by_month_sql:
        return {"sql_query": deterministic_revenue_by_month_sql, "error": None}

    deterministic_shipment_status_sql = _build_shipment_status_timeframe_sql(
        state["question"], role, user_id, store_id
    )
    if deterministic_shipment_status_sql:
        return {"sql_query": deterministic_shipment_status_sql, "error": None}

    deterministic_air_shipments_sql = _build_shipped_by_air_sql(
        state["question"], role, user_id, store_id
    )
    if deterministic_air_shipments_sql:
        return {"sql_query": deterministic_air_shipments_sql, "error": None}

    deterministic_most_reviewed_sql = _build_most_reviewed_product_sql(
        state["question"], role, user_id, store_id
    )
    if deterministic_most_reviewed_sql:
        return {"sql_query": deterministic_most_reviewed_sql, "error": None}

    deterministic_order_listing_sql = _build_order_listing_sql(
        state["question"], role, user_id, store_id
    )
    if deterministic_order_listing_sql:
        return {"sql_query": deterministic_order_listing_sql, "error": None}

    if role == "INDIVIDUAL" and user_id:
        # "average ratings of products I bought"
        if any(k in q_lower for k in ['rating', 'rated', 'review']) and any(k in q_lower for k in ['i bought', 'i buy', 'my product', 'products i', 'i purchased']):
            sql = (
                f"SELECT p.name AS product_name, ROUND(AVG(r.star_rating), 2) AS average_rating "
                f"FROM orders o "
                f"JOIN order_items oi ON o.id = oi.order_id "
                f"JOIN products p ON oi.product_id = p.id "
                f"JOIN reviews r ON p.id = r.product_id "
                f"WHERE o.user_id = {user_id} "
                f"GROUP BY p.id, p.name "
                f"ORDER BY average_rating DESC"
            )
            return {"sql_query": sql, "error": None}

        # "what categories do I buy from the most"
        if any(k in q_lower for k in ['categor']) and any(k in q_lower for k in ['i buy', 'i bought', 'most', 'my']):
            sql = (
                f"SELECT c.name AS category_name, COUNT(DISTINCT oi.id) AS purchase_count "
                f"FROM orders o "
                f"JOIN order_items oi ON o.id = oi.order_id "
                f"JOIN products p ON oi.product_id = p.id "
                f"JOIN categories c ON p.category_id = c.id "
                f"WHERE o.user_id = {user_id} "
                f"GROUP BY c.id, c.name "
                f"ORDER BY purchase_count DESC"
            )
            return {"sql_query": sql, "error": None}

        # INDIVIDUAL guardrail: corporate/admin-only questions
        corporate_keywords = ['revenue', 'store sales', 'total sales', 'weekly revenue',
                              'monthly revenue', 'top customer', 'my customer',
                              'customer ranking', 'store performance', 'store report',
                              'profit', 'all users', 'all orders', 'platform revenue']
        if any(k in q_lower for k in corporate_keywords) and not any(k in q_lower for k in ['i spent', 'my order', 'i paid', 'my spend']):
            return {
                "sql_query": None,
                "error": None,
                "final_answer": (
                    "As an **individual** user, you don't have access to store revenue, sales reports, or customer data. "
                    "Those are available to **corporate** and **admin** users.\n\n"
                    "Here are some things you can ask instead:\n"
                    "- 🛒 *\"How much have I spent this year?\"*\n"
                    "- 📦 *\"Show my order history with delivery status\"*\n"
                    "- ⭐ *\"What are the average ratings of products I bought?\"*\n"
                    "- 📂 *\"What categories do I buy from the most?\"*"
                )
            }

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

        # Detect if this is actually a follow-up or a completely new question
        q_lower = state["question"].lower().strip()

        # If the question has a clear subject noun, it's likely independent
        has_clear_subject = any(w in q_lower for w in [
            'product', 'order', 'store', 'customer', 'category', 'user',
            'review', 'shipment', 'rating', 'item', 'revenue', 'sale'
        ])

        followup_indicators = [
            r'\b(which one|which of)\b', r'\b(that|those|these|it|them)\b',
            r'\b(the same|same thing)\b', r'\b(more detail|more info|expand)\b',
            r'\b(second|third|2nd|3rd)\b',
            r'\b(why|how come)\b', r'\b(what about)\b', r'\b(compare)\b',
            r'\b(and |also |too )\b',
        ]
        # Superlatives are follow-ups ONLY when there's no clear subject
        if not has_clear_subject:
            followup_indicators.append(r'\b(highest|lowest|most|least)\b')

        is_followup = any(re.search(p, q_lower) for p in followup_indicators)
        # Short questions (< 5 words) with no clear subject are likely follow-ups
        if len(q_lower.split()) <= 4 and not any(w in q_lower for w in ['show', 'list', 'what', 'who', 'how much']):
            is_followup = True

        # Try deterministic follow-up first (bypass LLM for common patterns)
        if is_followup:
            det_sql = _try_deterministic_followup(state["question"], last_sql, last_columns)
            if det_sql:
                det_sql = _inject_role_filter(det_sql, role, state.get("user_id", 0), state.get("store_id"), question=state["question"])
                return {"sql_query": det_sql, "error": None}

        # Only inject conversation context for actual follow-up questions
        if is_followup and last_sql:
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
        question=question,
        current_date=datetime.date.today().isoformat()
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

    # Detect truncated SQL (LLM output cut off mid-query)
    sql_trimmed = sql.rstrip().rstrip(';')
    _TRUNCATION_SIGNS = (
        sql_trimmed.endswith(' AS'),
        sql_trimmed.endswith(','),
        sql_trimmed.endswith('('),
        sql_trimmed.endswith(' ON'),
        sql_trimmed.endswith(' AND'),
        sql_trimmed.endswith(' OR'),
        sql_trimmed.endswith(' WHERE'),
        sql_trimmed.endswith(' FROM'),
        sql_trimmed.endswith(' JOIN'),
        sql_trimmed.count('(') > sql_trimmed.count(')'),
    )
    if any(_TRUNCATION_SIGNS):
        print(f"[SQL Generator] Truncated SQL detected, using fallback")
        from llm import _generate_fallback_sql
        sql = _generate_fallback_sql(prompt)

    # Security: block UNION/INTERSECT/EXCEPT to prevent cross-table data exfiltration
    _BANNED_SET_OPS = re.compile(r'\b(UNION\s+(ALL\s+)?SELECT|INTERSECT\s+(ALL\s+)?SELECT|EXCEPT\s+(ALL\s+)?SELECT)\b', re.IGNORECASE)
    if _BANNED_SET_OPS.search(sql):
        return {"sql_query": None, "error": "UNION/INTERSECT/EXCEPT queries are not allowed."}

    # Security: block multi-statement SQL (semicolons)
    if ";" in sql.strip().rstrip(";"):
        return {"sql_query": None, "error": "Multi-statement queries are not allowed."}

    # Security: block system catalog / schema introspection (AV-12 fix)
    if re.search(r'\b(information_schema|pg_catalog|pg_stat|pg_class|pg_namespace|pg_attribute|'
                 r'pg_tables|pg_columns|pg_views|pg_indexes|pg_roles|pg_user|pg_shadow|pg_auth_members)\b', sql, re.IGNORECASE):
        return {"sql_query": None, "error": "I cannot access database system tables. Ask me about your orders, products, or reviews instead!"}

    # Fix: force LEFT JOIN on shipments (LLMs often use INNER JOIN despite prompt instructions)
    sql = re.sub(r'\bJOIN\s+shipments\b', 'LEFT JOIN shipments', sql, flags=re.IGNORECASE)
    # Avoid double LEFT LEFT JOIN
    sql = re.sub(r'\bLEFT\s+LEFT\s+JOIN\b', 'LEFT JOIN', sql, flags=re.IGNORECASE)

    # Security: block platform-wide revenue/sales aggregations for INDIVIDUAL users
    # BUT allow personal spending queries (SUM with user_id filter)
    if role == "INDIVIDUAL":
        revenue_patterns = re.compile(
            r'\bSUM\s*\(\s*(grand_total|price\s*\*|oi\.price|order_items\.price)',
            re.IGNORECASE
        )
        user_id = state.get("user_id", 0)
        has_user_filter = bool(re.search(r'\buser_id\s*=\s*' + str(user_id), sql, re.IGNORECASE))
        is_personal = _is_personal_query(state["question"])
        if revenue_patterns.search(sql) and not has_user_filter and not is_personal:
            return {"sql_query": None, "error": "Revenue data is not available for individual users. Try asking about product ratings or your order history instead."}

    # Enforce role-based data isolation
    sql = _inject_role_filter(sql, role, state.get("user_id", 0), state.get("store_id"), question=state["question"])

    return {"sql_query": sql, "error": None}
