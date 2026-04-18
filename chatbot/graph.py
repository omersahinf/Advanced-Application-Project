"""LangGraph workflow - orchestrates all agents in a state machine."""
from typing import Iterator, Optional
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


def decide_graph_need(state: AgentState) -> str:
    """Decide whether a visualization is needed based on the query results.

    This node sits between Analysis and Visualization in the flow,
    matching the architecture diagram's 'Decide Graph Need' decision point.
    """
    result = state.get("query_result", {})
    row_count = result.get("row_count", 0)

    # Scalar results or single rows don't need charts
    if row_count <= 1:
        return "no_graph"

    # Too many rows makes charts unreadable
    if row_count > 50:
        return "no_graph"

    # Check if there are at least 2 columns (label + value) for meaningful viz
    columns = result.get("columns", [])
    if len(columns) < 2:
        return "no_graph"

    return "graph_needed"


def decide_graph_need_node(state: AgentState) -> dict:
    """Passthrough node for the graph need decision point."""
    return {"current_step": "decide_graph_need"}


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
    graph.add_node("decide_graph", decide_graph_need_node)
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

    # After analysis, decide if graph is needed
    graph.add_edge("analyze", "decide_graph")

    # Conditional: after decide_graph, either visualize or end
    graph.add_conditional_edges(
        "decide_graph",
        decide_graph_need,
        {"graph_needed": "visualize", "no_graph": END}
    )

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
        "current_step": None,
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
        "is_greeting": result.get("is_greeting"),
        "iteration_count": result.get("iteration_count", 0),
    }


# Human-readable labels for streaming step events.
STEP_LABELS = {
    "guardrails":     {"icon": "🔒", "label": "Guardrails Check"},
    "generate_sql":   {"icon": "🔧", "label": "SQL Generation"},
    "execute":        {"icon": "⚡", "label": "Query Execution"},
    "error_handler":  {"icon": "⚠️", "label": "Error Handler"},
    "analyze":        {"icon": "📊", "label": "Analysis"},
    "decide_graph":   {"icon": "🤔", "label": "Decide Graph Need"},
    "visualize":      {"icon": "📈", "label": "Visualization"},
    "give_up":        {"icon": "🛑", "label": "Give Up"},
}


def _summarize_step(node_name: str, node_state: dict) -> dict:
    """Extract user-facing payload from a node's state update."""
    payload: dict = {}
    if node_name == "guardrails":
        payload["is_in_scope"] = node_state.get("is_in_scope")
        payload["is_greeting"] = node_state.get("is_greeting")
    elif node_name == "generate_sql":
        payload["sql_query"] = node_state.get("sql_query")
    elif node_name == "execute":
        qr = node_state.get("query_result") or {}
        payload["row_count"] = qr.get("row_count")
        payload["columns"] = qr.get("columns")
        if node_state.get("error"):
            payload["error"] = node_state["error"]
    elif node_name == "error_handler":
        payload["sql_query"] = node_state.get("sql_query")
        payload["iteration_count"] = node_state.get("iteration_count")
    elif node_name == "analyze":
        answer = node_state.get("final_answer")
        payload["preview"] = (answer[:200] + "…") if answer and len(answer) > 200 else answer
    elif node_name == "visualize":
        payload["has_chart"] = bool(node_state.get("visualization_html"))
    return payload


def run_query_stream(question: str, user_role: str = "ADMIN", user_id: int = 1,
                     store_id: Optional[int] = None,
                     conversation_context: str = "") -> Iterator[dict]:
    """Run the pipeline and yield step events as each agent finishes.

    Yields dicts like:
        {"step": "guardrails",   "status": "done", "label": "...", "icon": "🔒", "payload": {...}}
        {"step": "final",        "status": "done", "payload": {<full result>}}
    """
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
        "current_step": None,
    }

    merged: dict = dict(initial_state)

    for update in app.stream(initial_state, stream_mode="updates"):
        # `update` is a dict: {node_name: partial_state}
        for node_name, partial in update.items():
            if not isinstance(partial, dict):
                continue
            merged.update(partial)
            meta = STEP_LABELS.get(node_name, {"icon": "•", "label": node_name})
            yield {
                "step": node_name,
                "status": "done",
                "icon": meta["icon"],
                "label": meta["label"],
                "payload": _summarize_step(node_name, partial),
            }

    # Final consolidated event
    yield {
        "step": "final",
        "status": "done",
        "payload": {
            "answer": merged.get("final_answer", "No answer generated."),
            "question": question,
            "sql_query": merged.get("sql_query"),
            "query_result": merged.get("query_result"),
            "data": merged.get("query_result"),
            "error": merged.get("error"),
            "final_answer": merged.get("final_answer", "No answer generated."),
            "visualization_html": merged.get("visualization_html"),
            "visualization_code": merged.get("visualization_code"),
            "is_in_scope": merged.get("is_in_scope"),
            "is_greeting": merged.get("is_greeting"),
            "iteration_count": merged.get("iteration_count", 0),
        },
    }
