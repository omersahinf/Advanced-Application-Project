# Demo Screenshot Checklist

Capture these screens before submission and place the PNG files in this folder. These states cover the functional flows that are most likely to be inspected during grading.

| File | Page / State | Test credentials |
|---|---|---|
| `login.png` | Login page (default state) | — |
| `individual-orders.png` | Individual My Orders page showing cancel/return actions | `user1@example.com` / `123` |
| `checkout-stripe.png` | Stripe checkout page with card element | `user1@example.com` / `123` |
| `corporate-dashboard.png` | Corporate dashboard with KPIs and sales chart | `corporate1@example.com` / `123` |
| `corporate-reviews.png` | Corporate review reply page | `corporate1@example.com` / `123` |
| `admin-analytics.png` | Admin analytics overview | `admin@example.com` / `123` |
| `admin-analytics-2.png` | Admin analytics secondary chart state | `admin@example.com` / `123` |
| `admin-analytics-3.png` | Admin analytics tertiary chart state | `admin@example.com` / `123` |
| `admin-audit.png` | Admin audit log page | `admin@example.com` / `123` |
| `chatbot-individual.png` | Chatbot answering an individual-scoped query | `user1@example.com` / `123` |
| `chatbot-corporate.png` | Chatbot answering a corporate-scoped query | `corporate1@example.com` / `123` |
| `chatbot-admin.png` | Chatbot answering an admin-scoped query | `admin@example.com` / `123` |

## How to capture

1. Start backend: `cd backend && JWT_SECRET=local-demo-secret-at-least-64-characters-long-padding-padding ./mvnw spring-boot:run`
2. Start frontend: `cd frontend && npm start`
3. Start chatbot: `cd chatbot && source venv/bin/activate && python main.py`
4. Open http://localhost:4200 and navigate to each page above.
5. Use the OS screenshot tool (macOS: `Cmd+Shift+4`) and save using the file names above.
