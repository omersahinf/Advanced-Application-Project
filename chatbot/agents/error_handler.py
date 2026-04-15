"""Error Handler Agent - diagnoses SQL errors and attempts to fix them."""
from state import AgentState
from prompts import AGENT_CONFIGS, ERROR_HANDLER_PROMPT
from database import DB_SCHEMA_DESCRIPTION
from llm import call_llm
from agents.sql_generator import _inject_role_filter


def error_handler_agent(state: AgentState) -> dict:
    prompt = ERROR_HANDLER_PROMPT.format(
        sql_query=state.get("sql_query", ""),
        error=state.get("error", ""),
        schema=DB_SCHEMA_DESCRIPTION,
    )

    fixed_sql = call_llm(prompt, max_tokens=1024, system_prompt=AGENT_CONFIGS["error_agent"]["system_prompt"]).strip()

    if fixed_sql.startswith("```"):
        lines = fixed_sql.split("\n")
        fixed_sql = "\n".join(l for l in lines if not l.startswith("```"))
        fixed_sql = fixed_sql.strip()

    # Re-enforce role-based filtering on the fixed SQL
    fixed_sql = _inject_role_filter(
        fixed_sql, state.get("user_role", "ADMIN"),
        state.get("user_id", 0), state.get("store_id")
    )

    return {"sql_query": fixed_sql, "error": None}
