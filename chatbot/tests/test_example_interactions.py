"""Scenario tests for PDF Section 5.7 — Example Interactions.

Each test asserts the chatbot's expected behavior for one of the six
documented example queries. LLM is disabled so the rule-based fallback
(llm._generate_fallback_sql) produces deterministic SQL.
"""
import graph
from agents import analyst, executor, guardrails, sql_generator, visualizer, error_handler
import llm as llm_module


def _disable_llm(monkeypatch):
    """Force fallback path by emptying the API key."""
    import config
    monkeypatch.setattr(config, "OPENAI_API_KEY", "")
    # Each agent module imports config at load — refresh the flag for analyst
    monkeypatch.setattr(analyst.config, "OPENAI_API_KEY", "")


def _patch_executor(monkeypatch, result):
    monkeypatch.setattr(executor, "execute_query", lambda sql: result)


def _run(question, monkeypatch, exec_result):
    _disable_llm(monkeypatch)
    _patch_executor(monkeypatch, exec_result)
    return graph.run_query(question, user_role="ADMIN", user_id=1)


# ---------- 5.7 Examples ----------


def test_example_1_sales_by_category_last_month(monkeypatch):
    """"Show me sales by category for last month" → bar chart w/ date filter."""
    sql = llm_module._generate_fallback_sql(
        "user question: Show me sales by category for last month"
    )
    assert "category" in sql.lower()
    assert "sum(oi.price * oi.quantity)" in sql.lower()
    assert "last_month" in sql.lower() or "interval '1 month'" in sql.lower()
    assert "group by" in sql.lower() and "order by" in sql.lower()


def test_example_2_top_5_customers_by_revenue(monkeypatch):
    """"What are my top 5 customers by revenue?" → ranked list."""
    sql = llm_module._generate_fallback_sql(
        "user question: What are the top 5 customers by revenue?"
    )
    assert "limit 5" in sql.lower()
    assert "order by total_revenue desc" in sql.lower()
    assert "customer" in sql.lower() or "user" in sql.lower()


def test_example_3_compare_this_month_vs_last_month(monkeypatch):
    """"Compare this month vs last month" → period-over-period metrics."""
    sql = llm_module._generate_fallback_sql(
        "user question: Compare this month vs last month"
    )
    assert "this_month" in sql.lower()
    assert "last_month" in sql.lower()
    assert "count(*)" in sql.lower()
    assert "sum(grand_total)" in sql.lower()


def test_example_4_lowest_rated_products(monkeypatch):
    """"Which products have the lowest ratings?" → sorted list by avg rating."""
    sql = llm_module._generate_fallback_sql(
        "user question: Which products have the lowest ratings?"
    )
    assert "avg(r.star_rating)" in sql.lower()
    assert "order by avg_rating asc" in sql.lower()
    assert "product" in sql.lower()


def test_example_5_cancellation_trend(monkeypatch):
    """"What's the trend in order cancellations?" → time series line chart."""
    sql = llm_module._generate_fallback_sql(
        "user question: What's the trend in order cancellations?"
    )
    assert "date_trunc('month'" in sql.lower()
    assert "cancelled" in sql.lower()
    assert "order by month" in sql.lower()

    # Time-series question → visualizer detects "line" chart type
    import pandas as pd
    df = pd.DataFrame([{"month": "2026-01", "cancelled": 5}])
    assert visualizer._detect_chart_type(df, ["month", "cancelled"], "trend in order cancellations") == "line"


def test_example_6_orders_shipped_by_air(monkeypatch):
    """"How many orders were shipped by air?" → count filtered by FLIGHT mode."""
    sql = llm_module._generate_fallback_sql(
        "user question: How many orders were shipped by air?"
    )
    assert "shipments" in sql.lower()
    assert "flight" in sql.lower()
    assert "count(*)" in sql.lower()


# ---------- End-to-end sanity for one representative query ----------


def test_example_end_to_end_top_customers_produces_chart(monkeypatch):
    """Full pipeline: top-5 customers question → SQL + analysis + chart."""
    rows = [
        {"customer": "Alice", "total_revenue": 9500, "order_count": 40},
        {"customer": "Bob", "total_revenue": 8200, "order_count": 33},
        {"customer": "Carol", "total_revenue": 7100, "order_count": 28},
        {"customer": "Dan", "total_revenue": 5400, "order_count": 22},
        {"customer": "Eve", "total_revenue": 4100, "order_count": 18},
    ]
    result = _run(
        "What are the top 5 customers by revenue?",
        monkeypatch,
        {"rows": rows, "columns": ["customer", "total_revenue", "order_count"], "row_count": 5},
    )

    assert result["is_in_scope"] is True
    assert result["sql_query"]
    assert "limit 5" in result["sql_query"].lower()
    assert result["final_answer"]
    assert result["visualization_html"] is not None
