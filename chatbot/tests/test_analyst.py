"""Tests for Analysis Agent (5.3: Data Analyst role).

Covers: natural-language explanation, empty-result handling, pandas
fallback when LLM key is absent, role-aware output.
"""
from agents import analyst


def _state(rows, columns, question="Show products", role="ADMIN"):
    return {
        "question": question,
        "user_role": role,
        "user_id": 1,
        "store_id": None,
        "sql_query": "SELECT * FROM products",
        "query_result": {
            "rows": rows,
            "columns": columns,
            "row_count": len(rows),
        },
    }


def test_analyst_empty_result_returns_meaningful_message(monkeypatch):
    monkeypatch.setattr(analyst.config, "OPENAI_API_KEY", "")
    result = analyst.analysis_agent(_state([], ["name", "price"]))
    answer = result["final_answer"]
    assert answer
    assert "no" in answer.lower() or "empty" in answer.lower() or "no results" in answer.lower()


def test_analyst_single_scalar_result_is_formatted(monkeypatch):
    monkeypatch.setattr(analyst.config, "OPENAI_API_KEY", "")
    result = analyst.analysis_agent(
        _state([{"total_revenue": 12345.67}], ["total_revenue"], question="Total revenue?")
    )
    answer = result["final_answer"]
    assert "12,345.67" in answer or "12345" in answer


def test_analyst_pandas_fallback_without_llm_key(monkeypatch):
    """When OPENAI_API_KEY is empty, analyst must use Pandas-based fallback."""
    monkeypatch.setattr(analyst.config, "OPENAI_API_KEY", "")
    rows = [
        {"category": "Books", "total": 100.0},
        {"category": "Toys", "total": 250.0},
        {"category": "Games", "total": 175.0},
    ]
    result = analyst.analysis_agent(_state(rows, ["category", "total"], question="Sales by category"))
    answer = result["final_answer"]
    assert answer
    # Fallback uses pandas and always produces row count and highest-value insight.
    assert "3" in answer
    assert "Toys" in answer  # highest value should surface


def test_analyst_uses_llm_response_when_key_is_set(monkeypatch):
    monkeypatch.setattr(analyst.config, "OPENAI_API_KEY", "sk-fake")
    expected = "Sales are concentrated in the Toys category, which outperforms others by ~2x."
    monkeypatch.setattr(analyst, "call_llm", lambda *a, **k: expected)

    rows = [{"category": "Toys", "total": 250.0}, {"category": "Books", "total": 100.0}]
    result = analyst.analysis_agent(_state(rows, ["category", "total"]))
    assert result["final_answer"] == expected


def test_analyst_falls_back_when_llm_returns_generic(monkeypatch):
    monkeypatch.setattr(analyst.config, "OPENAI_API_KEY", "sk-fake")
    monkeypatch.setattr(
        analyst, "call_llm", lambda *a, **k: "The query returned some rows."
    )
    rows = [{"x": "A", "y": 1}, {"x": "B", "y": 2}]
    result = analyst.analysis_agent(_state(rows, ["x", "y"]))
    # Fallback kicked in — should contain row count marker, not the generic phrase.
    assert "2" in result["final_answer"]
    assert "some rows" not in result["final_answer"].lower()
