"""Guardrails Agent - validates if the user's question is in scope."""
import re
import random
from state import AgentState
from prompts import AGENT_CONFIGS, GUARDRAILS_PROMPT, GREETING_RESPONSES, OUT_OF_SCOPE_RESPONSE
from llm import call_llm
from database import engine
from sqlalchemy import text

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

# E-commerce keywords that confirm analytics intent.
ECOMMERCE_KEYWORDS = re.compile(
    r'\b(products?|orders?|sales?|revenue|customers?|reviews?|shipments?|stores?|categories?|category|'
    r'inventory|stock|prices?|profits?|discounts?|carts?|payments?|refunds?|ratings?|'
    r'spen[dt]|spent|purchases?|purchas\w*|deliver\w*|shipped|shipping|warehouse|'
    r'sell(?:ers?|ing)?|sold|buy(?:ers?|ing)?|bought|monthly|daily|weekly|'
    r'total|average|count|sum|trends?|growth|compar\w*|segments?|analytics|'
    r'expensive|cheapest|best.?selling|top\s+\d|'
    r'month|year|quarter|cost|how\s+much|how\s+many|history|status|'
    r'ürün|urun|sipariş|siparis|satış|satis|gelir|müşteri|musteri|yorum|'
    r'mağaza|magaza|kategori|stok|teslimat|kargo|harcama|puan|en\s+(fazla|çok|cok))\b',
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

        # Revenue access control — INDIVIDUAL users cannot access revenue data
        role = state.get("user_role", "")
        if role == "INDIVIDUAL" and _is_revenue_query(question):
            return {
                "is_greeting": False,
                "is_in_scope": False,
                "final_answer": (
                    "📊 Revenue and sales data is restricted to store owners and administrators.\n\n"
                    "As a customer, here are some things you **can** ask me:\n"
                    "- 🛒 *\"Show my order history\"*\n"
                    "- ⭐ *\"What are the top rated products?\"*\n"
                    "- 📦 *\"Show my order status breakdown\"*\n"
                    "- 💰 *\"How much have I spent this year?\"*\n"
                    "- 🏷️ *\"What categories do I buy from the most?\"*\n"
                    "- 📝 *\"Show my reviews\"*"
                ),
            }

        # Cross-store isolation: CORPORATE users must not query other stores
        if role == "CORPORATE":
            store_id = state.get("store_id")
            if store_id and _is_cross_store_query(question, store_id):
                return {
                    "is_greeting": False,
                    "is_in_scope": False,
                    "final_answer": (
                        "🔒 You can only access data for **your own store**. "
                        "As a corporate user, your queries are scoped to your store's data only.\n\n"
                        "Try asking something like:\n"
                        "- 📊 *\"What are my store's sales this month?\"*\n"
                        "- 👥 *\"Who are my top customers?\"*\n"
                        "- 📦 *\"Show my order history\"*"
                    ),
                }

        return {
            "is_greeting": False,
            "is_in_scope": True,
        }


# Revenue-related keywords that INDIVIDUAL users cannot access
_REVENUE_PATTERNS = re.compile(
    r'\b(revenue|total\s+sales|sales\s+total|gross\s+sales|net\s+sales|'
    r'profit|margin|income|earnings|turnover|'
    r'how\s+much\s+.*(store|shop|business|company)\s+.*(make|earn|generate|sell)|'
    r'store\s+(revenue|sales|income|profit)|'
    r'(monthly|daily|weekly|yearly|annual)\s+(revenue|sales|income))\b',
    re.IGNORECASE
)

def _is_revenue_query(question: str) -> bool:
    """Detect if the question is asking about revenue/sales data."""
    return bool(_REVENUE_PATTERNS.search(question))

def _normalize(s: str) -> str:
    """Lowercase and strip non-alphanumeric chars for fuzzy store name matching."""
    return re.sub(r'[^a-z0-9]', '', s.lower())


def _is_cross_store_query(question: str, own_store_id: int) -> bool:
    """Detect if a CORPORATE user is trying to query another store's data.
    
    Fetches all store names from the DB, checks if any OTHER store's name
    appears in the question (with fuzzy matching to handle spacing variations
    like 'Tech Corp' vs 'TechCorp').
    """
    q_norm = _normalize(question)
    try:
        with engine.connect() as conn:
            rows = conn.execute(text("SELECT id, name FROM stores")).fetchall()
        for row in rows:
            sid, sname = row[0], row[1]
            if sid == own_store_id:
                continue  # skip own store
            if not sname:
                continue
            # Normalized match: "Tech Corp" → "techcorp" matches "TechCorp" → "techcorp"
            if _normalize(sname) in q_norm:
                return True
            # Also check exact lowercase (for short names that might be substrings)
            if len(sname) >= 4 and sname.lower() in question.lower():
                return True
    except Exception:
        pass  # If DB is unreachable, let the SQL-level filter handle it
    return False
