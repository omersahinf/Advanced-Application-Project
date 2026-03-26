"""Guardrails Agent - validates if the user's question is in scope."""
import re
import random
from state import AgentState
from prompts import GUARDRAILS_PROMPT, GREETING_RESPONSES, OUT_OF_SCOPE_RESPONSE
from llm import call_llm

# Keywords that indicate a follow-up referencing previous analytics data
FOLLOW_UP_PATTERNS = re.compile(
    r'\b(which one|what about|second|third|highest|lowest|more detail|show more|compare|'
    r'how about|the same|those|that one|previous|last result|drill down|break.*down|'
    r'why|how come|explain|top \d|bottom \d|sort by|filter by|exclude|include)\b',
    re.IGNORECASE
)

# E-commerce keywords that confirm analytics intent (with plural forms)
ECOMMERCE_KEYWORDS = re.compile(
    r'\b(products?|orders?|sales?|revenue|customers?|reviews?|shipments?|stores?|categories?|category|'
    r'inventory|stock|prices?|profits?|discounts?|carts?|payments?|refunds?|ratings?|'
    r'spend|purchases?|deliver|shipped|shipping|warehouse|sellers?|buyers?|monthly|daily|weekly|'
    r'total|average|count|sum|trends?|growth|comparison|segments?|analytics)\b',
    re.IGNORECASE
)

# Blacklist keywords — obviously non-ecommerce topics
NOT_ECOMMERCE_BLACKLIST = re.compile(
    r'\b(jokes?|funny|laugh|humor|football|soccer|basketball|baseball|tennis|'
    r'weather|forecast|politics|president|election|recipes?|cook|movie|songs?|'
    r'music|poems?|story|stories|novel|game\s+score|celebrity|gossip|'
    r'horoscope|zodiac|lottery|riddle|translate|homework|essay)\b',
    re.IGNORECASE
)


def _is_follow_up_reference(question: str) -> bool:
    """Check if the question is referencing previous analytics data."""
    return bool(FOLLOW_UP_PATTERNS.search(question))


def guardrails_agent(state: AgentState) -> dict:
    question = state["question"].strip()
    has_context = bool(state.get("conversation_context", "").strip())

    result = call_llm(GUARDRAILS_PROMPT.format(question=question), max_tokens=10)
    classification = result.strip().upper()

    if "GREETING" in classification:
        return {
            "is_greeting": True,
            "is_in_scope": False,
            "final_answer": random.choice(GREETING_RESPONSES),
        }
    elif "OUT_OF_SCOPE" in classification:
        # Only treat as follow-up if there's context AND the question actually
        # references previous data (e.g., "which one", "what about", "show more")
        if has_context and _is_follow_up_reference(question):
            return {
                "is_greeting": False,
                "is_in_scope": True,
            }
        return {
            "is_greeting": False,
            "is_in_scope": False,
            "final_answer": OUT_OF_SCOPE_RESPONSE,
        }
    else:
        # LLM classified as IN_SCOPE — verify with blacklist safety net
        if NOT_ECOMMERCE_BLACKLIST.search(question) and not ECOMMERCE_KEYWORDS.search(question):
            return {
                "is_greeting": False,
                "is_in_scope": False,
                "final_answer": OUT_OF_SCOPE_RESPONSE,
            }
        return {
            "is_greeting": False,
            "is_in_scope": True,
        }
