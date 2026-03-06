"""Chainlit UI - standalone web chat interface for the chatbot."""
try:
    import chainlit as cl
    from graph import run_query
    from seed_data import seed

    seed()

    @cl.on_chat_start
    async def start():
        cl.user_session.set("role", "ADMIN")
        cl.user_session.set("user_id", 1)
        cl.user_session.set("store_id", None)
        await cl.Message(
            content="Welcome to the **E-Commerce Analytics Chatbot**!\n\n"
                    "I can help you query and analyze your e-commerce data. "
                    "Ask me about products, orders, sales, customers, or reviews.\n\n"
                    "Current role: **ADMIN** (full access)"
        ).send()


    @cl.on_message
    async def on_message(message: cl.Message):
        role = cl.user_session.get("role", "ADMIN")
        user_id = cl.user_session.get("user_id", 1)
        store_id = cl.user_session.get("store_id")

        # Role switching via command
        text = message.content.strip()
        if text.startswith("/role"):
            parts = text.split()
            if len(parts) >= 2:
                new_role = parts[1].upper()
                if new_role in ("ADMIN", "CORPORATE", "INDIVIDUAL"):
                    cl.user_session.set("role", new_role)
                    if new_role == "CORPORATE":
                        cl.user_session.set("store_id", int(parts[2]) if len(parts) > 2 else 1)
                    if new_role == "INDIVIDUAL":
                        cl.user_session.set("user_id", int(parts[2]) if len(parts) > 2 else 4)
                    await cl.Message(content=f"Role switched to **{new_role}**").send()
                    return
            await cl.Message(content="Usage: `/role ADMIN|CORPORATE|INDIVIDUAL [id]`").send()
            return

        result = run_query(text, role, user_id, store_id)

        response_parts = [result["answer"]]

        if result.get("sql_query"):
            response_parts.append(f"\n\n**SQL:**\n```sql\n{result['sql_query']}\n```")

        if result.get("data") and result["data"].get("rows"):
            rows = result["data"]["rows"]
            cols = result["data"]["columns"]
            if rows and len(rows) <= 20:
                header = " | ".join(str(c) for c in cols)
                sep = " | ".join("---" for _ in cols)
                body = "\n".join(" | ".join(str(r.get(c, "")) for c in cols) for r in rows)
                response_parts.append(f"\n\n**Data:**\n| {header} |\n| {sep} |\n| " +
                                      body.replace("\n", " |\n| ") + " |")

        await cl.Message(content="\n".join(response_parts)).send()

        if result.get("visualization_html"):
            from chainlit.element import Html
            await cl.Message(
                content="",
                elements=[Html(name="chart", content=result["visualization_html"], display="inline")]
            ).send()

except ImportError:
    print("Chainlit not installed. Install with: pip install chainlit")
    print("Run with: chainlit run chainlit_app.py")
