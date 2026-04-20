"""Tests for Visualization Agent (5.3: Visualization Specialist role).

Covers: AST safety, Plotly code generation, NO_VIZ skip path, fallback chart.
"""
import llm as llm_module
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


def test_fallback_chart_prefers_total_sales_over_order_count_for_category_sales():
    rows = [
        {"category": "Phones & Tablets", "total_sales": 274.89, "order_count": 9},
        {"category": "Computers & Accessories", "total_sales": 2734.59, "order_count": 12},
    ]

    fig = visualizer._build_fallback_chart(
        rows,
        ["category", "total_sales", "order_count"],
        "Show me sales by category for last month",
    )

    assert fig is not None
    assert list(fig.data[0].y) == [2734.59, 274.89]
    assert fig.layout.yaxis.title.text == "Total Sales"


def test_visualizer_uses_smart_fallback_for_category_sales_breakdown(monkeypatch):
    monkeypatch.setattr(visualizer, "call_llm", lambda *a, **k: "fig = None")
    rows = [
        {"category": "Computers & Accessories", "total_sales": 2734.59, "order_count": 12},
        {"category": "Phones & Tablets", "total_sales": 274.89, "order_count": 9},
    ]

    result = visualizer.visualization_agent(
        _state(
            rows,
            ["category", "total_sales", "order_count"],
            question="Show me sales by category for last month",
        )
    )

    assert result["visualization_code"] == "smart_fallback"
    assert result["visualization_html"] is not None


def test_rule_based_fallback_viz_uses_total_sales_metric():
    prompt = (
        "Generate Plotly visualization code for these query results. "
        "Question: Show me sales by category for last month "
        "Results (2 rows, columns: ['category', 'total_sales', 'order_count']): "
        "[{\"category\": \"Computers\", \"total_sales\": 2734.59, \"order_count\": 12}, "
        "{\"category\": \"Phones\", \"total_sales\": 274.89, \"order_count\": 9}]"
    )

    code = llm_module._generate_fallback_viz(prompt)

    assert "2734.59" in code
    assert "274.89" in code
    assert "yaxis_title='total_sales'" in code


def test_compare_chart_uses_dual_axis_for_revenue_and_order_count():
    rows = [
        {"period": "Last Month", "order_count": 12, "total_revenue": 980.50},
        {"period": "This Month", "order_count": 18, "total_revenue": 1420.75},
    ]

    fig = visualizer._build_fallback_chart(
        rows,
        ["period", "order_count", "total_revenue"],
        "Compare this month vs last month",
    )

    assert fig is not None
    assert len(fig.data) == 2
    assert fig.data[0].type == "bar"
    assert fig.data[1].type == "scatter"
    assert fig.layout.yaxis.title.text == "Total Revenue"
    assert fig.layout.yaxis2.title.text == "Order Count"


def test_single_row_label_metric_result_still_builds_chart():
    rows = [{"shipment_mode": "Air", "air_order_count": 6}]

    fig = visualizer._build_fallback_chart(
        rows,
        ["shipment_mode", "air_order_count"],
        "How many orders were shipped by air?",
    )

    assert fig is not None
    assert len(fig.data) == 1
    assert fig.data[0].type == "bar"
    assert list(fig.data[0].x) == ["Air"]
    assert list(fig.data[0].y) == [6.0]


def test_visualizer_allows_single_row_label_metric_chart(monkeypatch):
    monkeypatch.setattr(visualizer, "call_llm", lambda *a, **k: "NO_VIZ")
    rows = [{"shipment_mode": "Air", "air_order_count": 6}]

    result = visualizer.visualization_agent(
        _state(
            rows,
            ["shipment_mode", "air_order_count"],
            question="How many orders were shipped by air?",
        )
    )

    assert result["visualization_html"] is not None


def test_fallback_chart_relabels_missing_shipment_status():
    rows = [
        {"order_id": 101, "shipment_status": None},
        {"order_id": 102, "shipment_status": None},
        {"order_id": 103, "shipment_status": None},
        {"order_id": 104, "shipment_status": "SHIPPED"},
    ]

    fig = visualizer._build_fallback_chart(
        rows,
        ["order_id", "shipment_status"],
        "What is the status of shipments made this week?",
    )

    assert fig is not None
    assert list(fig.data[0].x) == ["No Shipment Yet", "SHIPPED"]
    assert list(fig.data[0].y) == [3, 1]


def test_visualizer_detects_chart_types():
    import pandas as pd

    df = pd.DataFrame([{"x": 1, "y": 2}])
    assert visualizer._detect_chart_type(df, ["x", "y"], "monthly trend") == "line"
    assert visualizer._detect_chart_type(df, ["x", "y"], "revenue distribution") == "pie"
    assert visualizer._detect_chart_type(df, ["x", "y"], "compare A vs B") == "grouped_bar"
    assert visualizer._detect_chart_type(df, ["x", "y"], "top products") == "bar"
