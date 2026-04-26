"""End-to-end integration tests for PDF Section 5.4 — Agentic Flow.

Covers the 8-step workflow:
  1. User Input
  2. Guardrails Check (greeting / out-of-scope / in-scope routing)
  3. SQL Generation
  4. Query Execution
  5. Error Handling (retry up to MAX_RETRIES)
  6. Analysis
  7. Visualization (conditional)
  8. Response (consolidated dict)

All LLM and DB calls are mocked so tests are deterministic and offline.
"""
import graph
import config
from agents import guardrails, sql_generator, analyst, visualizer, error_handler
from agents import executor


# ----- Helpers -----


def _patch_llms(monkeypatch, *, scope="IN_SCOPE", sql="SELECT 1 AS x", analysis="Here are the results.", viz_code="NO_VIZ", fixed_sql="SELECT 1 AS x"):
    # Ensure the analyst LLM branch is always taken, even when
    # OPENAI_API_KEY is not set in the CI environment.
    monkeypatch.setattr(config, "OPENAI_API_KEY", "test-key")
    monkeypatch.setattr(guardrails, "call_llm", lambda *a, **k: scope)
    monkeypatch.setattr(sql_generator, "call_llm", lambda *a, **k: sql)
    monkeypatch.setattr(analyst, "call_llm", lambda *a, **k: analysis)
    monkeypatch.setattr(visualizer, "call_llm", lambda *a, **k: viz_code)
    monkeypatch.setattr(error_handler, "call_llm", lambda *a, **k: fixed_sql)


def _patch_executor(monkeypatch, result):
    """Make database.execute_query return a fixed result dict."""
    monkeypatch.setattr(executor, "execute_query", lambda sql: result)


# ----- Tests -----


def test_flow_greeting_ends_before_sql(monkeypatch):
    """Step 2 branch: greeting → friendly welcome, skip SQL."""
    _patch_llms(monkeypatch, scope="GREETING")
    monkeypatch.setattr(guardrails.random, "choice", lambda items: items[0])

    result = graph.run_query("hello", user_role="ADMIN", user_id=1)

    assert result["is_greeting"] is True
    assert result["is_in_scope"] is False
    assert result["sql_query"] is None
    assert "assistant" in result["final_answer"].lower() or "hello" in result["final_answer"].lower()


def test_flow_out_of_scope_ends_before_sql(monkeypatch):
    """Step 2 branch: out-of-scope → rejection, skip SQL."""
    _patch_llms(monkeypatch, scope="OUT_OF_SCOPE")

    result = graph.run_query("tell me a joke", user_role="ADMIN", user_id=1)

    assert result["is_in_scope"] is False
    assert result["sql_query"] is None


def test_flow_in_scope_runs_full_pipeline_with_viz(monkeypatch):
    """Steps 2→3→4→6→7→8: happy path with chartable result."""
    rows = [
        {"product": "A", "revenue": 100},
        {"product": "B", "revenue": 250},
        {"product": "C", "revenue": 175},
    ]
    _patch_executor(monkeypatch, {"rows": rows, "columns": ["product", "revenue"], "row_count": 3})
    _patch_llms(
        monkeypatch,
        sql="SELECT product, revenue FROM products",
        analysis="B leads with 250 in revenue.",
        viz_code="fig = go.Figure(data=[go.Bar(x=['A','B','C'], y=[100,250,175])])",
    )

    result = graph.run_query("top products by revenue", user_role="ADMIN", user_id=1)

    assert result["is_in_scope"] is True
    assert result["sql_query"] == "SELECT product, revenue FROM products"
    assert result["query_result"]["row_count"] == 3
    assert result["final_answer"] == "B leads with 250 in revenue."
    assert result["visualization_html"] is not None


def test_flow_skips_visualization_for_single_row_scalar(monkeypatch):
    """Step 7 branch: scalar result → decide_graph picks no_graph."""
    _patch_executor(
        monkeypatch,
        {"rows": [{"total_revenue": 50000}], "columns": ["total_revenue"], "row_count": 1},
    )
    _patch_llms(
        monkeypatch,
        sql="SELECT SUM(grand_total) AS total_revenue FROM orders",
        analysis="Total revenue is 50000.",
    )

    result = graph.run_query("total revenue", user_role="ADMIN", user_id=1)

    assert result["query_result"]["row_count"] == 1
    assert result["visualization_html"] is None
    assert result["final_answer"]


def test_flow_error_triggers_error_handler_retry(monkeypatch):
    """Step 5: first execute fails, error_handler fixes, second execute succeeds."""
    calls = {"count": 0}
    success = {"rows": [{"x": 1}, {"x": 2}], "columns": ["x"], "row_count": 2}

    def fake_execute(sql):
        calls["count"] += 1
        if calls["count"] == 1:
            return {"error": "column does not exist"}
        return success

    monkeypatch.setattr(executor, "execute_query", fake_execute)
    _patch_llms(
        monkeypatch,
        sql="SELECT bogus FROM t",
        fixed_sql="SELECT x FROM t",
        analysis="Recovered after error.",
    )

    result = graph.run_query("show data", user_role="ADMIN", user_id=1)

    assert calls["count"] >= 2, "error_handler should have retried execution"
    assert result["iteration_count"] >= 1
    assert result["final_answer"] == "Recovered after error."


def test_flow_gives_up_after_max_retries(monkeypatch):
    """Step 5 exhaustion: persistent error → give_up node kicks in."""
    monkeypatch.setattr(executor, "execute_query", lambda sql: {"error": "permanent failure"})
    _patch_llms(monkeypatch, sql="SELECT bad FROM t", fixed_sql="SELECT still_bad FROM t")

    result = graph.run_query("show data", user_role="ADMIN", user_id=1)

    assert "wasn't able to process" in result["final_answer"].lower() or "try rephrasing" in result["final_answer"].lower()


def test_flow_response_contains_required_fields(monkeypatch):
    """Step 8: response dict exposes all consumer-facing fields."""
    _patch_executor(monkeypatch, {"rows": [{"a": 1}], "columns": ["a"], "row_count": 1})
    _patch_llms(monkeypatch, sql="SELECT 1 AS a", analysis="OK.")

    result = graph.run_query("show a", user_role="ADMIN", user_id=1)

    for field in ("answer", "question", "sql_query", "query_result", "final_answer", "is_in_scope", "iteration_count"):
        assert field in result, f"Response missing field: {field}"


def test_flow_stream_yields_steps_in_order(monkeypatch):
    """Stream events fire in the documented pipeline order."""
    _patch_executor(monkeypatch, {"rows": [{"a": 1}], "columns": ["a"], "row_count": 1})
    _patch_llms(monkeypatch, sql="SELECT 1 AS a", analysis="OK.")

    events = list(graph.run_query_stream("show a", user_role="ADMIN", user_id=1))
    steps = [e["step"] for e in events]

    # guardrails must come first, final must come last
    assert steps[0] == "guardrails"
    assert steps[-1] == "final"
    # SQL → execute → analyze → decide_graph must appear in order
    pipeline = [s for s in steps if s in ("generate_sql", "execute", "analyze", "decide_graph")]
    assert pipeline == ["generate_sql", "execute", "analyze", "decide_graph"], f"Unexpected order: {steps}"
