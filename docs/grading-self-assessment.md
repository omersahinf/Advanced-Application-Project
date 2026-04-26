# Grading Criteria Self-Assessment

This document maps the project against the rubric in Section 7 of the assignment, with concrete file-line evidence per criterion.

## Summary Table

| # | Criteria | Weight | Evidence Coverage | Estimated Score |
|---|---|---|---|---|
| 1 | Database Design & Data Integration | 20% | Strong | **18 / 20** |
| 2 | Backend Implementation (Spring Boot) | 25% | Strong | **23 / 25** |
| 3 | Frontend Implementation (Angular) | 20% | Solid | **17 / 20** |
| 4 | AI Chatbot & Multi-Agent Integration | 20% | Strong | **18 / 20** |
| 5 | Documentation & Presentation | 10% | Strong | **9 / 10** |
| 6 | Code Quality & Best Practices | 5% | Solid | **4 / 5** |
| **Total** | | **100%** | | **~89 / 100** |

---

## 1. Database Design & Data Integration (20%)

**Key evaluation points: Normalization, relationships, ETL quality.**

- **18 JPA entities, fully 3NF**, see `backend/src/main/java/com/demo/ecommerce/entity/`:
  - `User`, `CustomerProfile`, `Store`, `Category`, `Product`, `Order`, `OrderItem`, `Shipment`, `Review`, `CartItem`, `AuditLog`, `SystemSetting`, plus enum types (`OrderStatus`, `ShipmentStatus`, `Sentiment`, `MembershipType`, `RoleType`, `StoreStatus`).
- **Relationships** (see `docs/architecture/er-diagram.md`):
  - `User` 1—1 `CustomerProfile`, 1—N `Order`, 1—N `Review`, 1—N `Store` (CORPORATE owners).
  - `Order` 1—N `OrderItem` (junction), 1—1 `Shipment`.
  - `Category` self-referencing parent for hierarchy.
- **Index strategy** (`Order.java:10-16`, `Product.java:10-15`, `Review.java:7-12`): composite indexes on `(user_id, order_date)`, `(store_id, order_date)`, plus single-column indexes on FK + status fields used by dashboards.
- **Data integrity**: `CHECK (stock >= 0)`, `CHECK (star_rating BETWEEN 1 AND 5)`, `CHECK (grand_total >= 0)`, `CHECK (cost_price IS NULL OR cost_price >= 0)`.
- **Audit fields**: `created_at` + `updated_at` with `@PrePersist`/`@PreUpdate` lifecycle hooks on `Order.java`, `Product.java`, `Review.java`.
- **ETL** (`backend/src/main/java/.../config/DataSeeder.java`, 411 lines): seeds 6 Kaggle-style datasets — 25 users, 4 stores, 44 products across categories, ~80–100 orders with order items + shipments + payments, ~100+ reviews with sentiment classification. Mapping documented in `docs/ETL_FIELD_MAPPING.md`.

---

## 2. Backend Implementation — Spring Boot (25%)

**Key evaluation points: API design, security, code quality.**

### REST API Design
- 13 controllers under `backend/src/main/java/.../controller/`: `AuthController`, `ProductController`, `OrderController`, `CartController`, `CheckoutController`, `ReviewController`, `ShipmentController`, `StoreController`, `CategoryController`, `PaymentController`, `AdminController`, `DashboardController`, `AiChatController`, `CustomerProfileController`.
- Endpoints follow REST conventions: `GET /api/products?search=...&page=...`, `POST /api/orders`, `PUT /api/orders/{id}/status`, etc.
- **OpenAPI/Swagger** auto-generated via `springdoc-openapi-starter-webmvc-ui` 2.3.0 (`pom.xml:65-68`), available at `/swagger-ui.html`.
- **DTOs everywhere** with `@Valid`: `LoginRequest`, `CreateOrderRequest`, `OrderDto`, `ProductDto`, etc.

### Security
- **JWT** (`security/JwtUtil.java`, `security/JwtFilter.java`):
  - HS512 with `JWT_SECRET` env var.
  - 1h access + 7d refresh tokens.
  - Claims: `userId`, `email`, `role` (server-set, tamper-proof via signature).
  - Delivered as **HttpOnly + Secure + SameSite=Strict** cookies (`AuthController.java:121-128`).
- **Spring Security config** (`config/SecurityConfig.java`):
  - Role-based `hasAuthority("ADMIN" | "CORPORATE" | "INDIVIDUAL")`.
  - Stateless sessions; CSRF disabled (correct for JWT).
  - Public whitelist: `/api/auth/*`, `/swagger-ui/*`, `/api-docs/*`.
  - **Custom 401/403 JSON handlers**, **CORS** with env-driven origins, **`RateLimitFilter`** registered.
- **BCrypt** password hashing.
- **Input validation**: `InputValidator.java` regex defenses against XSS/SQLi vectors; `@NotNull`, `@NotBlank`, `@Email`, `@Size` on DTOs.
- **Global exception handler** (`exception/GlobalExceptionHandler.java`): maps domain exceptions → safe HTTP responses without leaking internals.

### Code Quality
- Constructor injection across all services (`AuthService`, `OrderService`, `DashboardService`, ...).
- Layered: Controller → Service → Repository.
- Domain exceptions: `ResourceNotFoundException`, `AuthenticationException`, `BadRequestException`, `UnauthorizedOperationException`.
- **Tests**: 10+ test classes including `AuthServiceTest`, `OrderServiceTest`, `InputValidatorTest`, `JwtFilterTest`, `AuthFlowIntegrationTest`, plus 5 controller tests.
- **JaCoCo** coverage plugin configured (`pom.xml`); run `./mvnw verify` to generate `target/site/jacoco/index.html`.

---

## 3. Frontend Implementation — Angular (20%)

**Key evaluation points: UI/UX, responsiveness, visualization.**

- **Angular 21.1** standalone components + signals + lazy-loaded routes (`frontend/src/app/app.routes.ts`).
- **25+ components** organized by role (admin / corporate / individual) plus shared `components/` (chatbot, design system primitives).
- **Auth flow**: `authGuard`, `roleGuard('ADMIN'|'CORPORATE'|'INDIVIDUAL')`, `auth.interceptor.ts` for JWT injection + error mapping.
- **Visualization** (Chart.js 4.5):
  - Admin analytics (`admin-analytics.ts`): donut chart "Customers by membership", bar chart "Customers by city", bar chart "Top categories".
  - Corporate dashboard: sales-over-time + product breakdown.
  - Individual dashboard: order history table + spending summary.
- **Responsive** (`styles/responsive.scss`): mobile-first breakpoints 480/768/1024/1280, mixins (`sm-up`, `md-up`, ...), grid utilities. Dedicated tests in `styles.responsive.spec.ts`.
- **UX**: loading states (`loading()` signal + `aria-busy`), inline error messages, Stripe Elements integration in checkout.
- **Accessibility**: `aria-label` on send/copy/download buttons in chatbot composer (`chatbot.html`), input labels, role-based navigation.
- **Design system**: Flower-themed primitives, dual-theme-ready SCSS tokens, `prettier` configured (printWidth 100, single-quote).

---

## 4. AI Chatbot & Multi-Agent Integration (20%)

**Key evaluation points: Query accuracy, agent coordination, UX, error handling.**

- **Six-agent LangGraph state machine** (`chatbot/graph.py`):
  1. **Guardrails** (`agents/guardrails.py`) — prompt-injection detection + greeting/scope classification with `ECOMMERCE_KEYWORDS` regex fallback.
  2. **SQL Generator** (`agents/sql_generator.py`, ~620 lines) — deterministic template matching (~23 patterns) with LLM fallback; injects role-scoped `WHERE` clauses (`user_id` for INDIVIDUAL, `store_id` for CORPORATE, none for ADMIN).
  3. **Executor** (`agents/executor.py`) — runs SELECT-only against read-only DB user; `signal.SIGALRM` timeout.
  4. **Error Handler** (`agents/error_handler.py`) — bounded retry (`MAX_RETRIES`) with corrective hints.
  5. **Analyst** (`agents/analyst.py`) — Gemini-powered natural-language explanation.
  6. **Visualizer** (`agents/visualizer.py`) — generates Plotly code, AST validator blocks `import`, `__builtins__`, `eval`, `exec`.
- **Frontend integration**: `ChatbotComponent` with SSE streaming (`chat.service.ts:streamMessage`), 5-step pipeline visualization, Chart/Table/SQL tabs (admin only), schema-aware cell formatting.
- **Security**: `CHATBOT_API_KEY` shared-secret header, role passed from authenticated session, AST sandbox, parameterized queries.
- **Error handling**: streaming error callback in `chatbot.ts:onError`, generic-message fallback, history truncation (`MAX_HISTORY=10`), question-length cap (`MAX_QUESTION_LENGTH=1000`).
- **Tests** (`chatbot/tests/`): 19 test files covering guardrails classification, SQL injection deflection, role isolation (`test_role_based_access.py`), XSS regression on chart labels (`test_xss_regression.py`), AST validation (`test_visualizer.py`).

---

## 5. Documentation & Presentation (10%)

**Key evaluation points: Clarity, completeness, demo quality.**

- **`README.md`** (260+ lines): prerequisites, env vars, quick-start for all 4 services, project structure, endpoint table, payment integration, AI integration, security highlights, testing, env reference.
- **`docs/architecture/system-architecture.md`** — Mermaid component diagram, three request-flow walkthroughs, security layer table, deployment topology.
- **`docs/architecture/er-diagram.md`** — Mermaid ER diagram, normalization notes, index strategy.
- **`docs/ETL_FIELD_MAPPING.md`** — six Kaggle datasets → JPA schema mapping with transformation logic.
- **`docs/screenshots/README.md`** — placeholder + capture guide for demo screenshots.
- **`docs/database-smoke-test.sh`** — DB connectivity helper.
- **OpenAPI** auto-generated at `/swagger-ui.html`.

---

## 6. Code Quality & Best Practices (5%)

**Key evaluation points: Clean code, patterns, Git usage.**

- **Git**: 65+ commits with semantic prefixes (`feat:`, `fix:`, `chore:`, `docs:`, `C1–C19` for pixel-parity passes). Incremental, reviewable history.
- **Layered architecture**: clear Controller → Service → Repository in backend; component → service → guard in frontend; agent → graph in chatbot.
- **Patterns**:
  - Repository pattern (Spring Data JPA interfaces).
  - DTO mapping at controller boundaries.
  - Constructor injection (no field injection).
  - Global exception handling.
- **Tooling**:
  - **Backend**: JaCoCo coverage, Maven Wrapper.
  - **Frontend**: Prettier (`package.json`).
  - **Chatbot**: Ruff config (`pyproject.toml`) — `select = E,W,F,I,B,UP`.
  - **Project-wide**: `.editorconfig` for cross-IDE consistency.
- **No TODOs/FIXMEs** in source; no oversized files (max ~411 lines for `DataSeeder.java`).

---

## How to Verify

```bash
# Backend tests + coverage
cd backend && ./mvnw clean verify
open target/site/jacoco/index.html

# Frontend
cd frontend && npm install && npm test && npm run build

# Chatbot
cd chatbot && pip install -r requirements.txt && pytest -q
ruff check .   # if installed
```

End-to-end smoke:
1. `cd backend && ./mvnw spring-boot:run` (port 8080)
2. `cd frontend && npm start` (port 4200)
3. `cd chatbot && uvicorn main:app --reload` (port 8000)
4. Login as `admin@demo.com` / `Admin123!` → Admin Analytics → Chatbot.
