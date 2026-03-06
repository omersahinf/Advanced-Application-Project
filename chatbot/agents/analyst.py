"""Analysis Agent - explains query results in natural language."""
import json
from state import AgentState
from prompts import ANALYSIS_PROMPT
from llm import call_llm
import config


def analysis_agent(state: AgentState) -> dict:
    result = state.get("query_result", {})
    rows = result.get("rows", [])
    columns = result.get("columns", [])
    row_count = result.get("row_count", 0)

    display_rows = rows[:20] if len(rows) > 20 else rows
    results_str = json.dumps(display_rows, default=str, indent=2)

    if config.OPENAI_API_KEY:
        prompt = ANALYSIS_PROMPT.format(
            question=state["question"],
            sql_query=state.get("sql_query", ""),
            row_count=row_count,
            results=results_str,
        )
        answer = call_llm(prompt, max_tokens=300)
        return {"final_answer": answer.strip()}

    # Fallback: generate analysis without LLM
    return {"final_answer": _build_analysis(state["question"], columns, rows, row_count)}


def _build_analysis(question: str, columns: list, rows: list, row_count: int) -> str:
    if not rows:
        return "The query returned no results. This might mean there's no matching data for your question."

    if row_count == 1 and len(columns) <= 3:
        parts = [f"**{col}**: {rows[0].get(col, 'N/A')}" for col in columns]
        return f"Result: {', '.join(parts)}"

    label_col = columns[0]
    value_cols = columns[1:] if len(columns) > 1 else []

    lines = [f"Found **{row_count}** results:\n"]
    for row in rows[:8]:
        label = row.get(label_col, "N/A")
        if value_cols:
            details = []
            for vc in value_cols:
                v = row.get(vc, "N/A")
                if isinstance(v, float):
                    v = f"{v:,.2f}"
                details.append(f"{vc}={v}")
            lines.append(f"  - **{label}** ({', '.join(details)})")
        else:
            lines.append(f"  - {label}")

    if row_count > 8:
        lines.append(f"  ... and {row_count - 8} more rows.")

    # Summary for numeric columns
    for vc in value_cols[:1]:
        try:
            values = [float(r.get(vc, 0)) for r in rows if r.get(vc) is not None]
            if values:
                lines.append(f"\nHighest {vc}: **{rows[0].get(label_col)}** ({values[0]:,.2f})")
        except (ValueError, TypeError):
            pass

    return "\n".join(lines)
