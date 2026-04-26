# Demo Screenshot Checklist

Capture these screens before submission and place the PNG files in this folder. These states cover the functional flows that are most likely to be inspected during grading.

| File | Page / State | Test credentials |
|---|---|---|
| `01-login.png` | Login page (default state) | — |
| `02-individual-orders.png` | Individual My Orders page showing cancel/return actions | `user1@example.com` / `123` |
| `03-checkout-stripe.png` | Stripe checkout page with card element | `user1@example.com` / `123` |
| `04-corporate-dashboard.png` | Corporate dashboard with KPIs and sales chart | `corporate1@example.com` / `123` |
| `05-corporate-reviews.png` | Corporate review reply page | `corporate1@example.com` / `123` |
| `06-admin-analytics.png` | Admin analytics page with membership/city/category charts | `admin@example.com` / `123` |
| `07-admin-audit.png` | Admin audit log page | `admin@example.com` / `123` |
| `08-chatbot-individual.png` | Chatbot answering "Show me my last 5 orders" | `user1@example.com` / `123` |
| `09-chatbot-corporate.png` | Chatbot answering "Top 5 products by revenue" | `corporate1@example.com` / `123` |
| `10-chatbot-admin.png` | Chatbot answering "Show platform revenue by month" | `admin@example.com` / `123` |

## How to capture

1. Start backend: `cd backend && JWT_SECRET=local-demo-secret-at-least-64-characters-long-padding-padding ./mvnw spring-boot:run`
2. Start frontend: `cd frontend && npm start`
3. Start chatbot: `cd chatbot && source venv/bin/activate && python main.py`
4. Open http://localhost:4200 and navigate to each page above.
5. Use the OS screenshot tool (macOS: `Cmd+Shift+4`) and save as `01-login.png`, etc.
