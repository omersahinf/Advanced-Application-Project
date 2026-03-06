"""Error Handler Agent - diagnoses SQL errors and attempts to fix them."""
from state import AgentState
from prompts import ERROR_HANDLER_PROMPT
from database import DB_SCHEMA_DESCRIPTION
from llm import call_llm


def error_handler_agent(state: AgentState) -> dict:
    prompt = ERROR_HANDLER_PROMPT.format(
        sql_query=state.get("sql_query", ""),
        error=state.get("error", ""),
        schema=DB_SCHEMA_DESCRIPTION,
    )

    fixed_sql = call_llm(prompt, max_tokens=500).strip()

    if fixed_sql.startswith("```"):
        lines = fixed_sql.split("\n")
        fixed_sql = "\n".join(l for l in lines if not l.startswith("```"))
        fixed_sql = fixed_sql.strip()

    return {"sql_query": fixed_sql, "error": None}
