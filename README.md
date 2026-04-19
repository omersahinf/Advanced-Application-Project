# E-Commerce Analytics Platform

CSE 214 — Advanced Application Development Final Project.
Spring Boot + Angular + Multi-Agent Text2SQL AI Chatbot (LangGraph + Google Gemini).

## Prerequisites

- Java 17+
- Node.js 18+
- PostgreSQL (recommended) or MySQL
- Python 3.10+ (for chatbot)

## Quick Start

### 1. Backend (Spring Boot)

```bash
cd backend
cp .env.example .env
# Edit .env: set JWT_SECRET (64+ chars), AI_API_KEY (Gemini API key), CHATBOT_API_KEY
./mvnw spring-boot:run
# Runs on http://localhost:8080 with PostgreSQL (SPRING_PROFILE=postgres)
```

### 2. Frontend (Angular)

```bash
cd frontend
npm install
npm start
# Runs on http://localhost:4200 (proxies /api -> localhost:8080)
```

### 3. Chatbot (Python)

```bash
cd chatbot
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env: set OPENAI_API_KEY (your Gemini API key), DATABASE_URL, CHATBOT_API_KEY
python main.py
# Runs on http://localhost:8000
```

### 4. Login

Open http://localhost:4200 and use one of the seeded accounts:

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@example.com` | `password` |
| Corporate | `corporate1@example.com` | `password` |
| Individual | `user1@example.com` | `password` |

## Project Structure

```
backend/                    Spring Boot 3.2.3 (Java 17) — REST API, JWT auth, RBAC
  config/                   SecurityConfig, OpenApiConfig, DataSeeder
  controller/               11 REST controllers (Auth, Product, Order, Cart, Admin, Store, etc.)
  entity/                   11 JPA entities + enums
  service/                  16 services incl. InputValidator.java (security)
  security/                 JwtFilter, JwtUtil, RateLimitFilter, UserPrincipal

frontend/                   Angular 21 — standalone components, signals
  components/               20 components (dashboards, cart, orders, reviews, chatbot, admin)
  services/                 10 HTTP services
  guards/                   authGuard, roleGuard

chatbot/                    Python — LangGraph + FastAPI + Chainlit
  agents/                   6 agents (guardrails, sql_generator, executor, error_handler, analyst, visualizer)
  graph.py                  LangGraph state machine
  main.py                   FastAPI entry point (port 8000)

analytics-platform/         Flask + Plotly BI dashboard (port 8002, optional)
```

## Key Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | No | Login, returns JWT access + refresh tokens |
| POST | `/api/auth/register` | No | Register new user |
| GET | `/api/products` | Yes | Browse products (search, filter, pagination) |
| POST | `/api/orders` | Individual | Place order from cart |
| POST | `/api/payments/create-intent` | Individual | Create Stripe PaymentIntent for an order |
| POST | `/api/payments/confirm` | Individual | Confirm Stripe payment and update order status |
| POST | `/api/chat/ask` | Yes | AI chatbot (proxied to Python LangGraph) |
| POST | `/api/ai/chat` | Yes | Gemini direct fallback (when chatbot is down) |
| GET | `/api/store/my/*` | Corporate | Store management, product CRUD, orders |
| GET | `/api/admin/*` | Admin | User/store management, analytics, audit logs |

## Payment Integration (Stripe)

The platform uses **Stripe Test API** for payment processing:
- **Backend:** `stripe-java` SDK — creates PaymentIntents via `PaymentService.java`
- **Frontend:** Stripe.js Elements — secure card input on the checkout page
- **Flow:** Cart → Place Order (PENDING) → Stripe Checkout → Payment Confirmed (CONFIRMED)
- **Test card:** `4242 4242 4242 4242` — any future expiry, any CVC
- Secret key is **never** exposed to the frontend — all Stripe API calls happen server-side

## AI Integration (Google Gemini)

The entire system uses **Google Gemini API** (`gemini-3-flash-preview`) through OpenAI-compatible endpoints:
- **Chatbot:** Python `openai` SDK with Gemini base URL (`chatbot/config.py`)
- **Backend fallback:** `GeminiService.java` via Spring `WebClient`
- The API key is **never** exposed to the frontend — all AI calls happen server-side

## Security

- **JWT:** HS512-signed, 1h access / 7d refresh, `alg: none` rejected
- **RBAC:** Admin, Corporate, Individual — enforced at URL and method level
- **Rate Limiting:** 20 req/min on `/api/auth/login` and `/api/chat/ask`
- **Three-layer chat defense:** InputValidator.java (regex) -> Guardrails Agent (LLM) -> `_inject_role_filter` (deterministic)
- **Read-only chatbot:** SELECT/WITH only, `TRANSACTION READ ONLY`

See `PROJECT.md` for full architecture, all 12 attack vector mitigations, and the professor's test scenarios.

## Documentation

| File | Purpose |
|------|---------|
| `PROJECT.md` | Complete requirements reference — tech stack, API endpoints, security, feature checklist |
| `DEMO_SCRIPT.md` | 10-minute class presentation script |
| `SECURITY_NOTES.md` | Answers to professor's security questions |
| `docs/ETL_FIELD_MAPPING.md` | Dataset-to-schema mapping |
