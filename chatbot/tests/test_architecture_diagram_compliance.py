"""Architecture-diagram compliance tests — asserts the compiled LangGraph
matches the 'Multi Agent Chatbot (text 2 SQL) Architecture' figure from the
report (Section: Multi Agent Chatbot Architecture).

Sunumda diyagram aynen koddaki grafa karşılık gelmek zorunda. Bu dosya her
kutuyu (node) ve her oku (edge) diyagram sırasına göre tek tek doğrular,
böylece hoca "diyagramda şu var, kodda var mı?" dediğinde kanıt hazır.
"""
from __future__ import annotations

import pytest

import config
from graph import build_graph


# Diyagramdaki kutulara karşılık gelen LangGraph node isimleri.
DIAGRAM_NODES = {
    "guardrails",      # Guardrail Agent
    "generate_sql",    # SQL Agent
    "execute",         # Execute SQL
    "error_handler",   # Error Agent
    "analyze",         # Analysis Agent
    "decide_graph",    # Decide Graph Need
    "visualize",       # Visualization Agent
    "give_up",         # "max 3 tries" terminal
}

# (source, target, conditional_label_or_None) — diyagramdaki oklar.
DIAGRAM_EDGES = [
    ("__start__", "guardrails", None),                    # UI Query → Guardrail
    ("guardrails", "__end__", "end"),                     # greeting / out-of-scope → UI
    ("guardrails", "generate_sql", None),                 # in-scope → SQL Agent
    ("generate_sql", "execute", None),                    # SQL Agent → Execute SQL
    ("generate_sql", "__end__", "end"),                   # role mismatch / refusal → UI
    ("execute", "error_handler", None),                   # error → Error Agent
    ("execute", "analyze", None),                         # success → Analysis Agent
    ("execute", "give_up", None),                         # max 3 tries → terminal
    ("error_handler", "execute", None),                   # retry → Execute SQL
    ("analyze", "decide_graph", None),                    # Analysis → Decide Graph Need
    ("decide_graph", "visualize", "graph_needed"),        # graph needed → Visualization
    ("decide_graph", "__end__", "no_graph"),              # graph not needed → UI
    ("visualize", "__end__", None),                       # Graph → UI
    ("give_up", "__end__", None),                         # terminal → UI
]


@pytest.fixture(scope="module")
def compiled_graph():
    return build_graph().get_graph()


@pytest.fixture(scope="module")
def edge_set(compiled_graph):
    return {(e.source, e.target, e.data) for e in compiled_graph.edges}


# ---------- Node presence (diagram boxes) ----------


@pytest.mark.parametrize("node", sorted(DIAGRAM_NODES))
def test_diagram_node_exists_in_compiled_graph(node: str, compiled_graph) -> None:
    assert node in compiled_graph.nodes, f"Diagram node '{node}' missing from LangGraph"


def test_entry_point_is_guardrails(edge_set) -> None:
    """UI Query ilk olarak Guardrail Agent'a gider."""
    assert ("__start__", "guardrails", None) in edge_set


# ---------- Edge presence (diagram arrows) ----------


@pytest.mark.parametrize("source,target,label", DIAGRAM_EDGES)
def test_diagram_edge_exists(source: str, target: str, label: str | None, edge_set) -> None:
    assert (source, target, label) in edge_set, (
        f"Diagram edge missing: {source} -> {target} "
        f"(label={label!r}). Have: "
        f"{sorted(e for e in edge_set if e[0] == source)}"
    )


# ---------- Retry budget (diagram says 'retry (max 3)') ----------


def test_max_retries_is_three() -> None:
    """Diyagramdaki 'retry (max 3)' etiketi config.MAX_RETRIES=3 ile eşleşmeli."""
    assert config.MAX_RETRIES == 3, (
        f"Diagram claims 'retry (max 3)' but config.MAX_RETRIES={config.MAX_RETRIES}"
    )


# ---------- UI output channels (diagram left side) ----------


def test_greeting_path_terminates_to_ui(edge_set) -> None:
    """Diyagram: Guardrail → Greetings kutusu (UI). Kodda END'e ulaşır."""
    assert ("guardrails", "__end__", "end") in edge_set


def test_no_graph_path_terminates_to_ui(edge_set) -> None:
    """Diyagram: Decide Graph Need → 'No Graph' (UI). Kodda END'e ulaşır."""
    assert ("decide_graph", "__end__", "no_graph") in edge_set


def test_graph_path_goes_through_visualization_then_ui(edge_set) -> None:
    """Diyagram: Decide Graph Need → Visualization → Graph (UI)."""
    assert ("decide_graph", "visualize", "graph_needed") in edge_set
    assert ("visualize", "__end__", None) in edge_set


# ---------- Single-loop guarantee (Error Agent → Execute SQL only) ----------


def test_error_handler_only_leads_back_to_execute(edge_set) -> None:
    """Diyagram: Error Agent yalnızca Execute SQL'e geri döner, doğrudan UI'a gitmez."""
    error_outgoing = {(s, t, l) for (s, t, l) in edge_set if s == "error_handler"}
    assert error_outgoing == {("error_handler", "execute", None)}, (
        f"error_handler edges diverge from diagram: {error_outgoing}"
    )


# ---------- No hidden/extra edges ----------


def test_no_unexpected_edges_beyond_diagram(edge_set) -> None:
    """Grafiğin gerçekte diyagramdan fazlasını içermediğini (süpriz yok) garanti eder."""
    expected = set(DIAGRAM_EDGES)
    extra = edge_set - expected
    assert not extra, f"Compiled graph has edges not shown in diagram: {sorted(extra)}"
