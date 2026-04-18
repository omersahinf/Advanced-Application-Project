"""Graph-level orchestration tests for the multi-agent workflow."""

import graph


def _rebuild_graph(
    monkeypatch,
    *,
    guardrails=None,
    sql_generator=None,
    execute=None,
    error_handler=None,
    analyze=None,
    visualize=None,
):
    calls = []

    def wrap(name, fn):
        def inner(state):
            calls.append(name)
            return fn(state)

        return inner

    def default_guardrails(_state):
        return {"is_in_scope": True, "is_greeting": False}

    def default_sql(_state):
        return {"sql_query": "SELECT 1 AS total"}

    def default_execute(_state):
        return {
            "query_result": {
                "rows": [{"total": 1}],
                "columns": ["total"],
                "row_count": 1,
            },
            "error": None,
        }

    def default_error_handler(state):
        return {
            "sql_query": state.get("sql_query"),
            "iteration_count": state.get("iteration_count", 0) + 1,
            "error": None,
        }

    def default_analyze(_state):
        return {"final_answer": "Done."}

    def default_visualize(_state):
        return {
            "visualization_code": "fallback",
            "visualization_html": "<div>chart</div>",
        }

    original_decide_graph = graph.decide_graph_need_node
    original_give_up = graph.give_up_node

    monkeypatch.setattr(
        graph,
        "guardrails_agent",
        wrap("guardrails", guardrails or default_guardrails),
    )
    monkeypatch.setattr(
        graph,
        "sql_generator_agent",
        wrap("generate_sql", sql_generator or default_sql),
    )
    monkeypatch.setattr(
        graph,
        "executor_agent",
        wrap("execute", execute or default_execute),
    )
    monkeypatch.setattr(
        graph,
        "error_handler_agent",
        wrap("error_handler", error_handler or default_error_handler),
    )
    monkeypatch.setattr(
        graph,
        "analysis_agent",
        wrap("analyze", analyze or default_analyze),
    )
    monkeypatch.setattr(
        graph,
        "visualization_agent",
        wrap("visualize", visualize or default_visualize),
    )
    monkeypatch.setattr(
        graph,
        "decide_graph_need_node",
        wrap("decide_graph", original_decide_graph),
    )
    monkeypatch.setattr(
        graph,
        "give_up_node",
        wrap("give_up", original_give_up),
    )
    monkeypatch.setattr(graph, "app", graph.build_graph())
    return calls


def test_run_query_stream_short_circuits_greeting_before_sql(monkeypatch):
    calls = _rebuild_graph(
        monkeypatch,
        guardrails=lambda _state: {
            "is_in_scope": False,
            "is_greeting": True,
            "final_answer": "Hello there!",
        },
    )

    events = list(graph.run_query_stream("hello"))

    assert [event["step"] for event in events] == ["guardrails", "final"]
    assert calls == ["guardrails"]
    assert events[-1]["payload"]["answer"] == "Hello there!"
    assert events[-1]["payload"]["sql_query"] is None


def test_run_query_stream_skips_visualization_for_single_row(monkeypatch):
    _rebuild_graph(monkeypatch)

    events = list(graph.run_query_stream("Total revenue?"))

    assert [event["step"] for event in events] == [
        "guardrails",
        "generate_sql",
        "execute",
        "analyze",
        "decide_graph",
        "final",
    ]
    assert events[-1]["payload"]["answer"] == "Done."
    assert events[-1]["payload"]["visualization_html"] is None


def test_run_query_stream_routes_to_visualization_when_data_is_chartable(monkeypatch):
    _rebuild_graph(
        monkeypatch,
        execute=lambda _state: {
            "query_result": {
                "rows": [{"month": "Jan", "revenue": 10}, {"month": "Feb", "revenue": 20}],
                "columns": ["month", "revenue"],
                "row_count": 2,
            },
            "error": None,
        },
        analyze=lambda _state: {"final_answer": "Revenue increased month over month."},
        visualize=lambda _state: {
            "visualization_code": "fig = ...",
            "visualization_html": "<div>plotly chart</div>",
        },
    )

    events = list(graph.run_query_stream("Show revenue trend"))

    assert [event["step"] for event in events] == [
        "guardrails",
        "generate_sql",
        "execute",
        "analyze",
        "decide_graph",
        "visualize",
        "final",
    ]
    assert events[-2]["payload"] == {"has_chart": True}
    assert events[-1]["payload"]["visualization_html"] == "<div>plotly chart</div>"


def test_run_query_stream_retries_failed_execution_before_succeeding(monkeypatch):
    attempt = {"count": 0}

    def execute(state):
        attempt["count"] += 1
        if attempt["count"] == 1:
            return {"error": "syntax error near FROM"}
        return {
            "query_result": {
                "rows": [{"status": "PAID", "count": 5}],
                "columns": ["status", "count"],
                "row_count": 1,
            },
            "error": None,
        }

    def error_handler(state):
        return {
            "sql_query": "SELECT status, count(*) AS count FROM orders GROUP BY status",
            "iteration_count": state.get("iteration_count", 0) + 1,
            "error": None,
        }

    _rebuild_graph(
        monkeypatch,
        sql_generator=lambda _state: {"sql_query": "SELECT status count(*) FROM orders"},
        execute=execute,
        error_handler=error_handler,
        analyze=lambda _state: {"final_answer": "Most orders are paid."},
    )

    events = list(graph.run_query_stream("Orders by status"))

    assert [event["step"] for event in events] == [
        "guardrails",
        "generate_sql",
        "execute",
        "error_handler",
        "execute",
        "analyze",
        "decide_graph",
        "final",
    ]
    assert events[2]["payload"]["error"] == "syntax error near FROM"
    assert events[3]["payload"]["iteration_count"] == 1
    assert events[-1]["payload"]["iteration_count"] == 1
    assert events[-1]["payload"]["sql_query"] == (
        "SELECT status, count(*) AS count FROM orders GROUP BY status"
    )


def test_run_query_stream_gives_up_after_max_retries(monkeypatch):
    monkeypatch.setattr(graph.config, "MAX_RETRIES", 2)

    def execute(_state):
        return {"error": "database timeout"}

    def error_handler(state):
        return {
            "sql_query": f"SELECT {state.get('iteration_count', 0) + 1}",
            "iteration_count": state.get("iteration_count", 0) + 1,
            "error": None,
        }

    _rebuild_graph(monkeypatch, execute=execute, error_handler=error_handler)

    events = list(graph.run_query_stream("Try a broken query"))

    assert [event["step"] for event in events] == [
        "guardrails",
        "generate_sql",
        "execute",
        "error_handler",
        "execute",
        "error_handler",
        "execute",
        "give_up",
        "final",
    ]
    assert events[-2]["step"] == "give_up"
    assert "after 2 attempts" in events[-1]["payload"]["answer"]
    assert events[-1]["payload"]["error"] is None
    assert events[-1]["payload"]["sql_query"] is None
