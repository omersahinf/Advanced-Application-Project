"""Visualization Agent - generates Plotly charts when beneficial."""
import ast
import json
import signal
import plotly
import plotly.graph_objects as go
import plotly.express as px
from state import AgentState
from prompts import VISUALIZATION_PROMPT
from llm import call_llm

# AST node types that are forbidden in generated visualization code
_FORBIDDEN_AST_NODES = (ast.Import, ast.ImportFrom, ast.Global, ast.Nonlocal)


def _validate_code_ast(code: str) -> bool:
    """Validate generated code via AST — reject imports and dangerous constructs."""
    try:
        tree = ast.parse(code)
    except SyntaxError:
        return False
    for node in ast.walk(tree):
        if isinstance(node, _FORBIDDEN_AST_NODES):
            return False
        # Block access to dunder attributes (__builtins__, __class__, __import__)
        if isinstance(node, ast.Attribute) and node.attr.startswith("__"):
            return False
    return True


def _build_fallback_chart(rows: list, columns: list, question: str):
    """Build a simple bar chart as fallback when LLM-generated code fails."""
    try:
        if len(columns) < 2:
            return None
        # Use first column as labels, second numeric column as values
        labels = [str(r.get(columns[0], "")) for r in rows[:15]]
        # Find first numeric column
        value_col = None
        for col in columns[1:]:
            try:
                float(rows[0].get(col, ""))
                value_col = col
                break
            except (ValueError, TypeError):
                continue
        if not value_col:
            return None
        values = [float(r.get(value_col, 0)) for r in rows[:15]]
        fig = go.Figure(data=[go.Bar(x=labels, y=values)])
        fig.update_layout(
            title=question[:60],
            xaxis_title=columns[0],
            yaxis_title=value_col,
            template="plotly_white"
        )
        return fig
    except Exception:
        return None


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
        # LLM said no viz, but if we have 2+ rows, generate fallback anyway
        fig = _build_fallback_chart(rows, columns, state["question"])
        if fig:
            try:
                html = fig.to_html(include_plotlyjs="cdn", full_html=False)
                return {"visualization_code": "fallback", "visualization_html": html}
            except Exception:
                pass
        return {"visualization_code": None, "visualization_html": None}

    # Clean markdown code blocks
    if code.startswith("```"):
        lines = code.split("\n")
        code = "\n".join(l for l in lines if not l.startswith("```"))
        code = code.strip()

    # Strip import statements — modules are already in exec_globals
    cleaned_lines = []
    for line in code.split("\n"):
        stripped = line.strip()
        if stripped.startswith("import ") or stripped.startswith("from "):
            continue
        cleaned_lines.append(line)
    code = "\n".join(cleaned_lines)

    # Provide plotly namespace with restricted builtins for security
    _SAFE_BUILTINS = {
        "len": len, "str": str, "float": float, "int": int, "bool": bool,
        "list": list, "dict": dict, "tuple": tuple, "set": set,
        "range": range, "round": round, "abs": abs, "sum": sum,
        "min": min, "max": max, "sorted": sorted, "reversed": reversed,
        "zip": zip, "enumerate": enumerate, "map": map, "filter": filter,
        "isinstance": isinstance, "type": type, "None": None,
        "True": True, "False": False, "print": lambda *a, **k: None,
    }
    exec_globals = {
        "__builtins__": _SAFE_BUILTINS,
        "plotly": plotly,
        "go": go,
        "px": px,
        "json": json,
    }

    fig = None
    try:
        # Validate code AST before execution
        if not _validate_code_ast(code):
            fig = _build_fallback_chart(rows, columns, state["question"])
        else:
            local_vars = {"rows": rows, "columns": columns}
            # Set timeout to prevent infinite loops (5 seconds)
            old_handler = signal.getsignal(signal.SIGALRM)
            signal.signal(signal.SIGALRM, lambda s, f: (_ for _ in ()).throw(TimeoutError()))
            signal.alarm(5)
            try:
                exec(code, exec_globals, local_vars)
                fig = local_vars.get("fig")
            finally:
                signal.alarm(0)
                signal.signal(signal.SIGALRM, old_handler)
    except (Exception, TimeoutError):
        # LLM code failed — try fallback chart
        fig = _build_fallback_chart(rows, columns, state["question"])

    if fig is None:
        fig = _build_fallback_chart(rows, columns, state["question"])

    if fig:
        try:
            html = fig.to_html(include_plotlyjs="cdn", full_html=False)
            return {"visualization_code": code, "visualization_html": html}
        except Exception:
            pass

    return {"visualization_code": code, "visualization_html": None}
