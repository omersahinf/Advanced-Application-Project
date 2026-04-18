"""FastAPI endpoint tests for chat and streaming behavior."""

import time

import pytest
from fastapi.testclient import TestClient

import main


@pytest.fixture(autouse=True)
def _reset_main_state(monkeypatch):
    main._sessions.clear()
    main._session_last_active.clear()
    monkeypatch.setattr(main.config, "INTERNAL_API_KEY", "test-api-key")
    monkeypatch.setattr(main.config, "USE_SHARED_DB", True)
    monkeypatch.setattr(main, "seed", lambda: None)
    yield
    main._sessions.clear()
    main._session_last_active.clear()


@pytest.fixture
def client():
    with TestClient(main.app) as test_client:
        yield test_client


def test_chat_rejects_missing_api_key(client):
    response = client.post("/api/chat", json={"question": "Show revenue"})

    assert response.status_code == 403
    assert response.json()["detail"] == "Invalid or missing API key"


def test_chat_stream_rejects_invalid_api_key(client):
    response = client.post(
        "/api/chat/stream",
        headers={"X-API-Key": "wrong"},
        json={"question": "Show revenue"},
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "Invalid or missing API key"


def test_chat_rejects_blank_question(client):
    response = client.post(
        "/api/chat",
        headers={"X-API-Key": "test-api-key"},
        json={"question": "   "},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Question cannot be empty"


def test_chat_builds_context_and_persists_turn(monkeypatch, client):
    captured = {}
    session_id = "session-1"
    main._sessions[session_id].append(
        {
            "question": "Show revenue by store",
            "answer": "Store A leads.",
            "sql_query": "SELECT  store_name,\n revenue  FROM store_totals",
            "columns": ["store_name", "revenue"],
        }
    )
    main._session_last_active[session_id] = time.time()

    def fake_run_query(**kwargs):
        captured.update(kwargs)
        return {
            "answer": "Store A still leads.",
            "question": kwargs["question"],
            "sql_query": "SELECT store_name, revenue FROM store_totals ORDER BY revenue DESC",
            "query_result": {
                "rows": [{"store_name": "Store A", "revenue": 1200}],
                "columns": ["store_name", "revenue"],
                "row_count": 1,
            },
            "data": {
                "rows": [{"store_name": "Store A", "revenue": 1200}],
                "columns": ["store_name", "revenue"],
                "row_count": 1,
            },
            "error": None,
            "final_answer": "Store A still leads.",
            "visualization_html": None,
            "visualization_code": None,
            "is_in_scope": True,
            "is_greeting": False,
            "iteration_count": 0,
        }

    monkeypatch.setattr(main, "run_query", fake_run_query)

    response = client.post(
        "/api/chat",
        headers={"X-API-Key": "test-api-key"},
        json={
            "question": "Which one is highest?",
            "user_role": "ADMIN",
            "user_id": 9,
            "session_id": session_id,
        },
    )

    assert response.status_code == 200
    assert response.json()["answer"] == "Store A still leads."
    assert captured["conversation_context"] == (
        "Turn 1:\n"
        "  Question: Show revenue by store\n"
        "  SQL: SELECT store_name, revenue FROM store_totals\n"
        "  Result columns: store_name, revenue\n"
        "  Answer: Store A leads."
    )
    assert len(main._sessions[session_id]) == 2
    assert main._sessions[session_id][-1] == {
        "question": "Which one is highest?",
        "answer": "Store A still leads.",
        "sql_query": "SELECT store_name, revenue FROM store_totals ORDER BY revenue DESC",
        "columns": ["store_name", "revenue"],
    }


def test_chat_stream_returns_sse_and_persists_session_history(monkeypatch, client):
    captured = {}

    def fake_run_query_stream(**kwargs):
        captured.update(kwargs)
        yield {
            "step": "guardrails",
            "status": "done",
            "icon": "🔒",
            "label": "Guardrails Check",
            "payload": {"is_in_scope": True, "is_greeting": False},
        }
        yield {
            "step": "final",
            "status": "done",
            "payload": {
                "answer": "Revenue is trending up.",
                "sql_query": "SELECT month, revenue FROM sales_summary",
                "data": {
                    "rows": [{"month": "Jan", "revenue": 10}, {"month": "Feb", "revenue": 20}],
                    "columns": ["month", "revenue"],
                    "row_count": 2,
                },
                "is_in_scope": True,
                "is_greeting": False,
            },
        }

    monkeypatch.setattr(main, "run_query_stream", fake_run_query_stream)

    response = client.post(
        "/api/chat/stream",
        headers={"X-API-Key": "test-api-key"},
        json={
            "question": "Show monthly revenue",
            "user_role": "ADMIN",
            "user_id": 9,
            "session_id": "stream-1",
        },
    )

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/event-stream")
    assert "event: step" in response.text
    assert "event: final" in response.text
    assert "\"answer\": \"Revenue is trending up.\"" in response.text
    assert captured["conversation_context"] == ""
    assert main._sessions["stream-1"][-1] == {
        "question": "Show monthly revenue",
        "answer": "Revenue is trending up.",
        "sql_query": "SELECT month, revenue FROM sales_summary",
        "columns": ["month", "revenue"],
    }


def test_build_context_drops_expired_sessions():
    session_id = "expired-session"
    main._sessions[session_id].append({"question": "Old question", "answer": "Old answer"})
    main._session_last_active[session_id] = time.time() - main.SESSION_TIMEOUT_SECS - 1

    context = main._build_context(session_id)

    assert context == ""
    assert session_id not in main._sessions
    assert session_id not in main._session_last_active
