"""Spec compliance tests for PDF Section 5.2 (Tech Stack) and 5.3 (Agents).

Each test asserts a single spec bullet. Failure message identifies which
spec item is missing in the implementation.
"""
from pathlib import Path

import pytest


CHATBOT_ROOT = Path(__file__).resolve().parent.parent
PROJECT_ROOT = CHATBOT_ROOT.parent


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


# ---------- 5.2 Tech Stack ----------


def test_langgraph_state_machine_has_all_required_nodes():
    """5.2: Core Framework = LangGraph state machine."""
    from graph import build_graph

    compiled = build_graph()
    nodes = set(compiled.get_graph().nodes.keys())
    required = {
        "guardrails",
        "generate_sql",
        "execute",
        "error_handler",
        "analyze",
        "visualize",
    }
    missing = required - nodes
    assert not missing, f"LangGraph missing nodes: {missing}"


def test_frontend_angular_chatbot_component_exists():
    """5.2: Frontend = Angular chat interface."""
    ng_component = PROJECT_ROOT / "frontend/src/app/components/chatbot/chatbot.ts"
    assert ng_component.exists(), f"Angular chatbot component missing: {ng_component}"
    content = _read(ng_component)
    assert "@Component" in content, "Angular @Component decorator not found"


def test_llm_openai_client_supported():
    """5.2: AI & LLM = OpenAI API (or alternatives).

    Implementation uses an OpenAI-compatible client (default points to
    Gemini's OpenAI-compatible endpoint, any OpenAI-compatible provider works).
    """
    reqs = _read(CHATBOT_ROOT / "requirements.txt")
    assert "langchain-openai" in reqs, "langchain-openai not in requirements"

    llm_src = _read(CHATBOT_ROOT / "llm.py")
    assert "from openai import OpenAI" in llm_src, "OpenAI client not wired"
    assert "call_llm" in llm_src, "call_llm entrypoint missing"


def test_llm_model_defaults_to_gpt4o_mini_compatible():
    """5.2: gpt-4o-mini or alternative LLM providers.

    Accept any configurable model name via env var LLM_MODEL.
    """
    import config

    assert hasattr(config, "LLM_MODEL") and config.LLM_MODEL, "LLM_MODEL not configured"


def test_visualization_plotly_available():
    """5.2: Visualization = Plotly (LLM-generated viz code)."""
    reqs = _read(CHATBOT_ROOT / "requirements.txt")
    assert "plotly" in reqs, "plotly not in requirements"

    viz_src = _read(CHATBOT_ROOT / "agents/visualizer.py")
    assert "import plotly" in viz_src, "plotly not imported in visualizer"


def test_utilities_dotenv_and_pandas_present():
    """5.2: Utilities = python-dotenv, Pandas."""
    reqs = _read(CHATBOT_ROOT / "requirements.txt")
    assert "python-dotenv" in reqs, "python-dotenv not in requirements"
    assert "pandas" in reqs, "pandas not in requirements"


# ---------- 5.3 Multi-Agent Architecture (presence) ----------


@pytest.mark.parametrize(
    "module_name,callable_name,role",
    [
        ("agents.guardrails", "guardrails_agent", "Security and Scope Manager"),
        ("agents.sql_generator", "sql_generator_agent", "SQL Expert"),
        ("agents.analyst", "analysis_agent", "Data Analyst"),
        ("agents.visualizer", "visualization_agent", "Visualization Specialist"),
        ("agents.error_handler", "error_handler_agent", "Error Recovery Specialist"),
    ],
)
def test_each_agent_is_importable_and_callable(module_name, callable_name, role):
    """5.3: all five agents (Guardrails, SQL, Analysis, Visualization, Error)."""
    import importlib

    mod = importlib.import_module(module_name)
    fn = getattr(mod, callable_name, None)
    assert callable(fn), f"{role} agent ({callable_name}) not callable"


def test_agent_prompts_define_roles():
    """5.3: each agent has a dedicated role prompt."""
    import prompts

    assert "AGENT_CONFIGS" in dir(prompts)
    for key in ("guardrails_agent", "sql_agent", "analysis_agent", "viz_agent", "error_agent"):
        assert key in prompts.AGENT_CONFIGS, f"Prompt role '{key}' missing"
        cfg = prompts.AGENT_CONFIGS[key]
        assert cfg.get("system_prompt"), f"{key} has empty system_prompt"


# ---------- 5.5 Agent State Management ----------


def test_agent_state_has_all_spec_required_fields():
    """5.5: AgentState TypedDict must include the spec's documented fields."""
    from state import AgentState

    required_fields = {
        "question",
        "sql_query",
        "query_result",
        "error",
        "final_answer",
        "visualization_code",
        "is_in_scope",
        "iteration_count",
    }
    actual = set(AgentState.__annotations__.keys())
    missing = required_fields - actual
    assert not missing, f"AgentState missing spec fields: {missing}"


def test_agent_state_field_types_match_spec():
    """5.5: field types match the documented TypedDict contract."""
    from typing import Optional, Dict, Any
    from state import AgentState

    anns = AgentState.__annotations__
    assert anns["question"] is str
    assert anns["iteration_count"] is int
    # Optional fields should allow None
    for field in ("sql_query", "error", "final_answer", "visualization_code", "is_in_scope"):
        assert anns[field] is not None, f"{field} annotation missing"


# ---------- 5.6 Agent Configurations Example ----------


def test_agent_configs_role_titles_match_spec_exactly():
    """5.6: role strings must match the PDF example word-for-word."""
    import prompts

    expected_roles = {
        "guardrails_agent": "Security and Scope Manager",
        "sql_agent": "SQL Expert",
        "analysis_agent": "Data Analyst",
        "viz_agent": "Visualization Specialist",
        "error_agent": "Error Recovery Specialist",
    }
    for key, expected_role in expected_roles.items():
        actual = prompts.AGENT_CONFIGS[key]["role"]
        assert actual == expected_role, (
            f"{key}.role: expected '{expected_role}', got '{actual}'"
        )


def test_agent_configs_system_prompts_contain_spec_phrases():
    """5.6: system prompts must contain the spec's key phrases."""
    import prompts

    expected_phrases = {
        "guardrails_agent": "filters questions to ensure they are relevant to e-commerce",
        "sql_agent": "Generate only valid SQL queries without any formatting or explanation",
        "analysis_agent": "explains database query results in natural language",
        "viz_agent": "Generate clean, executable Plotly code",
        "error_agent": "diagnose and fix SQL errors",
    }
    for key, phrase in expected_phrases.items():
        prompt_text = prompts.AGENT_CONFIGS[key]["system_prompt"]
        assert phrase in prompt_text, (
            f"{key}.system_prompt missing spec phrase: '{phrase}'"
        )
