"""Tests for Visualization Agent (5.3: Visualization Specialist role).

Covers: AST safety, Plotly code generation, NO_VIZ skip path, fallback chart.
"""
from agents import visualizer


def _state(rows, columns, question="Revenue by category"):
    return {
        "question": question,
        "user_role": "ADMIN",
        "user_id": 1,
        "store_id": None,
        "query_result": {
            "rows": rows,
            "columns": columns,
            "row_count": len(rows),
        },
    }


def test_ast_validator_rejects_import_statements():
    assert visualizer._validate_code_ast("import os\nfig = None") is False


def test_ast_validator_rejects_dunder_access():
    assert visualizer._validate_code_ast("x = ().__class__") is False


def test_ast_validator_accepts_safe_plotly_code():
    code = (
        "fig = go.Figure(data=[go.Bar(x=['A','B'], y=[1,2])])\n"
        "fig.update_layout(title='t')"
    )
    assert visualizer._validate_code_ast(code) is True


def test_visualizer_skips_when_single_row(monkeypatch):
    monkeypatch.setattr(visualizer, "call_llm", lambda *a, **k: "NO_VIZ")
    result = visualizer.visualization_agent(_state([{"total": 100}], ["total"]))
    assert result["visualization_code"] is None
    assert result["visualization_html"] is None


def test_visualizer_skips_when_too_many_rows(monkeypatch):
    rows = [{"x": i, "y": i * 2} for i in range(60)]
    result = visualizer.visualization_agent(_state(rows, ["x", "y"]))
    assert result["visualization_code"] is None
    assert result["visualization_html"] is None


def test_visualizer_generates_plotly_html_for_bar_data(monkeypatch):
    """LLM returns valid Plotly code → visualizer produces HTML."""
    code = (
        "fig = go.Figure(data=[go.Bar(x=['A','B','C'], y=[10,20,30])])\n"
        "fig.update_layout(title='Test')"
    )
    monkeypatch.setattr(visualizer, "call_llm", lambda *a, **k: code)
    rows = [{"cat": "A", "val": 10}, {"cat": "B", "val": 20}, {"cat": "C", "val": 30}]
    result = visualizer.visualization_agent(_state(rows, ["cat", "val"]))
    assert result["visualization_html"] is not None
    assert "plotly" in result["visualization_html"].lower()


def test_visualizer_falls_back_when_llm_says_no_viz_but_data_is_chartable(monkeypatch):
    monkeypatch.setattr(visualizer, "call_llm", lambda *a, **k: "NO_VIZ")
    rows = [{"cat": "A", "val": 10}, {"cat": "B", "val": 20}]
    result = visualizer.visualization_agent(_state(rows, ["cat", "val"]))
    # Fallback chart should engage when there are 2+ rows and 2+ columns.
    assert result["visualization_html"] is not None
    assert result["visualization_code"] == "fallback"


def test_visualizer_fallback_chart_builder_returns_figure():
    rows = [{"cat": "A", "val": 10}, {"cat": "B", "val": 20}]
    fig = visualizer._build_fallback_chart(rows, ["cat", "val"], "Show vals")
    assert fig is not None


def test_visualizer_detects_chart_types():
    import pandas as pd

    df = pd.DataFrame([{"x": 1, "y": 2}])
    assert visualizer._detect_chart_type(df, ["x", "y"], "monthly trend") == "line"
    assert visualizer._detect_chart_type(df, ["x", "y"], "revenue distribution") == "pie"
    assert visualizer._detect_chart_type(df, ["x", "y"], "compare A vs B") == "grouped_bar"
    assert visualizer._detect_chart_type(df, ["x", "y"], "top products") == "bar"
