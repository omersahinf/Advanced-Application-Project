"""
Standalone Analytics Platform — Metabase-like BI dashboard.
Connects to the shared PostgreSQL database and provides interactive
Plotly visualizations for cross-store, customer, and sales analytics.

Run: python app.py  (default port 8002)
"""
import os
import json
from datetime import datetime
from dotenv import load_dotenv
from flask import Flask, render_template_string, jsonify
from sqlalchemy import create_engine, text
import plotly
import plotly.graph_objects as go
import plotly.express as px
import pandas as pd

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg2://postgres:postgres@localhost:5432/ecommerce_demo")
PORT = int(os.getenv("ANALYTICS_PORT", "8002"))

engine = create_engine(DATABASE_URL, echo=False)
app = Flask(__name__)


def query_df(sql: str) -> pd.DataFrame:
    """Execute SQL and return a pandas DataFrame."""
    with engine.connect() as conn:
        return pd.read_sql(text(sql), conn)


def to_json(fig) -> str:
    """Convert Plotly figure to JSON for frontend rendering."""
    return json.dumps(fig, cls=plotly.utils.PlotlyJSONEncoder)


# ─────────────────── Chart builders ───────────────────

def build_revenue_by_store():
    df = query_df("""
        SELECT s.name as store, COALESCE(SUM(o.grand_total), 0) as revenue,
               COUNT(o.id) as orders
        FROM stores s LEFT JOIN orders o ON s.id = o.store_id AND o.status != 'CANCELLED'
        GROUP BY s.name ORDER BY revenue DESC
    """)
    fig = px.bar(df, x="store", y="revenue", text="orders",
                 title="Revenue by Store", color="revenue",
                 color_continuous_scale="Blues")
    fig.update_layout(template="plotly_white", xaxis_title="Store", yaxis_title="Revenue ($)")
    return fig


def build_orders_by_status():
    df = query_df("SELECT status, COUNT(*) as count FROM orders GROUP BY status")
    fig = px.pie(df, names="status", values="count", title="Orders by Status",
                 color_discrete_sequence=px.colors.qualitative.Set2)
    fig.update_layout(template="plotly_white")
    return fig


def build_monthly_revenue():
    # Use CAST + SUBSTRING for MySQL/PostgreSQL compatibility
    is_mysql = "mysql" in DATABASE_URL.lower()
    if is_mysql:
        date_expr = "DATE_FORMAT(order_date, '%Y-%m')"
    else:
        date_expr = "TO_CHAR(order_date, 'YYYY-MM')"
    df = query_df(f"""
        SELECT {date_expr} as month, SUM(grand_total) as revenue
        FROM orders WHERE status != 'CANCELLED'
        GROUP BY {date_expr} ORDER BY month
    """)
    fig = px.line(df, x="month", y="revenue", title="Monthly Revenue Trend",
                  markers=True)
    fig.update_layout(template="plotly_white", xaxis_title="Month", yaxis_title="Revenue ($)")
    return fig


def build_top_products():
    df = query_df("""
        SELECT p.name as product, SUM(oi.quantity) as units_sold,
               SUM(oi.price * oi.quantity) as revenue
        FROM order_items oi JOIN products p ON oi.product_id = p.id
        JOIN orders o ON oi.order_id = o.id WHERE o.status != 'CANCELLED'
        GROUP BY p.name ORDER BY revenue DESC LIMIT 10
    """)
    fig = px.bar(df, x="revenue", y="product", orientation="h",
                 title="Top 10 Products by Revenue", text="units_sold",
                 color="revenue", color_continuous_scale="Viridis")
    fig.update_layout(template="plotly_white", yaxis=dict(autorange="reversed"),
                      xaxis_title="Revenue ($)", yaxis_title="")
    return fig


def build_customer_segmentation():
    df = query_df("""
        SELECT membership_type, COUNT(*) as customers,
               ROUND(AVG(total_spend)::numeric, 2) as avg_spend,
               ROUND(AVG(items_purchased)::numeric, 1) as avg_items
        FROM customer_profiles WHERE membership_type IS NOT NULL
        GROUP BY membership_type
    """)
    fig = px.bar(df, x="membership_type", y="customers", text="avg_spend",
                 title="Customer Segmentation by Membership",
                 color="membership_type",
                 color_discrete_map={"GOLD": "#FFD700", "SILVER": "#C0C0C0", "BRONZE": "#CD7F32"})
    fig.update_layout(template="plotly_white", xaxis_title="Membership", yaxis_title="Customers")
    fig.update_traces(texttemplate="Avg $%{text}")
    return fig


def build_review_sentiment():
    df = query_df("""
        SELECT sentiment, COUNT(*) as count, ROUND(AVG(star_rating)::numeric, 1) as avg_rating
        FROM reviews WHERE sentiment IS NOT NULL
        GROUP BY sentiment
    """)
    fig = px.bar(df, x="sentiment", y="count", text="avg_rating",
                 title="Review Sentiment Distribution",
                 color="sentiment",
                 color_discrete_map={"POSITIVE": "#22c55e", "NEUTRAL": "#eab308", "NEGATIVE": "#ef4444"})
    fig.update_layout(template="plotly_white", xaxis_title="Sentiment", yaxis_title="Reviews")
    fig.update_traces(texttemplate="★ %{text}")
    return fig


def build_shipping_performance():
    df = query_df("""
        SELECT mode, status, COUNT(*) as count
        FROM shipments GROUP BY mode, status
    """)
    fig = px.bar(df, x="mode", y="count", color="status",
                 title="Shipping Performance by Mode",
                 barmode="group",
                 color_discrete_sequence=px.colors.qualitative.Safe)
    fig.update_layout(template="plotly_white", xaxis_title="Shipping Mode", yaxis_title="Shipments")
    return fig


def build_city_heatmap():
    df = query_df("""
        SELECT cp.city, COUNT(DISTINCT o.id) as orders, SUM(o.grand_total) as revenue
        FROM customer_profiles cp JOIN orders o ON cp.user_id = o.user_id
        WHERE o.status != 'CANCELLED' AND cp.city IS NOT NULL
        GROUP BY cp.city ORDER BY revenue DESC LIMIT 15
    """)
    fig = px.bar(df, x="city", y="revenue", text="orders",
                 title="Revenue by Customer City (Top 15)",
                 color="revenue", color_continuous_scale="Oranges")
    fig.update_layout(template="plotly_white", xaxis_title="City", yaxis_title="Revenue ($)")
    fig.update_traces(texttemplate="%{text} orders")
    return fig


def get_kpi_data():
    with engine.connect() as conn:
        total_revenue = conn.execute(text(
            "SELECT COALESCE(SUM(grand_total), 0) FROM orders WHERE status != 'CANCELLED'"
        )).scalar()
        total_orders = conn.execute(text("SELECT COUNT(*) FROM orders")).scalar()
        total_customers = conn.execute(text("SELECT COUNT(*) FROM users WHERE role_type = 'INDIVIDUAL'")).scalar()
        total_products = conn.execute(text("SELECT COUNT(*) FROM products")).scalar()
        total_stores = conn.execute(text("SELECT COUNT(*) FROM stores")).scalar()
        avg_order = conn.execute(text(
            "SELECT COALESCE(AVG(grand_total), 0) FROM orders WHERE status != 'CANCELLED'"
        )).scalar()
    return {
        "total_revenue": round(float(total_revenue), 2),
        "total_orders": int(total_orders),
        "total_customers": int(total_customers),
        "total_products": int(total_products),
        "total_stores": int(total_stores),
        "avg_order_value": round(float(avg_order), 2),
    }


# ─────────────────── Routes ───────────────────

@app.route("/")
def dashboard():
    kpi = get_kpi_data()
    charts = {
        "revenue_by_store": to_json(build_revenue_by_store()),
        "orders_by_status": to_json(build_orders_by_status()),
        "monthly_revenue": to_json(build_monthly_revenue()),
        "top_products": to_json(build_top_products()),
        "customer_seg": to_json(build_customer_segmentation()),
        "review_sentiment": to_json(build_review_sentiment()),
        "shipping": to_json(build_shipping_performance()),
        "city_revenue": to_json(build_city_heatmap()),
    }
    return render_template_string(DASHBOARD_HTML, kpi=kpi, charts=charts)


@app.route("/api/kpi")
def api_kpi():
    return jsonify(get_kpi_data())


@app.route("/health")
def health():
    return jsonify({"status": "ok", "service": "analytics-platform"})


# ─────────────────── HTML Template ───────────────────

DASHBOARD_HTML = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>E-Commerce Analytics Platform</title>
    <script src="https://cdn.plot.ly/plotly-2.27.0.min.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f0f2f5; color: #1e293b; }
        .header { background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); color: white; padding: 20px 32px; }
        .header h1 { font-size: 22px; font-weight: 700; }
        .header p { font-size: 13px; opacity: 0.8; margin-top: 4px; }
        .container { max-width: 1400px; margin: 0 auto; padding: 24px; }
        .kpi-row { display: grid; grid-template-columns: repeat(6, 1fr); gap: 16px; margin-bottom: 24px; }
        .kpi-card { background: white; border-radius: 12px; padding: 20px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
        .kpi-card .value { font-size: 28px; font-weight: 700; color: #1e293b; }
        .kpi-card .label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px; }
        .kpi-card.highlight { background: linear-gradient(135deg, #2563eb, #7c3aed); color: white; }
        .kpi-card.highlight .label { color: rgba(255,255,255,0.8); }
        .chart-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
        .chart-card { background: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
        .chart-wide { grid-column: span 2; }
        .chart-card h3 { font-size: 14px; font-weight: 600; color: #475569; margin-bottom: 12px; }
        .footer { text-align: center; padding: 16px; color: #94a3b8; font-size: 12px; }
        @media (max-width: 900px) {
            .kpi-row { grid-template-columns: repeat(3, 1fr); }
            .chart-grid { grid-template-columns: 1fr; }
            .chart-wide { grid-column: span 1; }
        }
        @media (max-width: 600px) {
            .kpi-row { grid-template-columns: repeat(2, 1fr); }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 E-Commerce Analytics Platform</h1>
        <p>Real-time business intelligence dashboard — Connected to shared PostgreSQL database</p>
    </div>
    <div class="container">
        <div class="kpi-row">
            <div class="kpi-card highlight">
                <div class="value">${{ "{:,.2f}".format(kpi.total_revenue) }}</div>
                <div class="label">Total Revenue</div>
            </div>
            <div class="kpi-card">
                <div class="value">{{ kpi.total_orders }}</div>
                <div class="label">Total Orders</div>
            </div>
            <div class="kpi-card">
                <div class="value">{{ kpi.total_customers }}</div>
                <div class="label">Customers</div>
            </div>
            <div class="kpi-card">
                <div class="value">{{ kpi.total_products }}</div>
                <div class="label">Products</div>
            </div>
            <div class="kpi-card">
                <div class="value">{{ kpi.total_stores }}</div>
                <div class="label">Stores</div>
            </div>
            <div class="kpi-card">
                <div class="value">${{ "{:,.2f}".format(kpi.avg_order_value) }}</div>
                <div class="label">Avg Order Value</div>
            </div>
        </div>

        <div class="chart-grid">
            <div class="chart-card chart-wide">
                <h3>Monthly Revenue Trend</h3>
                <div id="monthly_revenue"></div>
            </div>
            <div class="chart-card">
                <h3>Revenue by Store</h3>
                <div id="revenue_by_store"></div>
            </div>
            <div class="chart-card">
                <h3>Orders by Status</h3>
                <div id="orders_by_status"></div>
            </div>
            <div class="chart-card">
                <h3>Top 10 Products</h3>
                <div id="top_products"></div>
            </div>
            <div class="chart-card">
                <h3>Customer Segmentation</h3>
                <div id="customer_seg"></div>
            </div>
            <div class="chart-card">
                <h3>Review Sentiment</h3>
                <div id="review_sentiment"></div>
            </div>
            <div class="chart-card">
                <h3>Shipping Performance</h3>
                <div id="shipping"></div>
            </div>
            <div class="chart-card chart-wide">
                <h3>Revenue by Customer City</h3>
                <div id="city_revenue"></div>
            </div>
        </div>
    </div>
    <div class="footer">
        E-Commerce Analytics Platform v1.0 &mdash; Powered by Flask + Plotly + PostgreSQL
    </div>
    <script>
        const config = {responsive: true, displayModeBar: false};
        {% for chart_id, chart_data in charts.items() %}
        Plotly.newPlot('{{ chart_id }}', {{ chart_data | safe }}.data, {{ chart_data | safe }}.layout, config);
        {% endfor %}
    </script>
</body>
</html>
"""

if __name__ == "__main__":
    print(f"Analytics Platform running at http://127.0.0.1:{PORT}")
    app.run(host="0.0.0.0", port=PORT, debug=False)
