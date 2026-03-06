"""SQL Generator Agent - converts natural language to SQL with role-based scoping."""
from state import AgentState
from prompts import SQL_GENERATOR_PROMPT, ROLE_CONTEXTS
from database import DB_SCHEMA_DESCRIPTION
from llm import call_llm


def sql_generator_agent(state: AgentState) -> dict:
    role = state["user_role"]
    role_context = ROLE_CONTEXTS.get(role, ROLE_CONTEXTS["ADMIN"])

    if role == "CORPORATE" and state.get("store_id"):
        role_context = role_context.format(store_id=state["store_id"])
    elif role == "INDIVIDUAL":
        role_context = role_context.format(user_id=state["user_id"])

    prompt = SQL_GENERATOR_PROMPT.format(
        schema=DB_SCHEMA_DESCRIPTION,
        role_context=role_context,
        question=state["question"]
    )

    sql = call_llm(prompt, max_tokens=500)
    sql = sql.strip()

    # Clean up: remove markdown code blocks if present
    if sql.startswith("```"):
        lines = sql.split("\n")
        sql = "\n".join(l for l in lines if not l.startswith("```"))
        sql = sql.strip()

    # Security: reject non-SELECT queries
    first_word = sql.split()[0].upper() if sql.split() else ""
    if first_word not in ("SELECT", "WITH"):
        return {"sql_query": None, "error": "Only SELECT queries are allowed."}

    return {"sql_query": sql, "error": None}
