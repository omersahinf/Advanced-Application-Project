# Demo Screenshots

Capture these screens before submission and place the PNG files in this folder. File names below are referenced from the main README and grading self-assessment.

| File | Page / State | Test credentials |
|---|---|---|
| `01-login.png` | Login page (default state) | — |
| `02-individual-dashboard.png` | Individual user dashboard with order history | `customer1@demo.com` / `Customer123!` |
| `03-corporate-dashboard.png` | Corporate user dashboard with sales charts | `corp1@demo.com` / `Corp123!` |
| `04-admin-analytics.png` | Admin analytics page (membership donut + city bar chart) | `admin@demo.com` / `Admin123!` |
| `05-chatbot.png` | Chatbot answering "show me my top selling products" with chart + SQL tabs | any role |
| `06-checkout.png` | Stripe checkout page with card element | individual |

## How to capture

1. Start backend: `cd backend && ./mvnw spring-boot:run`
2. Start frontend: `cd frontend && npm start`
3. Start chatbot: `cd chatbot && uvicorn main:app --reload`
4. Open http://localhost:4200 and navigate to each page above.
5. Use the OS screenshot tool (macOS: `Cmd+Shift+4`) and save as `01-login.png`, etc.
