"""Visualization Agent - generates Plotly charts when beneficial."""
import ast
import json
import re
import signal
import pandas as pd
import plotly
import plotly.graph_objects as go
import plotly.express as px
from state import AgentState
from prompts import AGENT_CONFIGS, VISUALIZATION_PROMPT
from llm import call_llm

# AST node types that are forbidden in generated visualization code
_FORBIDDEN_AST_NODES = (ast.Import, ast.ImportFrom, ast.Global, ast.Nonlocal)


def _validate_code_ast(code: str) -> bool:
    """Validate generated code via AST — reject imports and dangerous constructs."""
    try:
        tree = ast.parse(code)
    except SyntaxError:
        return False
    for node in ast.walk(tree):
        if isinstance(node, _FORBIDDEN_AST_NODES):
            return False
        # Block access to dunder attributes (__builtins__, __class__, __import__)
        if isinstance(node, ast.Attribute) and node.attr.startswith("__"):
            return False
    return True

# Columns that should NEVER be used as chart labels — they're meaningless to users
_ID_COLUMNS = re.compile(r'^(id|order_id|user_id|product_id|store_id|category_id|review_id|shipment_id)$', re.IGNORECASE)
# Columns that represent status/category and are great for aggregation
_STATUS_COLUMNS = re.compile(r'(status|order_status|delivery_status|sentiment|mode|payment_method|membership_type|satisfaction_level|fulfilment|sales_channel)', re.IGNORECASE)
# Columns that represent names — ideal for chart labels
_NAME_COLUMNS = re.compile(r'(name|category|category_name|store_name|product_name|product|customer|first_name|carrier)', re.IGNORECASE)
# Numeric columns that usually represent monetary/business value
_MONEY_COLUMNS = re.compile(
    r'(revenue|sales|spent|amount|grand_total|subtotal|price|cost|income|profit|gmv|aov|value|total(?!.*count))',
    re.IGNORECASE,
)
# Numeric columns that usually represent counts/quantities
_COUNT_COLUMNS = re.compile(r'(count|qty|quantity|orders?|reviews?|num)', re.IGNORECASE)
# Time columns for trend detection
_TIME_COLUMNS = re.compile(r'(date|order_date|review_date|shipped_date|created_at|updated_at|month|order_month|week)', re.IGNORECASE)

# Dark theme matching Flower chatbot design & professor's examples
_DARK_BG = '#1a1a2e'       # Dark navy background
_DARK_PAPER = '#16213e'    # Slightly lighter for paper
_GRID_COLOR = 'rgba(255,255,255,0.1)'  # Subtle grid
_TEXT_COLOR = '#e0e0e0'    # Light text on dark bg
_TITLE_COLOR = '#ffffff'   # White titles

# Vibrant multi-color palette (like professor's examples)
_COLORS = [
    '#2dd4a8', '#66c2ff', '#f4a261', '#e76f7a', '#b088f9',
    '#52d681', '#ffcc66', '#ff6b8a', '#5fbdff', '#a8e063',
    '#ff9ff3', '#48dbfb', '#feca57', '#ff6348', '#c56cf0',
    '#00d2d3', '#f368e0', '#badc58', '#ff7979', '#7efff5',
]
# Status-specific colors (vibrant on dark bg)
_STATUS_COLORS = {
    'DELIVERED': '#2dd4a8', 'COMPLETED': '#2dd4a8',
    'SHIPPED': '#66c2ff', 'IN_TRANSIT': '#66c2ff',
    'CONFIRMED': '#52d681', 'PROCESSING': '#52d681',
    'PENDING': '#f4a261',
    'CANCELLED': '#e76f7a',
}

# Shared dark layout config
def _dark_layout(**overrides):
    """Return a Plotly layout dict with dark Flower theme."""
    layout = dict(
        template='plotly_dark',
        paper_bgcolor=_DARK_BG,
        plot_bgcolor=_DARK_BG,
        font=dict(family='Inter, sans-serif', size=13, color=_TEXT_COLOR),
        title_font=dict(size=16, color=_TITLE_COLOR),
        xaxis=dict(gridcolor=_GRID_COLOR, zerolinecolor=_GRID_COLOR),
        yaxis=dict(gridcolor=_GRID_COLOR, zerolinecolor=_GRID_COLOR),
        margin=dict(l=50, r=30, t=60, b=50),
    )
    layout.update(overrides)
    return layout


def _fmt_val(v, col_name=""):
    """Smart format: $1,234.56 for money columns, plain numbers otherwise."""
    _money_keywords = {'price', 'revenue', 'sales', 'spent', 'total', 'cost',
                       'amount', 'grand_total', 'unit_price', 'subtotal'}
    is_money = any(k in col_name.lower() for k in _money_keywords)
    if is_money:
        return f'${v:,.2f}'
    if isinstance(v, float) and v != int(v):
        return f'{v:.2f}'
    return str(int(v))


def _fallback_label(column: str, question: str = "") -> str:
    """Return a human-readable placeholder for missing categorical labels."""
    col = (column or "").lower()
    q = question.lower()
    shipment_context = any(word in f"{col} {q}" for word in ["shipment", "ship", "delivery"])
    if "status" in col and shipment_context:
        return "No Shipment Yet"
    if "status" in col:
        return "Unknown Status"
    return "Unknown"


def _display_label(value, column: str = "", question: str = "") -> str:
    """Normalize null-ish chart labels so the UI never shows raw None/null."""
    fallback = _fallback_label(column, question)
    if value is None:
        return fallback
    if isinstance(value, str):
        stripped = value.strip()
        if not stripped or stripped.lower() in {"none", "null"}:
            return fallback
        return stripped
    return str(value)


def _is_id_column(col: str) -> bool:
    """Check if a column name looks like a raw ID column."""
    return bool(_ID_COLUMNS.match(col))


def _find_best_label_column(columns: list, rows: list):
    """Find the best column to use as chart labels (names > statuses > others, never IDs)."""
    # Prefer name columns
    for col in columns:
        if _NAME_COLUMNS.search(col) and not _is_id_column(col):
            return col
    # Then status columns
    for col in columns:
        if _STATUS_COLUMNS.search(col):
            return col
    # Then time columns
    for col in columns:
        if _TIME_COLUMNS.search(col):
            return col
    # Then first non-ID string column
    for col in columns:
        if _is_id_column(col):
            continue
        if rows and isinstance(rows[0].get(col), str):
            return col
    # Last resort: first non-ID column
    for col in columns:
        if not _is_id_column(col):
            return col
    return columns[0] if columns else None


def _find_best_value_column(columns: list, rows: list, exclude=None):
    """Find the best numeric column for chart values."""
    numeric_candidates = []
    for col in columns:
        if col == exclude or _is_id_column(col):
            continue
        if rows:
            val = rows[0].get(col)
            try:
                float(val)
                numeric_candidates.append(col)
            except (ValueError, TypeError):
                continue

    for regex in (_MONEY_COLUMNS, _COUNT_COLUMNS):
        for col in numeric_candidates:
            if regex.search(col):
                return col

    return numeric_candidates[0] if numeric_candidates else None


def _should_aggregate_by_status(columns: list, rows: list, question: str):
    """Check if data should be aggregated by a status/category column instead of plotted raw."""
    q = question.lower()
    # If data has many rows and a status column, aggregate
    status_col = None
    for col in columns:
        if _STATUS_COLUMNS.search(col):
            status_col = col
            break
    if status_col and len(rows) > 3:
        return status_col
    # If the question mentions "history", "orders", or "list" and there are ID columns
    if any(w in q for w in ['history', 'order', 'list', 'all my']) and any(_is_id_column(c) for c in columns):
        # Find any status-like column
        for col in columns:
            if _STATUS_COLUMNS.search(col):
                return col
    return None


def _find_secondary_value_column(columns: list, rows: list, exclude=None):
    """Find a second numeric metric, preferring count-like columns for comparisons."""
    numeric_candidates = []
    for col in columns:
        if col == exclude or _is_id_column(col):
            continue
        if rows:
            val = rows[0].get(col)
            try:
                float(val)
                numeric_candidates.append(col)
            except (ValueError, TypeError):
                continue

    for col in numeric_candidates:
        if _COUNT_COLUMNS.search(col):
            return col

    return numeric_candidates[0] if numeric_candidates else None


def _is_single_row_label_metric_result(columns: list, rows: list) -> bool:
    """Return True when a single row still has a label + numeric metric worth charting."""
    if len(rows) != 1 or len(columns) < 2:
        return False

    row = rows[0]
    has_numeric = False
    has_label = False
    for col in columns:
        value = row.get(col)
        try:
            float(value)
            has_numeric = True
        except (TypeError, ValueError):
            has_label = True
    return has_numeric and has_label


def _detect_chart_type(df: pd.DataFrame, columns: list, question: str) -> str:
    """Detect the best chart type based on data shape and question context."""
    q = question.lower()

    # Time series detection
    time_keywords = ["trend", "over time", "weekly", "monthly", "daily", "timeline", "cancellation"]
    if any(k in q for k in time_keywords):
        return "line"

    # Comparison
    if "compare" in q or "comparison" in q or "vs" in q:
        return "grouped_bar"

    # Distribution/proportion questions are clearest as a pie chart when not
    # handled by the status aggregation path.
    if any(w in q for w in ["distribution", "proportion", "percentage"]):
        return "pie"

    # Status/delivery questions stay as sorted bars for readable labels.
    if any(w in q for w in ["status", "delivery", "breakdown"]):
        return "bar"

    # Default: always BAR (like professor's examples)
    return "bar"


def _build_fallback_chart(rows: list, columns: list, question: str):
    """Build a meaningful chart as fallback when LLM-generated code fails."""
    try:
        if len(columns) < 2 or not rows:
            return None

        df = pd.DataFrame(rows)
        q = question.lower()

        # Detect chart type FIRST — this drives the entire logic
        chart_type = _detect_chart_type(df, columns, question)

        # ===== STATUS AGGREGATION (for order history / delivery status) =====
        agg_col = _should_aggregate_by_status(columns, rows, question)
        if agg_col:
            from collections import Counter

            # Detect if query was already aggregated: exactly one row per distinct
            # status value AND no ID-looking columns present. In that case we
            # trust the numeric column as a real count/total. Otherwise the
            # rows represent individual records and we MUST count, never sum.
            distinct_statuses = {_display_label(r.get(agg_col), agg_col, question) for r in rows}
            looks_preaggregated = len(rows) == len(distinct_statuses) and not any(
                _is_id_column(c) for c in columns
            )

            # Candidate numeric columns, explicitly excluding ID columns.
            numeric_cols = [
                c for c in columns
                if c != agg_col
                and not _is_id_column(c)
                and rows
                and isinstance(rows[0].get(c), (int, float))
            ]
            count_col = None
            if looks_preaggregated:
                for c in numeric_cols:
                    cl = c.lower()
                    if any(w in cl for w in ['count', 'num', 'qty']):
                        count_col = c
                        break
                if not count_col and len(numeric_cols) == 1:
                    count_col = numeric_cols[0]

            if count_col:
                # Truly pre-aggregated — use the numeric column directly.
                labels = [_display_label(r.get(agg_col), agg_col, question) for r in rows]
                values = [r.get(count_col, 0) for r in rows]
                paired = sorted(zip(labels, values), key=lambda x: x[1], reverse=True)
                labels = [x[0] for x in paired]
                values = [x[1] for x in paired]
            else:
                # Raw record list — count occurrences per status.
                counts = Counter(_display_label(r.get(agg_col), agg_col, question) for r in rows)
                sorted_items = sorted(counts.items(), key=lambda x: x[1], reverse=True)
                labels = [x[0] for x in sorted_items]
                values = [x[1] for x in sorted_items]

            bar_colors = [_STATUS_COLORS.get(s, '#2dd4a8') for s in labels]

            fig = go.Figure(data=[go.Bar(
                x=labels, y=values,
                marker_color=bar_colors,
                text=values, textposition='outside',
                textfont=dict(color='white', size=14, family='Inter')
            )])
            fig.update_layout(**_dark_layout(
                title=f'Distribution by {_clean_col_name(agg_col)}',
                xaxis_title=_clean_col_name(agg_col),
                yaxis_title='Count'
            ))
            return fig

        # ===== Build a combined name column if first_name + last_name exist =====
        has_first = 'first_name' in columns
        has_last = 'last_name' in columns
        if has_first and has_last:
            for r in rows:
                r['full_name'] = f"{r.get('first_name', '')} {r.get('last_name', '')}".strip()

        # ===== Find best label and value columns =====
        if has_first and has_last:
            label_col = 'full_name'
        else:
            label_col = _find_best_label_column(columns, rows)

        value_col = _find_best_value_column(columns, rows, exclude=label_col)
        if not label_col or not value_col:
            return None

        labels = [_display_label(r.get(label_col), label_col, question) for r in rows[:40]]
        values = [float(r.get(value_col, 0) or 0) for r in rows[:40]]
        secondary_value_col = _find_secondary_value_column(columns, rows, exclude=value_col)

        # ===== BUILD CHART BY TYPE =====
        if chart_type == "line":
            # Sort by label (time) ascending for proper timeline
            paired = sorted(zip(labels, values), key=lambda x: x[0])
            labels = [p[0] for p in paired]
            # Format date labels nicely
            formatted_labels = []
            for lbl in labels:
                try:
                    from datetime import datetime
                    dt = datetime.fromisoformat(str(lbl).replace(' ', 'T').split('+')[0])
                    formatted_labels.append(dt.strftime('%b %Y'))
                except Exception:
                    formatted_labels.append(str(lbl)[:10])
            labels = formatted_labels
            values = [p[1] for p in paired]

            fig = go.Figure(data=[go.Scatter(
                x=labels, y=values, mode='lines+markers',
                line=dict(color='#b088f9', width=3, shape='spline'),
                marker=dict(size=10, color='#b088f9', line=dict(width=2, color='white')),
                fill='tozeroy',
                fillcolor='rgba(176,136,249,0.15)',
                text=[str(int(v)) for v in values],
                textposition='top center',
                textfont=dict(color='white', size=12)
            )])
            fig.update_layout(**_dark_layout(
                title=question[:80],
                xaxis_title='Period',
                yaxis_title=_clean_col_name(value_col)
            ))

        elif chart_type == "horizontal_bar":
            # Sort ascending so highest is at top
            paired = sorted(zip(labels, values), key=lambda x: x[1])
            labels = [p[0] for p in paired]
            values = [p[1] for p in paired]
            chart_height = max(400, len(labels) * 40 + 120)
            fig = go.Figure(data=[go.Bar(
                y=labels, x=values,
                orientation='h',
                marker_color=[_COLORS[i % len(_COLORS)] for i in range(len(labels))],
                text=[_fmt_val(v, value_col) for v in values],
                textposition='outside',
                textfont=dict(color='white', size=12)
            )])
            fig.update_layout(**_dark_layout(
                title=question[:80],
                xaxis_title=_clean_col_name(value_col),
                height=chart_height,
                margin=dict(l=140, r=50, t=60, b=50)
            ))

        elif chart_type == "grouped_bar":
            if secondary_value_col and _COUNT_COLUMNS.search(secondary_value_col):
                secondary_values = [float(r.get(secondary_value_col, 0) or 0) for r in rows[:40]]
                fig = go.Figure()
                fig.add_trace(go.Bar(
                    x=labels,
                    y=values,
                    name=_clean_col_name(value_col),
                    marker_color='#2dd4a8',
                    text=[_fmt_val(v, value_col) for v in values],
                    textposition='outside',
                    textfont=dict(color='white', size=12),
                ))
                fig.add_trace(go.Scatter(
                    x=labels,
                    y=secondary_values,
                    name=_clean_col_name(secondary_value_col),
                    mode='lines+markers',
                    line=dict(color='#66c2ff', width=3),
                    marker=dict(size=10, color='#66c2ff', line=dict(width=2, color='white')),
                    yaxis='y2',
                ))
                fig.update_layout(**_dark_layout(
                    title=question[:80],
                    xaxis_title='Period',
                    yaxis_title=_clean_col_name(value_col),
                    yaxis2=dict(
                        title=_clean_col_name(secondary_value_col),
                        overlaying='y',
                        side='right',
                        gridcolor='rgba(255,255,255,0.0)',
                        zerolinecolor='rgba(255,255,255,0.1)',
                    ),
                    legend=dict(orientation='h', yanchor='bottom', y=1.02, xanchor='right', x=1),
                ))
            else:
                paired = sorted(zip(labels, values), key=lambda x: x[0])
                labels = [p[0] for p in paired]
                # Format date labels
                fmt_labels = []
                for lbl in labels:
                    try:
                        from datetime import datetime
                        dt = datetime.fromisoformat(str(lbl).replace(' ', 'T').split('+')[0])
                        fmt_labels.append(dt.strftime('%b %Y'))
                    except Exception:
                        fmt_labels.append(str(lbl)[:10])
                labels = fmt_labels
                values = [p[1] for p in paired]
                fig = go.Figure(data=[go.Bar(
                    x=labels, y=values,
                    marker_color=[_COLORS[i % len(_COLORS)] for i in range(len(labels))],
                    text=[_fmt_val(v, value_col) for v in values],
                    textposition='outside',
                    textfont=dict(color='white', size=12)
                )])
                fig.update_layout(**_dark_layout(
                    title=question[:80],
                    xaxis_title='Period',
                    yaxis_title=_clean_col_name(value_col)
                ))

        elif chart_type == "pie":
            paired = sorted(zip(labels, values), key=lambda x: x[1], reverse=True)
            labels = [p[0] for p in paired]
            values = [p[1] for p in paired]
            fig = go.Figure(data=[go.Pie(
                labels=labels,
                values=values,
                hole=0.35,
                marker=dict(colors=[_COLORS[i % len(_COLORS)] for i in range(len(labels))]),
                textinfo='label+percent',
                textfont=dict(color='white', size=12),
            )])
            fig.update_layout(**_dark_layout(
                title=question[:80],
                showlegend=True,
                legend=dict(orientation='h', yanchor='bottom', y=-0.18, xanchor='center', x=0.5),
            ))

        else:
            # Default: sorted bar chart (descending) — like professor's Rating Distribution
            paired = sorted(zip(labels, values), key=lambda x: x[1], reverse=True)
            labels = [p[0] for p in paired]
            values = [p[1] for p in paired]

            # Auto-switch to horizontal bar when labels are too many for x-axis
            if len(labels) > 7:
                # Reverse so highest is at top in horizontal layout
                labels = labels[::-1]
                values = values[::-1]
                chart_height = max(400, len(labels) * 40 + 120)
                fig = go.Figure(data=[go.Bar(
                    y=labels, x=values,
                    orientation='h',
                    marker_color=[_COLORS[i % len(_COLORS)] for i in range(len(labels))],
                    text=[_fmt_val(v, value_col) for v in values],
                    textposition='outside',
                    textfont=dict(color='white', size=12)
                )])
                fig.update_layout(**_dark_layout(
                    title=question[:80],
                    xaxis_title=_clean_col_name(value_col),
                    height=chart_height,
                    margin=dict(l=160, r=50, t=60, b=50)
                ))
            else:
                fig = go.Figure(data=[go.Bar(
                    x=labels, y=values,
                    marker_color=[_COLORS[i % len(_COLORS)] for i in range(len(labels))],
                    text=[_fmt_val(v, value_col) for v in values],
                    textposition='outside',
                    textfont=dict(color='white', size=13)
                )])
                fig.update_layout(**_dark_layout(
                    title=question[:80],
                    xaxis_title=_clean_col_name(label_col),
                    yaxis_title=_clean_col_name(value_col),
                    margin=dict(l=50, r=30, t=60, b=80)
                ))

        return fig
    except Exception:
        return None


def _clean_col_name(name: str) -> str:
    """Convert SQL column names like 'ROUND(p.unit_price, 2)' to 'Unit Price'."""
    # Extract inner column from functions: ROUND(p.unit_price, 2) -> unit_price
    match = re.search(r'\((?:\w+\.)?(\w+)', name)
    if match:
        name = match.group(1)
    # Remove table alias prefix: p.unit_price -> unit_price
    if '.' in name:
        name = name.split('.')[-1]
    # Convert snake_case to Title Case: unit_price -> Unit Price
    return name.replace('_', ' ').title()


def _is_fallback_preferred(columns: list, rows: list, question: str) -> bool:
    """Determine if our smart fallback chart should be preferred over LLM-generated code.
    
    Returns True when data has status columns or ID columns that the LLM tends to misuse.
    """
    q = question.lower()
    
    # If data has a status column → our aggregation logic is better
    has_status = any(_STATUS_COLUMNS.search(c) for c in columns)
    has_ids = any(_is_id_column(c) for c in columns)
    has_time = any(_TIME_COLUMNS.search(c) for c in columns)
    has_names = any(_NAME_COLUMNS.search(c) for c in columns)
    has_category = any('categor' in c.lower() for c in columns)
    has_money = any(_MONEY_COLUMNS.search(c) for c in columns)
    has_count = any(_COUNT_COLUMNS.search(c) for c in columns)
    numeric_cols = [
        c for c in columns
        if not _is_id_column(c)
        and rows
        and isinstance(rows[0].get(c), (int, float))
    ]
    
    # Order history / delivery status questions → always use our smart fallback
    if has_status and has_ids:
        return True
    
    # Questions about history, status, distribution → prefer fallback
    if has_status and any(w in q for w in ['history', 'status', 'delivery', 'distribution', 'breakdown']):
        return True
    
    # Trend / time-series questions with date columns → prefer fallback (line chart)
    if has_time and any(w in q for w in ['trend', 'over time', 'monthly', 'weekly', 'cancellation']):
        return True
    
    # Ranking questions (top N) with name columns → prefer fallback (horizontal bar)
    if has_names and any(w in q for w in ['top', 'best', 'worst', 'lowest', 'highest']):
        return True

    # Category sales/revenue breakdowns are safer with deterministic value-column selection.
    if has_category and has_money and len(numeric_cols) > 1 and any(w in q for w in ['sales', 'revenue']):
        return True

    # Single-row label+count outputs should still produce a simple chart.
    if _is_single_row_label_metric_result(columns, rows) and (has_status or has_names or has_count):
        return True

    # Compare questions → prefer fallback
    if any(w in q for w in ['compare', 'vs', 'comparison']):
        return True
    
    return False


def visualization_agent(state: AgentState) -> dict:
    result = state.get("query_result", {})
    rows = result.get("rows", [])
    columns = result.get("columns", [])
    row_count = result.get("row_count", 0)

    if row_count <= 0:
        return {"visualization_code": None, "visualization_html": None}
    if row_count == 1 and len(columns) < 2:
        return {"visualization_code": None, "visualization_html": None}

    # Avoid rendering huge raw charts. Status-like result sets can still be
    # aggregated safely by the deterministic fallback.
    if row_count > 50:
        has_status = any(_STATUS_COLUMNS.search(c) for c in columns)
        if not has_status:
            return {"visualization_code": None, "visualization_html": None}

    # For data with status/ID columns, ALWAYS prefer our smart fallback
    # because the LLM tends to make bad charts (plotting IDs, scattered dots)
    if _is_fallback_preferred(columns, rows, state["question"]):
        fig = _build_fallback_chart(rows, columns, state["question"])
        if fig:
            try:
                html = fig.to_html(include_plotlyjs="cdn", full_html=False)
                return {"visualization_code": "smart_fallback", "visualization_html": html}
            except Exception:
                pass

    display_rows = rows[:20]
    results_str = json.dumps(display_rows, default=str)

    prompt = VISUALIZATION_PROMPT.format(
        question=state["question"],
        row_count=row_count,
        columns=columns,
        results=results_str,
    )

    code = call_llm(
        prompt, max_tokens=800,
        system_prompt=AGENT_CONFIGS["viz_agent"]["system_prompt"]
    ).strip()

    if "NO_VIZ" in code:
        fig = _build_fallback_chart(rows, columns, state["question"])
        if fig:
            try:
                html = fig.to_html(include_plotlyjs="cdn", full_html=False)
                return {"visualization_code": "fallback", "visualization_html": html}
            except Exception:
                pass
        return {"visualization_code": None, "visualization_html": None}

    # Clean markdown code blocks
    if code.startswith("```"):
        lines = code.split("\n")
        code = "\n".join(l for l in lines if not l.startswith("```"))
        code = code.strip()

    # Strip import statements — modules are already in exec_globals
    cleaned_lines = []
    for line in code.split("\n"):
        stripped = line.strip()
        if stripped.startswith("import ") or stripped.startswith("from "):
            continue
        cleaned_lines.append(line)
    code = "\n".join(cleaned_lines)

    # Provide plotly namespace with restricted builtins for security
    from collections import Counter
    _SAFE_BUILTINS = {
        "len": len, "str": str, "float": float, "int": int, "bool": bool,
        "list": list, "dict": dict, "tuple": tuple, "set": set,
        "range": range, "round": round, "abs": abs, "sum": sum,
        "min": min, "max": max, "sorted": sorted, "reversed": reversed,
        "zip": zip, "enumerate": enumerate, "map": map, "filter": filter,
        "isinstance": isinstance, "type": type, "None": None,
        "True": True, "False": False, "print": lambda *a, **k: None,
    }
    exec_globals = {
        "__builtins__": _SAFE_BUILTINS,
        "plotly": plotly,
        "go": go,
        "px": px,
        "json": json,
        "pd": pd,
        "Counter": Counter,
    }

    fig = None
    try:
        # Validate code AST before execution
        if not _validate_code_ast(code):
            fig = _build_fallback_chart(rows, columns, state["question"])
        else:
            local_vars = {"rows": rows, "columns": columns}
            # Set timeout to prevent infinite loops (5 seconds)
            old_handler = signal.getsignal(signal.SIGALRM)
            signal.signal(signal.SIGALRM, lambda s, f: (_ for _ in ()).throw(TimeoutError()))
            signal.alarm(5)
            try:
                exec(code, exec_globals, local_vars)
                fig = local_vars.get("fig")
            finally:
                signal.alarm(0)
                signal.signal(signal.SIGALRM, old_handler)
    except (Exception, TimeoutError):
        # LLM code failed — try fallback chart
        fig = _build_fallback_chart(rows, columns, state["question"])

    if fig is None:
        fig = _build_fallback_chart(rows, columns, state["question"])

    if fig:
        try:
            html = fig.to_html(include_plotlyjs="cdn", full_html=False)
            return {"visualization_code": code, "visualization_html": html}
        except Exception:
            pass

    return {"visualization_code": code, "visualization_html": None}
