"""LangGraph workflow - orchestrates all agents in a state machine."""
from typing import Optional
from langgraph.graph import StateGraph, END
from state import AgentState
from agents.guardrails import guardrails_agent
from agents.sql_generator import sql_generator_agent
from agents.executor import executor_agent
from agents.error_handler import error_handler_agent
from agents.analyst import analysis_agent
from agents.visualizer import visualization_agent
import config


def should_continue_after_guardrails(state: AgentState) -> str:
    """Route based on guardrails output."""
    if state.get("is_greeting") or not state.get("is_in_scope"):
        return "end"
    return "generate_sql"


def should_retry_or_analyze(state: AgentState) -> str:
    """Route based on query execution result."""
    if state.get("error"):
        if state.get("iteration_count", 0) < config.MAX_RETRIES:
            return "error_handler"
        return "give_up"
    return "analyze"


def give_up_node(state: AgentState) -> dict:
    return {
        "final_answer": f"I wasn't able to process your request after {config.MAX_RETRIES} attempts. "
                        "Please try rephrasing your question or ask something different.",
        "error": None,
        "sql_query": None,
    }


def build_graph() -> StateGraph:
    graph = StateGraph(AgentState)

    # Add nodes
    graph.add_node("guardrails", guardrails_agent)
    graph.add_node("generate_sql", sql_generator_agent)
    graph.add_node("execute", executor_agent)
    graph.add_node("error_handler", error_handler_agent)
    graph.add_node("analyze", analysis_agent)
    graph.add_node("visualize", visualization_agent)
    graph.add_node("give_up", give_up_node)

    # Set entry point
    graph.set_entry_point("guardrails")

    # Conditional: after guardrails, either end (greeting/out-of-scope) or generate SQL
    graph.add_conditional_edges(
        "guardrails",
        should_continue_after_guardrails,
        {"end": END, "generate_sql": "generate_sql"}
    )

    # After SQL generation, execute
    graph.add_edge("generate_sql", "execute")

    # After execution, either retry, give up, or analyze
    graph.add_conditional_edges(
        "execute",
        should_retry_or_analyze,
        {"error_handler": "error_handler", "give_up": "give_up", "analyze": "analyze"}
    )

    # After error handler, re-execute
    graph.add_edge("error_handler", "execute")

    # After analysis, visualize
    graph.add_edge("analyze", "visualize")

    # Terminal nodes
    graph.add_edge("visualize", END)
    graph.add_edge("give_up", END)

    return graph.compile()


# Compiled graph instance
app = build_graph()


def run_query(question: str, user_role: str = "ADMIN", user_id: int = 1, store_id: Optional[int] = None, conversation_context: str = "") -> dict:
    """Run the full agent pipeline and return results."""
    initial_state: AgentState = {
        "question": question,
        "user_role": user_role,
        "user_id": user_id,
        "store_id": store_id,
        "conversation_context": conversation_context,
        "is_in_scope": None,
        "is_greeting": None,
        "sql_query": None,
        "query_result": None,
        "error": None,
        "iteration_count": 0,
        "final_answer": None,
        "visualization_code": None,
        "visualization_html": None,
    }

    result = app.invoke(initial_state)

    return {
        "answer": result.get("final_answer", "No answer generated."),
        "question": question,
        "sql_query": result.get("sql_query"),
        "query_result": result.get("query_result"),
        "data": result.get("query_result"),
        "error": result.get("error"),
        "final_answer": result.get("final_answer", "No answer generated."),
        "visualization_html": result.get("visualization_html"),
        "visualization_code": result.get("visualization_code"),
        "is_in_scope": result.get("is_in_scope"),
        "iteration_count": result.get("iteration_count", 0),
    }
