"""Tests for Error Handler Agent (5.3: Error Recovery Specialist role).

Covers: SQL fix via LLM, role-filter re-application, markdown stripping.
"""
from agents import error_handler


def _state(sql, error, role="ADMIN", user_id=1, store_id=None, question="Show orders"):
    return {
        "question": question,
        "user_role": role,
        "user_id": user_id,
        "store_id": store_id,
        "sql_query": sql,
        "error": error,
    }


def test_error_agent_returns_fixed_sql(monkeypatch):
    fixed = "SELECT id, grand_total FROM orders WHERE status != 'CANCELLED'"
    monkeypatch.setattr(error_handler, "call_llm", lambda *a, **k: fixed)

    result = error_handler.error_handler_agent(
        _state("SELECT id, total FROM orders", "column 'total' does not exist")
    )
    assert result["sql_query"] == fixed
    assert result["error"] is None


def test_error_agent_strips_markdown_code_fences(monkeypatch):
    monkeypatch.setattr(
        error_handler,
        "call_llm",
        lambda *a, **k: "```sql\nSELECT id FROM orders\n```",
    )
    result = error_handler.error_handler_agent(
        _state("SELECT bogus FROM orders", "syntax error")
    )
    assert "```" not in result["sql_query"]
    assert "SELECT id FROM orders" in result["sql_query"]


def test_error_agent_reapplies_individual_users_table_filter(monkeypatch):
    """For INDIVIDUAL role, access to `users` table must remain scoped to own row."""
    monkeypatch.setattr(
        error_handler, "call_llm", lambda *a, **k: "SELECT id, email FROM users"
    )
    result = error_handler.error_handler_agent(
        _state(
            "SELECT id, email FROM users",
            "syntax error",
            role="INDIVIDUAL",
            user_id=42,
        )
    )
    assert "users.id = 42" in result["sql_query"]


def test_error_agent_reapplies_corporate_store_filter(monkeypatch):
    monkeypatch.setattr(
        error_handler, "call_llm", lambda *a, **k: "SELECT * FROM products"
    )
    result = error_handler.error_handler_agent(
        _state(
            "SELECT * FROM products",
            "column does not exist",
            role="CORPORATE",
            user_id=1,
            store_id=7,
            question="Show my products",
        )
    )
    assert "store_id = 7" in result["sql_query"]


def test_error_agent_clears_error_flag(monkeypatch):
    monkeypatch.setattr(error_handler, "call_llm", lambda *a, **k: "SELECT 1")
    result = error_handler.error_handler_agent(_state("SELECT x", "boom"))
    assert result["error"] is None
