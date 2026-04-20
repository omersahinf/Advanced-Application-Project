# E-Commerce Analytics Platform

CSE 214 — Advanced Application Development Final Project.
Full-stack e-commerce platform with role-based dashboards (Admin / Corporate / Individual), a Stripe-backed checkout flow, and a natural-language analytics chatbot built as a multi-agent LangGraph pipeline over Google Gemini.

**Stack:** Spring Boot 3 + Angular 21 + Python (LangGraph / FastAPI / Chainlit) + PostgreSQL.

## Prerequisites

- Java 17+
- Node.js 18+
- PostgreSQL 14+ (MySQL also supported)
- Python 3.10+ (for the chatbot)

## Quick Start

### 1. Backend (Spring Boot)

```bash
cd backend
cp .env.example .env
# Edit .env: JWT_SECRET (64+ chars), AI_API_KEY (Gemini), CHATBOT_API_KEY, STRIPE_SECRET_KEY
./mvnw spring-boot:run
# http://localhost:8080  (profile: postgres)
```

### 2. Frontend (Angular)

```bash
cd frontend
npm install
npm start
# http://localhost:4200  (proxies /api -> localhost:8080)
```

### 3. Chatbot (Python)

```bash
cd chatbot
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env: OPENAI_API_KEY (Gemini), DATABASE_URL, CHATBOT_API_KEY
python main.py
# http://localhost:8000
```

### 4. Login

Open http://localhost:4200 and sign in with a seeded account:

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@example.com` | `password` |
| Corporate | `corporate1@example.com` | `password` |
| Individual | `user1@example.com` | `password` |

## Project Structure

```
backend/                    Spring Boot 3 (Java 17) — REST API, JWT, RBAC
  config/                   SecurityConfig, OpenApiConfig, DataSeeder
  controller/               13 REST controllers
  entity/                   14 JPA entities + 4 enum status types
  service/                  Business logic, validation, Stripe, Gemini fallback
  security/                 JwtFilter, JwtUtil, RateLimitFilter, UserPrincipal
  exception/                Custom exceptions + GlobalExceptionHandler

frontend/                   Angular 21 — standalone components, signals, Flower design system
  components/               25 components across admin / corporate / individual surfaces
  services/                 HTTP services (auth, cart, orders, products, dashboard, chat, ...)
  guards/                   authGuard, roleGuard
  interceptors/             auth.interceptor (JWT + global error handling)
  shared/                   Design-system primitives (kpi-card, status-pill, flower-logo, bouqbot-avatar)

chatbot/                    Python — LangGraph state machine + FastAPI
  agents/                   guardrails, sql_generator, executor, error_handler, analyst, visualizer
  graph.py                  Multi-agent pipeline
  main.py                   FastAPI entry point

analytics-platform/         Flask + Plotly BI dashboard (optional, port 8002)
```

## Key Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | No | Login, returns JWT access + refresh tokens |
| POST | `/api/auth/register` | No | Register individual user |
| POST | `/api/auth/refresh` | No | Exchange refresh token for new access token |
| GET | `/api/products` | Yes | Browse products (search, filter, pagination, sort) |
| POST | `/api/cart/items` | Individual | Add item to cart |
| POST | `/api/orders` | Individual | Place order from cart |
| POST | `/api/payments/create-intent` | Individual | Create Stripe PaymentIntent |
| POST | `/api/payments/confirm` | Individual | Confirm Stripe payment |
| POST | `/api/chat/ask` | Yes | Analytics chatbot (proxied to LangGraph) |
| GET | `/api/store/my/*` | Corporate | Store + product + order management |
| GET | `/api/admin/*` | Admin | Users, stores, analytics, audit logs, settings |

Full OpenAPI schema at `http://localhost:8080/swagger-ui.html`.

## Payment Integration (Stripe)

- **Backend:** `stripe-java` SDK — creates PaymentIntents in `PaymentService`.
- **Frontend:** Stripe.js Elements for secure card input on checkout.
- **Flow:** Cart → Order (PENDING) → Stripe → Order (CONFIRMED).
- **Test card:** `4242 4242 4242 4242`, any future expiry, any CVC.
- Secret key is server-side only.

## AI Integration (Google Gemini)

- Chatbot uses the `openai` Python SDK against Gemini's OpenAI-compatible endpoint.
- Backend provides `GeminiService` via Spring `WebClient` as a fallback when the chatbot is offline.
- API keys are server-side only and loaded from environment variables.

## Security Highlights

- **JWT:** HS512-signed, 1h access / 7d refresh; `alg: none` rejected.
- **RBAC:** Admin / Corporate / Individual roles enforced at URL and method level (`@PreAuthorize`).
- **Rate limiting:** 20 req/min on `/api/auth/login` and `/api/chat/ask`.
- **Input validation:** Boundary validation on all controllers; server-authoritative cart/order totals.
- **Chatbot defense-in-depth:**
  - Regex-based input validator
  - LLM guardrails agent (intent + OOS filtering)
  - Deterministic `_inject_role_filter` on every generated SQL
  - Read-only transaction: `SELECT` / `WITH` only, multi-statement and comment-stripped
- **Headers:** HSTS, X-Content-Type-Options, X-Frame-Options, strict Referrer-Policy.

## Testing

- **Backend:** JUnit 5 + Mockito + MockMvc + Testcontainers — service, controller, and integration tests.
- **Frontend:** Vitest + jsdom — service and model specs.
- **Chatbot:** pytest — guardrails, SQL validation, role isolation, XSS regression, dataset compatibility.

```bash
# Backend
cd backend && ./mvnw test

# Frontend
cd frontend && npm test

# Chatbot
cd chatbot && pytest
```

## Documentation

| File | Purpose |
|------|---------|
| `docs/ETL_FIELD_MAPPING.md` | Kaggle dataset → schema field mapping for seeded data |
| `docs/database-smoke-test.sh` | Quick DB connectivity check |

## Repository

https://github.com/omersahinf/Advanced-Application-Project
