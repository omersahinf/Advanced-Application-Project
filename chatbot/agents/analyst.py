"""Analysis Agent - explains query results in natural language."""
import json
import pandas as pd
from state import AgentState
from prompts import AGENT_CONFIGS, ANALYSIS_PROMPT
from llm import call_llm
import config

# Phrases that indicate the LLM returned a generic/fallback response
_FALLBACK_INDICATORS = [
    "please see the data table",
    "i processed your request",
    "the query returned some rows",
    "the query returned",
]


def analysis_agent(state: AgentState) -> dict:
    result = state.get("query_result", {})
    rows = result.get("rows", [])
    columns = result.get("columns", [])
    row_count = result.get("row_count", 0)

    # ── Programmatic order listing: bypass LLM for order lists ──
    if "order_id" in columns and rows and row_count > 0:
        answer = _format_order_listing(rows, columns, row_count, state.get("user_role", "ADMIN"))
        if answer:
            return {"final_answer": answer}

    display_rows = rows[:20] if len(rows) > 20 else rows
    results_str = json.dumps(display_rows, default=str, indent=2)

    if config.OPENAI_API_KEY:
        prompt = ANALYSIS_PROMPT.format(
            question=state["question"],
            sql_query=state.get("sql_query", ""),
            row_count=row_count,
            results=results_str,
            user_role=state.get("user_role", "ADMIN"),
        )
        answer = call_llm(
            prompt, max_tokens=1024,
            system_prompt=AGENT_CONFIGS["analysis_agent"]["system_prompt"]
        )

        # Check if the LLM gave a real analysis or fell back to generic response
        answer_lower = answer.strip().lower()
        is_fallback = any(fb in answer_lower for fb in _FALLBACK_INDICATORS)

        if answer and not is_fallback and len(answer.strip()) > 20:
            return {"final_answer": answer.strip()}

        # LLM returned generic fallback — use our own Pandas-based analysis
        print("[Analysis] LLM returned generic fallback, using Pandas analysis")

    # Fallback: generate analysis without LLM using Pandas
    return {"final_answer": _build_analysis(state["question"], columns, rows, row_count)}


_PAYMENT_LABELS = {
    "CREDIT_CARD": "Credit Card",
    "DEBIT_CARD": "Debit Card",
    "PAYPAL": "PayPal",
    "BANK_TRANSFER": "Bank Transfer",
    "COD": "Cash on Delivery",
    "STRIPE": "Credit Card (Stripe)",
}


def _format_order_listing(rows: list, columns: list, row_count: int, role: str) -> str:
    """Format order listing results as individual bullet points."""
    lines = []
    prefix = "your store" if role == "CORPORATE" else "your"
    lines.append(f"Here are {prefix} last **{row_count}** orders:\n")

    for row in rows:
        oid = row.get("order_id", "?")
        date_raw = str(row.get("order_date", ""))
        # Format date nicely: "Apr 20, 2026"
        try:
            from datetime import datetime
            # Handle various formats: "2026-04-20T14:01:28" or "2026-04-20 14:01:28.901452"
            dt_str = date_raw.split(".")[0]  # strip microseconds
            for fmt in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d"):
                try:
                    dt = datetime.strptime(dt_str, fmt)
                    date_raw = dt.strftime("%b %d, %Y")
                    break
                except ValueError:
                    continue
        except Exception:
            if "T" in date_raw:
                date_raw = date_raw.split("T")[0]
        status = row.get("order_status") or row.get("status", "UNKNOWN")
        delivery_status = row.get("delivery_status")
        tracking_number = row.get("tracking_number")
        carrier = row.get("carrier")
        total = row.get("grand_total", 0)
        payment = row.get("payment_method", "")
        payment_label = _PAYMENT_LABELS.get(payment, payment)

        # Format total as currency
        try:
            total_fmt = f"${float(total):,.2f}"
        except (ValueError, TypeError):
            total_fmt = f"${total}"

        delivery_parts = []
        if delivery_status:
            delivery_parts.append(f"Delivery: {delivery_status}")
        if tracking_number:
            tracking = str(tracking_number)
            if carrier:
                tracking += f" via {carrier}"
            delivery_parts.append(f"Tracking: {tracking}")

        details = f"{status} — {total_fmt} ({payment_label})"
        if delivery_parts:
            details += " — " + " · ".join(delivery_parts)

        lines.append(f"• **Order #{oid}** — {date_raw} — {details}")

    return "\n".join(lines)


def _build_analysis(question: str, columns: list, rows: list, row_count: int) -> str:
    if not rows:
        return "The query returned no results. This might mean there's no matching data for your question."

    # Convert to pandas DataFrame for richer analysis
    df = pd.DataFrame(rows)

    # Single scalar result
    if row_count == 1 and len(columns) <= 3:
        parts = [f"**{col}**: {rows[0].get(col, 'N/A')}" for col in columns]
        return f"Result: {', '.join(parts)}"

    label_col = columns[0]
    value_cols = columns[1:] if len(columns) > 1 else []

    lines = [f"Found **{row_count}** results:\n"]
    for row in rows[:10]:
        label = row.get(label_col, "N/A")
        if value_cols:
            details = []
            for vc in value_cols[:3]:  # Show max 3 value columns per row
                v = row.get(vc, "N/A")
                if isinstance(v, (int, float)):
                    v = f"{v:,.2f}" if isinstance(v, float) else f"{v:,}"
                details.append(f"{vc}: {v}")
            lines.append(f"  • **{label}** — {', '.join(details)}")
        else:
            lines.append(f"  • {label}")

    if row_count > 10:
        lines.append(f"\n  _...and {row_count - 10} more rows._")

    # Summary statistics for numeric columns using Pandas
    numeric_summaries = []
    for vc in value_cols[:2]:
        if vc in df.columns:
            try:
                numeric_col = pd.to_numeric(df[vc], errors='coerce').dropna()
                if not numeric_col.empty and len(numeric_col) > 1:
                    top_idx = numeric_col.idxmax()
                    top_label = rows[top_idx].get(label_col, "N/A") if top_idx < len(rows) else "N/A"
                    numeric_summaries.append(
                        f"**{vc}** — Highest: {top_label} ({numeric_col.max():,.2f}), "
                        f"Average: {numeric_col.mean():,.2f}, Total: {numeric_col.sum():,.2f}"
                    )
            except (ValueError, TypeError, IndexError):
                pass

    if numeric_summaries:
        lines.append("\n**Key Insights:**")
        for s in numeric_summaries:
            lines.append(f"  📊 {s}")

    return "\n".join(lines)
