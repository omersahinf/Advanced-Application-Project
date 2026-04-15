"""Query Executor Agent - safely executes SQL against the database."""
from state import AgentState
from database import execute_query


def executor_agent(state: AgentState) -> dict:
    sql = state.get("sql_query")
    if not sql:
        return {"error": "No SQL query to execute.", "query_result": None}

    try:
        result = execute_query(sql)

        # Check for validation errors returned inside the result dict
        # (e.g., forbidden keywords, sensitive columns, set operations)
        if result.get("error"):
            print(f"[Executor] Query validation error: {result['error']}")
            return {
                "query_result": None,
                "error": result["error"],
                "iteration_count": state.get("iteration_count", 0) + 1,
            }

        return {"query_result": result, "error": None}
    except Exception as e:
        print(f"[Executor] SQL execution exception: {e}")
        return {
            "query_result": None,
            "error": str(e),
            "iteration_count": state.get("iteration_count", 0) + 1,
        }
