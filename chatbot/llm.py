"""LLM wrapper - supports OpenAI-compatible APIs."""
from openai import OpenAI
import config

_client = None


def get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(
            api_key=config.OPENAI_API_KEY,
            base_url=config.OPENAI_BASE_URL,
        )
    return _client


def call_llm(prompt: str, max_tokens: int = 300, temperature: float = 0.1) -> str:
    """Call the LLM with a prompt and return the response text."""
    if not config.OPENAI_API_KEY:
        return _fallback_response(prompt)

    try:
        client = get_client()
        response = client.chat.completions.create(
            model=config.LLM_MODEL,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=max_tokens,
            temperature=temperature,
        )
        return response.choices[0].message.content or ""
    except Exception as e:
        print(f"LLM error: {e}")
        return _fallback_response(prompt)


def _fallback_response(prompt: str) -> str:
    """Rule-based fallback when no API key is available."""
    p = prompt.lower()

    # Guardrails classification
    if "classify" in p or "GREETING" in prompt or "one word" in p:
        greetings = ["hello", "hi ", "hey", "good morning", "good afternoon",
                     "good evening", "selam", "merhaba", "howdy"]
        question_text = p.split("user message:")[-1].strip() if "user message:" in p else p
        if any(g in question_text for g in greetings):
            return "GREETING"
        ecommerce_keywords = ["product", "order", "sale", "revenue", "customer", "review",
                              "shipment", "store", "stock", "price", "category", "total",
                              "average", "count", "how many", "rating", "spend", "delivery",
                              "ship", "buy", "sell", "income", "profit", "inventory",
                              "discount", "payment", "refund",
                              "second", "third", "highest", "lowest", "more", "detail",
                              "about that", "about the", "show me", "tell me"]
        if any(k in question_text for k in ecommerce_keywords):
            return "IN_SCOPE"
        return "OUT_OF_SCOPE"

    # Analysis - check BEFORE SQL since analysis prompt also contains SQL
    if "data analyst" in p or "explain the query results" in p:
        return _generate_fallback_analysis(prompt)

    # Visualization
    if "plotly" in p or "determine if a visualization" in p:
        return _generate_fallback_viz(prompt)

    # SQL generation
    if "sql expert" in p or "generate" in p and "select" in p.upper():
        return _generate_fallback_sql(prompt)

    # Error handler
    if "fix the sql" in p or "produced an error" in p:
        return _generate_fallback_sql(prompt)

    return "I processed your request."


def _generate_fallback_analysis(prompt: str) -> str:
    """Generate a natural language summary from query results."""
    import json
    p = prompt.lower()

    # Extract the question
    question = ""
    if "user's question:" in p:
        start = p.index("user's question:") + len("user's question:")
        end = p.index("\n", start) if "\n" in p[start:] else len(p)
        question = p[start:end].strip()

    # Extract row count
    row_count = "some"
    if "rows)" in p:
        idx = p.index("rows)")
        chunk = p[max(0, idx-10):idx]
        nums = [c for c in chunk.split() if c.isdigit()]
        if nums:
            row_count = nums[-1]

    # Try to parse results from prompt
    try:
        results_start = prompt.index("Results (")
        colon_pos = prompt.index(":", results_start)
        results_str = prompt[colon_pos+1:].strip()
        data = json.loads(results_str)
        if isinstance(data, list) and data:
            keys = list(data[0].keys())
            if len(data) == 1:
                vals = [f"{k}: {data[0][k]}" for k in keys]
                return f"The query returned a single result: {', '.join(vals)}."
            if len(keys) >= 2:
                name_col = keys[0]
                val_col = keys[-1]
                items = [f"{row.get(name_col, 'N/A')}: {row.get(val_col, 'N/A')}" for row in data[:5]]
                result = f"Here are the results for your query about {question}:\n"
                result += "\n".join(f"  - {item}" for item in items)
                if len(data) > 5:
                    result += f"\n  ... and {len(data) - 5} more."
                return result
    except (ValueError, json.JSONDecodeError, IndexError, KeyError):
        pass

    return f"The query returned {row_count} rows of data. Please see the data table for details."


def _generate_fallback_viz(prompt: str) -> str:
    """Generate Plotly code based on the data shape."""
    import json
    p = prompt.lower()

    try:
        results_start = prompt.index("Results (")
        colon_pos = prompt.index(":", results_start)
        rest = prompt[colon_pos+1:].strip()
        paren_end = rest.index(")")
        rest = rest[paren_end+2:].strip()
        data = json.loads(rest)
        if not isinstance(data, list) or len(data) < 2:
            return "NO_VIZ"

        keys = list(data[0].keys())
        if len(keys) < 2:
            return "NO_VIZ"

        label_col = keys[0]
        value_col = keys[-1]
        labels = [str(r.get(label_col, "")) for r in data]
        values = [r.get(value_col, 0) for r in data]

        return f"""import plotly.graph_objects as go
fig = go.Figure(data=[go.Bar(x={labels}, y={values})])
fig.update_layout(
    title='{label_col} by {value_col}',
    xaxis_title='{label_col}',
    yaxis_title='{value_col}',
    template='plotly_white'
)"""
    except (ValueError, json.JSONDecodeError, IndexError):
        pass

    return "NO_VIZ"


def _generate_fallback_sql(prompt: str) -> str:
    """Generate basic SQL from common question patterns."""
    p = prompt.lower()

    # Extract only the user's current question (not conversation history)
    question = p
    if "new question:" in p:
        idx = p.index("new question:") + len("new question:")
        question = p[idx:].strip()
    elif "user question:" in p:
        idx = p.index("user question:") + len("user question:")
        question = p[idx:].strip()

    # Handle follow-up references using conversation history
    has_history = "conversation history" in p or "previous conversation" in p
    if has_history and ("second" in question or "next" in question or "another" in question or "more" in question):
        # Extract previous SQL from context (may be multi-line)
        prev_sql = ""
        if "sql used:" in p:
            sql_start = p.index("sql used:") + len("sql used:")
            # Find the end: look for "result:" which follows the SQL
            if "result:" in p[sql_start:]:
                sql_end = p.index("result:", sql_start)
            else:
                sql_end = p.index("\n", sql_start) if "\n" in p[sql_start:] else len(p)
            prev_sql = prompt[sql_start:sql_end].strip()
        if prev_sql:
            if "second" in question:
                return prev_sql + " LIMIT 1 OFFSET 1"
            if "third" in question:
                return prev_sql + " LIMIT 1 OFFSET 2"
            return prev_sql

    if "total revenue" in question and "store" not in question:
        return "SELECT ROUND(SUM(grand_total), 2) as total_revenue FROM orders WHERE status != 'CANCELLED'"
    if ("revenue" in question and "store" in question) or "store performance" in question:
        return """SELECT s.name as store_name, ROUND(SUM(o.grand_total), 2) as revenue, COUNT(o.id) as order_count
FROM stores s JOIN orders o ON s.id = o.store_id WHERE o.status != 'CANCELLED'
GROUP BY s.name ORDER BY revenue DESC"""
    if "top product" in question or "best selling" in question or "best-selling" in question:
        return """SELECT p.name, COUNT(oi.id) as times_ordered, ROUND(SUM(oi.price * oi.quantity), 2) as total_revenue
FROM order_items oi JOIN products p ON oi.product_id = p.id
JOIN orders o ON oi.order_id = o.id WHERE o.status != 'CANCELLED'
GROUP BY p.name ORDER BY total_revenue DESC LIMIT 10"""
    if "order" in question and "status" in question:
        return "SELECT status, COUNT(*) as order_count FROM orders GROUP BY status ORDER BY order_count DESC"
    if "average rating" in question or "avg rating" in question:
        return "SELECT ROUND(AVG(star_rating), 2) as avg_rating, COUNT(*) as total_reviews FROM reviews"
    if ("rating" in question or "review" in question) and "product" in question:
        return """SELECT p.name as product, ROUND(AVG(r.star_rating), 2) as avg_rating, COUNT(r.id) as review_count
FROM reviews r JOIN products p ON r.product_id = p.id
GROUP BY p.name ORDER BY avg_rating DESC"""
    if "low stock" in question or "low-stock" in question:
        return """SELECT p.name, p.stock, s.name as store_name
FROM products p JOIN stores s ON p.store_id = s.id
WHERE p.stock < 15 ORDER BY p.stock ASC"""
    if "customer" in question and ("city" in question or "location" in question):
        return "SELECT city, COUNT(*) as customer_count, ROUND(AVG(total_spend), 2) as avg_spend FROM customer_profiles GROUP BY city ORDER BY customer_count DESC"
    if "spend" in question and "category" in question:
        return """SELECT c.name as category, ROUND(SUM(oi.price * oi.quantity), 2) as total_spend
FROM order_items oi JOIN products p ON oi.product_id = p.id
JOIN categories c ON p.category_id = c.id
JOIN orders o ON oi.order_id = o.id WHERE o.status != 'CANCELLED'
GROUP BY c.name ORDER BY total_spend DESC"""
    if "sentiment" in question:
        return "SELECT sentiment, COUNT(*) as review_count FROM reviews GROUP BY sentiment ORDER BY review_count DESC"
    if "product" in question and ("list" in question or "all" in question or "show" in question):
        return """SELECT p.name, p.unit_price, p.stock, c.name as category, s.name as store
FROM products p LEFT JOIN categories c ON p.category_id = c.id
JOIN stores s ON p.store_id = s.id ORDER BY p.name LIMIT 20"""
    if "order" in question:
        return """SELECT o.id, u.first_name || ' ' || u.last_name as customer, s.name as store,
o.status, ROUND(o.grand_total, 2) as total, o.payment_method, o.order_date
FROM orders o JOIN users u ON o.user_id = u.id JOIN stores s ON o.store_id = s.id
ORDER BY o.order_date DESC LIMIT 20"""
    if "revenue" in question or "sales" in question or "income" in question:
        return "SELECT ROUND(SUM(grand_total), 2) as total_revenue, COUNT(*) as total_orders FROM orders WHERE status != 'CANCELLED'"
    if "product" in question:
        return """SELECT p.name, p.unit_price, p.stock, c.name as category, s.name as store
FROM products p LEFT JOIN categories c ON p.category_id = c.id
JOIN stores s ON p.store_id = s.id ORDER BY p.unit_price DESC LIMIT 20"""

    return "SELECT COUNT(*) as total_orders, ROUND(SUM(grand_total), 2) as total_revenue FROM orders WHERE status != 'CANCELLED'"
