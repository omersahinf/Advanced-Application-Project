"""Tests for guardrails agent — input validation and scope filtering.
Tests regex patterns directly to avoid heavy dependency imports.
"""
import re

# Copy the exact patterns from agents/guardrails.py to test independently
FOLLOW_UP_PATTERNS = re.compile(
    r'\b(which one|what about|second|third|highest|lowest|more detail|show more|compare|'
    r'how about|the same|those|that one|previous|last result|drill down|break.*down|'
    r'why|how come|explain|top \d|bottom \d|sort by|filter by|exclude|include)\b',
    re.IGNORECASE
)

ECOMMERCE_KEYWORDS = re.compile(
    r'\b(products?|orders?|sales?|revenue|customers?|reviews?|shipments?|stores?|categories?|category|'
    r'inventory|stock|prices?|profits?|discounts?|carts?|payments?|refunds?|ratings?|'
    r'spend|purchases?|deliver|shipped|shipping|warehouse|sellers?|buyers?|monthly|daily|weekly|'
    r'total|average|count|sum|trends?|growth|comparison|segments?|analytics)\b',
    re.IGNORECASE
)

NOT_ECOMMERCE_BLACKLIST = re.compile(
    r'\b(jokes?|funny|laugh|humor|football|soccer|basketball|baseball|tennis|'
    r'weather|forecast|politics|president|election|recipes?|cook|movie|songs?|'
    r'music|poems?|story|stories|novel|game\s+score|celebrity|gossip|'
    r'horoscope|zodiac|lottery|riddle|translate|homework|essay)\b',
    re.IGNORECASE
)


def _is_follow_up_reference(question: str) -> bool:
    return bool(FOLLOW_UP_PATTERNS.search(question))


def test_ecommerce_keywords_match():
    """E-commerce keywords should be detected."""
    assert ECOMMERCE_KEYWORDS.search("Show me total revenue")
    assert ECOMMERCE_KEYWORDS.search("How many orders today?")
    assert ECOMMERCE_KEYWORDS.search("List all products")
    assert ECOMMERCE_KEYWORDS.search("Customer spending by city")
    assert ECOMMERCE_KEYWORDS.search("average ratings")


def test_ecommerce_keywords_no_match():
    """Non-ecommerce text should not match."""
    assert not ECOMMERCE_KEYWORDS.search("Tell me a joke")
    assert not ECOMMERCE_KEYWORDS.search("What is the weather?")
    assert not ECOMMERCE_KEYWORDS.search("Write me a poem")


def test_blacklist_catches_off_topic():
    """Blacklist should catch clearly off-topic keywords."""
    assert NOT_ECOMMERCE_BLACKLIST.search("Tell me a joke")
    assert NOT_ECOMMERCE_BLACKLIST.search("Who won the football game?")
    assert NOT_ECOMMERCE_BLACKLIST.search("What's the weather forecast?")
    assert NOT_ECOMMERCE_BLACKLIST.search("Write me a poem about love")


def test_blacklist_allows_ecommerce():
    """Blacklist should not trigger on e-commerce questions."""
    assert not NOT_ECOMMERCE_BLACKLIST.search("What is the total revenue?")
    assert not NOT_ECOMMERCE_BLACKLIST.search("Show me order status breakdown")
    assert not NOT_ECOMMERCE_BLACKLIST.search("Top 5 selling products")


def test_follow_up_patterns():
    """Follow-up references should be detected."""
    assert _is_follow_up_reference("Which one has the highest?")
    assert _is_follow_up_reference("Show more details")
    assert _is_follow_up_reference("Compare those two")
    assert _is_follow_up_reference("Break it down by category")


def test_not_follow_up():
    """Direct questions should not be flagged as follow-ups."""
    assert not _is_follow_up_reference("What is the total revenue?")
    assert not _is_follow_up_reference("How many orders are pending?")
