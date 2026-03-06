"""LangGraph state definition using TypedDict for type-safe state management."""
from typing import TypedDict, Optional, List, Dict, Any


class AgentState(TypedDict):
    question: str
    user_role: str           # ADMIN, CORPORATE, INDIVIDUAL
    user_id: int
    store_id: Optional[int]  # For CORPORATE users

    # Guardrails
    is_in_scope: Optional[bool]
    is_greeting: Optional[bool]

    # SQL Generation
    sql_query: Optional[str]

    # Execution
    query_result: Optional[Dict[str, Any]]
    error: Optional[str]
    iteration_count: int

    # Analysis
    final_answer: Optional[str]

    # Visualization
    visualization_code: Optional[str]
    visualization_html: Optional[str]
