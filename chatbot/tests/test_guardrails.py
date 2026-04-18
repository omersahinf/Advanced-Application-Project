"""Tests for guardrails agent using the real implementation."""

from agents import guardrails


def test_ecommerce_keywords_match_extended_queries():
    assert guardrails.ECOMMERCE_KEYWORDS.search("Show me total revenue")
    assert guardrails.ECOMMERCE_KEYWORDS.search("How many orders today?")
    assert guardrails.ECOMMERCE_KEYWORDS.search("Which is the cheapest product?")
    assert guardrails.ECOMMERCE_KEYWORDS.search("Top 5 best selling products")


def test_blacklist_and_keyword_classifier():
    assert guardrails.NOT_ECOMMERCE_BLACKLIST.search("Tell me a joke")
    assert guardrails._classify_with_keywords("Tell me a joke") == "OUT_OF_SCOPE"
    assert guardrails._classify_with_keywords("Show me low stock products") == "IN_SCOPE"


def test_follow_up_patterns_detect_references():
    assert guardrails._is_follow_up_reference("Which one has the highest revenue?")
    assert guardrails._is_follow_up_reference("Break it down by category")
    assert not guardrails._is_follow_up_reference("What is the total revenue?")


def test_pure_greeting_short_circuits_before_llm(monkeypatch):
    monkeypatch.setattr(guardrails.random, "choice", lambda items: items[0])
    calls = []

    def llm_spy(*args, **kwargs):
        calls.append((args, kwargs))
        return "OUT_OF_SCOPE"

    monkeypatch.setattr(guardrails, "call_llm", llm_spy)

    result = guardrails.guardrails_agent({"question": "hello"})

    assert result["is_greeting"] is True
    assert result["is_in_scope"] is False
    assert result["final_answer"] == guardrails.GREETING_RESPONSES[0]
    assert calls == []


def test_greeting_plus_analytics_query_stays_in_scope(monkeypatch):
    monkeypatch.setattr(guardrails, "call_llm", lambda *args, **kwargs: "GREETING")

    result = guardrails.guardrails_agent({"question": "hello show total revenue"})

    assert result["is_greeting"] is False
    assert result["is_in_scope"] is True


def test_guardrails_allows_ecommerce_query_when_llm_is_ambiguous(monkeypatch):
    monkeypatch.setattr(guardrails, "call_llm", lambda *args, **kwargs: "Maybe")

    result = guardrails.guardrails_agent({"question": "Show me low stock products"})

    assert result["is_in_scope"] is True
    assert result["is_greeting"] is False


def test_guardrails_overrides_wrong_out_of_scope_for_ecommerce(monkeypatch):
    monkeypatch.setattr(guardrails, "call_llm", lambda *args, **kwargs: "OUT_OF_SCOPE")

    result = guardrails.guardrails_agent({"question": "What is the total revenue?"})

    assert result["is_in_scope"] is True
    assert result["is_greeting"] is False


def test_guardrails_returns_greeting_response(monkeypatch):
    monkeypatch.setattr(guardrails, "call_llm", lambda *args, **kwargs: "GREETING")
    monkeypatch.setattr(guardrails.random, "choice", lambda items: items[0])

    result = guardrails.guardrails_agent({"question": "Hello there"})

    assert result["is_greeting"] is True
    assert result["is_in_scope"] is False
    assert result["final_answer"] == guardrails.GREETING_RESPONSES[0]
