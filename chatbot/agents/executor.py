"""Query Executor Agent - safely executes SQL against the database."""
from state import AgentState
from database import execute_query


def executor_agent(state: AgentState) -> dict:
    sql = state.get("sql_query")
    if not sql:
        return {"error": "No SQL query to execute.", "query_result": None}

    try:
        result = execute_query(sql)
        return {"query_result": result, "error": None}
    except Exception as e:
        return {
            "query_result": None,
            "error": str(e),
            "iteration_count": state.get("iteration_count", 0) + 1,
        }
