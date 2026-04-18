"""Guardrails Agent - validates if the user's question is in scope."""
import re
import random
from state import AgentState
from prompts import AGENT_CONFIGS, GUARDRAILS_PROMPT, GREETING_RESPONSES, OUT_OF_SCOPE_RESPONSE
from llm import call_llm

# Keywords that indicate a follow-up referencing previous analytics data
FOLLOW_UP_PATTERNS = re.compile(
    r'\b(which one|what about|second|third|highest|lowest|more detail|show more|compare|'
    r'how about|the same|those|that one|previous|last result|drill down|break.*down|'
    r'why|how come|explain|top \d|bottom \d|sort by|filter by|exclude|include)\b',
    re.IGNORECASE
)

# Deterministic greeting matcher for short salutations.
GREETING_PATTERNS = re.compile(
    r'^\s*(hello|hi|hey|howdy|good\s+(morning|afternoon|evening))(?:\s+(there|assistant|team|bot))?[\s!.,?]*$',
    re.IGNORECASE
)

# E-commerce keywords that confirm analytics intent (English only)
ECOMMERCE_KEYWORDS = re.compile(
    r'\b(products?|orders?|sales?|revenue|customers?|reviews?|shipments?|stores?|categories?|category|'
    r'inventory|stock|prices?|profits?|discounts?|carts?|payments?|refunds?|ratings?|'
    r'spend|purchases?|deliver|shipped|shipping|warehouse|sellers?|buyers?|monthly|daily|weekly|'
    r'total|average|count|sum|trends?|growth|comparison|segments?|analytics|'
    r'expensive|cheapest|best.?selling|top\s+\d)\b',
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


def _is_greeting_message(question: str) -> bool:
    """Allow pure greetings to short-circuit before the LLM."""
    return bool(GREETING_PATTERNS.fullmatch(question.strip()))


def _classify_with_keywords(question: str) -> str:
    """Keyword-based classification fallback when LLM gives ambiguous response."""
    # Check blacklist first
    if NOT_ECOMMERCE_BLACKLIST.search(question) and not ECOMMERCE_KEYWORDS.search(question):
        return "OUT_OF_SCOPE"
    # Check e-commerce keywords
    if ECOMMERCE_KEYWORDS.search(question):
        return "IN_SCOPE"
    return "UNKNOWN"


def guardrails_agent(state: AgentState) -> dict:
    question = state["question"].strip()
    has_context = bool(state.get("conversation_context", "").strip())

    if _is_greeting_message(question):
        return {
            "is_greeting": True,
            "is_in_scope": False,
            "final_answer": random.choice(GREETING_RESPONSES),
        }

    result = call_llm(
        GUARDRAILS_PROMPT.format(question=question),
        max_tokens=50,
        system_prompt=AGENT_CONFIGS["guardrails_agent"]["system_prompt"]
    )
    classification = result.strip().upper()
    print(f"[Guardrails] LLM raw='{result.strip()}' | parsed='{classification}'")

    # Normalize — LLM may return verbose responses like "The answer is IN_SCOPE"
    if "GREETING" in classification:
        resolved = "GREETING"
    elif "OUT_OF_SCOPE" in classification or "OUT OF SCOPE" in classification:
        resolved = "OUT_OF_SCOPE"
    elif "IN_SCOPE" in classification or "IN SCOPE" in classification or "INSCOPE" in classification:
        resolved = "IN_SCOPE"
    else:
        # LLM gave something unexpected — fall back to keyword classification
        resolved = _classify_with_keywords(question)
        print(f"[Guardrails] LLM ambiguous, keyword fallback='{resolved}'")
        if resolved == "UNKNOWN":
            # When unsure, if question has e-commerce keywords let it through
            resolved = "IN_SCOPE" if ECOMMERCE_KEYWORDS.search(question) else "OUT_OF_SCOPE"

    if resolved == "GREETING":
        if ECOMMERCE_KEYWORDS.search(question) and not _is_greeting_message(question):
            return {
                "is_greeting": False,
                "is_in_scope": True,
            }
        return {
            "is_greeting": True,
            "is_in_scope": False,
            "final_answer": random.choice(GREETING_RESPONSES),
        }
    elif resolved == "OUT_OF_SCOPE":
        if has_context and _is_follow_up_reference(question):
            return {
                "is_greeting": False,
                "is_in_scope": True,
            }
        # Double-check with keywords — LLM may have wrongly classified e-commerce queries
        if ECOMMERCE_KEYWORDS.search(question):
            print(f"[Guardrails] LLM said OUT_OF_SCOPE but e-commerce keywords found, overriding to IN_SCOPE")
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
        # IN_SCOPE — verify with blacklist safety net
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
