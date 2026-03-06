"""Guardrails Agent - validates if the user's question is in scope."""
import random
from state import AgentState
from prompts import GUARDRAILS_PROMPT, GREETING_RESPONSES, OUT_OF_SCOPE_RESPONSE
from llm import call_llm


def guardrails_agent(state: AgentState) -> dict:
    question = state["question"].strip()

    result = call_llm(GUARDRAILS_PROMPT.format(question=question), max_tokens=10)
    classification = result.strip().upper()

    if "GREETING" in classification:
        return {
            "is_greeting": True,
            "is_in_scope": False,
            "final_answer": random.choice(GREETING_RESPONSES),
        }
    elif "OUT_OF_SCOPE" in classification:
        return {
            "is_greeting": False,
            "is_in_scope": False,
            "final_answer": OUT_OF_SCOPE_RESPONSE,
        }
    else:
        return {
            "is_greeting": False,
            "is_in_scope": True,
        }
