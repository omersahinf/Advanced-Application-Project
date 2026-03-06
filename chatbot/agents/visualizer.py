"""Visualization Agent - generates Plotly charts when beneficial."""
import json
import plotly
from state import AgentState
from prompts import VISUALIZATION_PROMPT
from llm import call_llm


def visualization_agent(state: AgentState) -> dict:
    result = state.get("query_result", {})
    rows = result.get("rows", [])
    columns = result.get("columns", [])
    row_count = result.get("row_count", 0)

    if row_count <= 1 or row_count > 50:
        return {"visualization_code": None, "visualization_html": None}

    display_rows = rows[:20]
    results_str = json.dumps(display_rows, default=str)

    prompt = VISUALIZATION_PROMPT.format(
        question=state["question"],
        row_count=row_count,
        columns=columns,
        results=results_str,
    )

    code = call_llm(prompt, max_tokens=600).strip()

    if "NO_VIZ" in code:
        return {"visualization_code": None, "visualization_html": None}

    # Clean markdown
    if code.startswith("```"):
        lines = code.split("\n")
        code = "\n".join(l for l in lines if not l.startswith("```"))
        code = code.strip()

    try:
        local_vars = {"rows": rows, "columns": columns}
        exec(code, {"__builtins__": __builtins__, "plotly": plotly}, local_vars)
        fig = local_vars.get("fig")
        if fig:
            import plotly.graph_objects as go
            html = fig.to_html(include_plotlyjs="cdn", full_html=False)
            return {"visualization_code": code, "visualization_html": html}
    except Exception:
        pass

    return {"visualization_code": code, "visualization_html": None}
