# E-Commerce Analytics Platform

CSE 214 — Advanced Application Development Final Project.

A full-stack e-commerce application with three role-specific surfaces (Admin / Corporate / Individual), a Stripe-backed checkout flow, and a natural-language analytics chatbot built as a multi-agent LangGraph pipeline over Google Gemini.

**Stack:** Spring Boot 3 + Angular 21 + Python (LangGraph / FastAPI / Chainlit) + PostgreSQL (H2 also supported for a one-command demo).

**Repo:** https://github.com/omersahinf/Advanced-Application-Project

---

## Prerequisites

- Java 17+
- Node.js 18+
- Python 3.10+ (for the chatbot)
- PostgreSQL 14+ _(optional — H2 in-memory is the default profile and needs no setup)_
- A Google Gemini API key (for the chatbot and the backend Gemini fallback)
- A Stripe test account (for the checkout flow)

---

## Quick Start

The three services are independent. Minimum to demo the UI end-to-end: **backend + frontend**. Add the chatbot service for the analytics chat feature.

### 1. Backend (Spring Boot, port 8080)

```bash
cd backend
cp .env.example .env
# Required in .env:
#   JWT_SECRET            64+ random chars for HS512 signing
#   AI_API_KEY            Google Gemini API key (server-side Gemini fallback)
#   CHATBOT_API_KEY       Shared secret between backend and chatbot service
#   STRIPE_SECRET_KEY     Stripe test secret key (sk_test_...)
#   STRIPE_PUBLISHABLE_KEY  Stripe test publishable key (pk_test_...)

# Default profile is H2 in-memory — no DB install required:
./mvnw spring-boot:run

# Or use PostgreSQL:
#   createdb ecommerce_demo
#   SPRING_PROFILE=postgres ./mvnw spring-boot:run
```

On startup, `DataSeeder` populates the DB with 1 admin, 4 corporate, and 20 individual users plus categories, products, orders, reviews, shipments, and audit logs.

### 2. Frontend (Angular, port 4200)

```bash
cd frontend
npm install
npm start
# http://localhost:4200  — proxies /api -> http://localhost:8080
```

### 3. Chatbot (Python / FastAPI, port 8000)

```bash
cd chatbot
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Required in .env:
#   OPENAI_API_KEY        Google Gemini API key (same one is fine)
#   CHATBOT_API_KEY       MUST MATCH the backend's CHATBOT_API_KEY
#   DATABASE_URL          sqlite:///./ecommerce.db (default, standalone mode)
#                         or postgresql+psycopg2://... to share the backend DB

python main.py
# http://localhost:8000
```

### 4. Analytics BI dashboard (optional, Flask + Plotly, port 8002)

```bash
cd analytics-platform
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python app.py
```

### 5. Login

Open http://localhost:4200 and sign in with any seeded account. **Every seeded user has the same password: `123`.**

| Role | Example email | Password |
|------|---------------|----------|
| Admin | `admin@example.com` | `123` |
| Corporate | `corporate1@example.com` … `corporate4@example.com` | `123` |
| Individual | `user1@example.com` … `user20@example.com` | `123` |

Registration on the login page creates a new individual user.

---

## Project Structure

```
backend/                    Spring Boot 3 (Java 17)
  config/                   SecurityConfig, OpenApiConfig, DataSeeder
  controller/               13 REST controllers
  entity/                   14 JPA entities + 4 enum status types (OrderStatus, StoreStatus,
                            ShipmentStatus, Sentiment) + RoleType, MembershipType
  service/                  Business logic, Stripe, Gemini fallback, audit, export,
                            input validation
  security/                 JwtFilter, JwtUtil, RateLimitFilter, UserPrincipal
  exception/                BadRequest, Unauthorized, ResourceNotFound, Export +
                            GlobalExceptionHandler
  src/test/java/            Service, controller and integration tests

frontend/                   Angular 21 — standalone components + signals + Flower design system
  components/               25 components across admin / corporate / individual surfaces
                            (dashboards, orders, reviews, stores, categories, analytics,
                            audit, settings, cart, checkout, profile, product-list/detail,
                            chatbot, navbar, top-header, login, ...)
  services/                 HTTP services (auth, products, cart, orders, reviews,
                            dashboard, chat, admin, store, category, ...)
  guards/                   authGuard, roleGuard
  interceptors/             auth.interceptor (JWT + global HTTP error handling)
  shared/                   Design-system primitives (kpi-card, status-pill,
                            flower-logo, bouqbot-avatar)
  styles/                   Tokens, typography, global styles

chatbot/                    Python — multi-agent LangGraph pipeline + FastAPI
  agents/                   guardrails, sql_generator, executor (database.py),
                            error_handler, analyst, visualizer
  graph.py                  Multi-agent state machine
  main.py                   FastAPI entry point (/ask, session context, rate limits)
  chainlit_app.py           Optional Chainlit UI
  tests/                    guardrails, SQL security, role isolation, XSS regression,
                            dataset compatibility, graph flow, example interactions

analytics-platform/         Flask + Plotly BI dashboard (optional)

docs/
  ETL_FIELD_MAPPING.md       6-Kaggle-dataset → schema field mapping
  database-smoke-test.sh     DB connectivity check
```

---

## Key Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | — | Register a new individual user |
| POST | `/api/auth/login` | — | Login, returns access + refresh JWTs |
| POST | `/api/auth/refresh` | — | Exchange a refresh token for a new access token |
| GET | `/api/auth/me` | Yes | Current user info |
| GET | `/api/products` | Yes | Browse products (search, filter, sort, pagination) |
| GET | `/api/products/{id}` | Yes | Product detail |
| POST | `/api/cart/items` | Individual | Add item to cart |
| GET | `/api/cart` | Individual | Current cart |
| POST | `/api/orders` | Individual | Place order from cart |
| GET | `/api/orders/my` | Individual | Order history (CSV export supported) |
| POST | `/api/payments/create-intent` | Individual | Create Stripe PaymentIntent for an order |
| POST | `/api/payments/confirm` | Individual | Confirm Stripe payment, mark order CONFIRMED |
| POST | `/api/reviews` | Individual | Post a product review |
| GET | `/api/store/my/*` | Corporate | Store CRUD, product CRUD, orders, reviews, shipments |
| GET | `/api/admin/*` | Admin | Users, stores, categories, analytics, audit logs, settings |
| POST | `/api/chat/ask` | Yes | Analytics chatbot (proxied to FastAPI on :8000) |
| POST | `/api/ai/chat` | Yes | Direct Gemini fallback when the chatbot is offline |

Full OpenAPI schema: `http://localhost:8080/swagger-ui.html`.

---

## Payment Integration (Stripe)

- **Backend:** `stripe-java` SDK — `PaymentService` creates PaymentIntents and confirms payments.
- **Frontend:** Stripe.js Elements for PCI-safe card input on the checkout page.
- **Flow:** Cart → Place Order (`PENDING`) → Stripe Elements → Confirm → Order (`CONFIRMED`).
- **Test card:** `4242 4242 4242 4242`, any future expiry, any CVC, any ZIP.
- The Stripe secret key lives only on the backend; the frontend receives the publishable key and client secret.

---

## AI Integration (Google Gemini)

- **Chatbot service** uses the Python `openai` SDK against Gemini's OpenAI-compatible endpoint:
  `https://generativelanguage.googleapis.com/v1beta/openai/`, model `gemini-3-flash-preview`.
- **Backend fallback:** `GeminiService` (Spring `WebClient`) answers `/api/ai/chat` when the chatbot service is offline.
- All API keys are server-side only and loaded from environment variables.

---

## Security Highlights

- **JWT:** HS512-signed, 1 hour access / 7 day refresh. `alg: none` and unsigned tokens are rejected. `JWT_SECRET` is mandatory — the backend refuses to start without it.
- **RBAC:** `ADMIN`, `CORPORATE`, `INDIVIDUAL`. Enforced both at URL level (`SecurityConfig`) and at method level (`@PreAuthorize`).
- **Rate limiting:** `RateLimitFilter` applies 20 requests/minute per IP on `/api/auth/login` and `/api/chat/ask`.
- **Input validation:** Boundary validation on every controller; server recomputes cart totals, order amounts, and review ownership — the client is never trusted for authoritative values.
- **Chatbot defense-in-depth (three layers):**
  1. Python regex input validator — blocks obvious injection patterns, length-capped.
  2. LLM guardrails agent — intent + out-of-scope + schema-leak filtering.
  3. Deterministic `_inject_role_filter` — role-scoped WHERE clause injected into every generated SQL.
  - Execution is `SELECT` / `WITH` only, wrapped in `TRANSACTION READ ONLY`, with multi-statement and comment stripping, and UNION/INTERSECT/EXCEPT banned.
- **Audit log:** Admin and sensitive actions are written to the `audit_log` table and exposed through the Admin Audit page.
- **HTTP headers:** HSTS, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, strict Referrer-Policy, narrow Permissions-Policy.

---

## Testing

```bash
# Backend (JUnit 5 + Mockito + MockMvc + Testcontainers)
cd backend
JWT_SECRET=ci-test-secret-at-least-64-characters-long-padding-padding-padding ./mvnw test

# Frontend (Vitest + jsdom)
cd frontend
npx vitest run

# Chatbot role-scope/security regression tests
cd chatbot
source venv/bin/activate
python -m pytest -q tests/test_sql_generator.py tests/test_role_based_access.py
```

Coverage includes:
- Backend: `AuthServiceTest`, `OrderServiceTest`, `ProductControllerTest`, `AuthFlowIntegrationTest`.
- Frontend: `auth.service.spec.ts`, `chat.service.spec.ts`, `product.model.spec.ts`.
- Chatbot: guardrails, SQL security, role isolation, XSS regression, dataset compatibility, graph flow, example interactions, architecture-diagram compliance.

---

## Environment Reference

| Variable | Service | Purpose |
|----------|---------|---------|
| `JWT_SECRET` | backend | HS512 signing secret (required, 64+ chars) |
| `AI_API_KEY` | backend | Gemini key for `/api/ai/chat` fallback |
| `CHATBOT_API_KEY` | backend + chatbot | Shared secret between backend and chatbot |
| `CHATBOT_URL` | backend | Chatbot service URL (default `http://127.0.0.1:8000`) |
| `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY` | backend | Stripe test keys |
| `SPRING_PROFILE` | backend | `h2` (default) or `postgres` |
| `DB_URL` / `DB_USERNAME` / `DB_PASSWORD` | backend | PostgreSQL connection (postgres profile) |
| `OPENAI_API_KEY` | chatbot | Gemini key via OpenAI-compatible endpoint |
| `OPENAI_BASE_URL` | chatbot | Gemini OpenAI-compatible base URL |
| `LLM_MODEL` | chatbot | Default `gemini-3-flash-preview` |
| `DATABASE_URL` | chatbot | `sqlite:///...` (standalone) or `postgresql+psycopg2://...` (shared) |
| `USE_SHARED_DB` | chatbot | `true` to read from the backend's PostgreSQL |
| `ANALYTICS_PORT` | analytics-platform | Flask port (default 8002) |

---

## Run with Docker

The whole stack runs with one command — Postgres + backend + chatbot + frontend (Nginx).
`JWT_SECRET` is required and must be at least 64 characters because backend tokens are signed with HS512.

```bash
cp .env.example .env
# Required: set JWT_SECRET to a 64+ character random value.
# Also fill AI_API_KEY / STRIPE_* for chatbot and checkout demos.
docker compose up --build
```

Services:

| Service | URL | Container |
|---|---|---|
| Frontend | http://localhost | `ecom-frontend` (Nginx → Angular bundle, proxies `/api` and `/chat`) |
| Backend | http://localhost:8080 | `ecom-backend` (Spring Boot, profile `postgres`) |
| Chatbot | http://localhost:8000 | `ecom-chatbot` (FastAPI + LangGraph, shared DB) |
| Postgres | localhost:5432 | `ecom-postgres` (volume `postgres-data`) |

Tear down: `docker compose down` (add `-v` to drop the DB volume).

## Kubernetes

Reference manifests in [`k8s/`](k8s/) — StatefulSet for Postgres, Deployments + Services for backend/chatbot/frontend, and an Ingress that routes `/api` → backend, `/chat` → chatbot, `/` → frontend. See [`k8s/README.md`](k8s/README.md) for apply order and Secret seeding.

## CI/CD

GitHub Actions workflow at [`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on every push and PR to `main`:

1. **Backend** — `./mvnw compile`, `./mvnw test`, JaCoCo report uploaded as artifact, `./mvnw package`.
2. **Frontend** — `npm ci`, `npm run build`, `npx vitest run`.
3. **Chatbot** — `pip install`, Python syntax check, SQL generator / role-scope regression tests.
4. **Docker** — buildx-builds all three images (`backend`, `chatbot`, `frontend`).

## Architecture

| Document | Purpose |
|------|---------|
| [`docs/architecture/system-architecture.md`](docs/architecture/system-architecture.md) | High-level component diagram, request flows, security layers |
| [`docs/architecture/er-diagram.md`](docs/architecture/er-diagram.md) | Entity-relationship model, normalization notes, indexes |
| [`docs/screenshots/`](docs/screenshots/) | Demo screenshots (login, dashboards, chatbot) |

## Documentation

| File | Purpose |
|------|---------|
| `docs/ETL_FIELD_MAPPING.md` | How the six Kaggle datasets map onto the JPA schema and seeded data |
| `docs/database-smoke-test.sh` | Quick PostgreSQL connectivity + schema check |
| `docs/grading-self-assessment.md` | Rubric self-assessment with file:line evidence |
