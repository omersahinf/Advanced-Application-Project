# Security Notes

Answers to the security questions the professor will ask during the class demo.

## 1. Where is the JWT stored and why?

The JWT is stored in `localStorage` under the key `jwt_token`. Additional keys: `jwt_refresh_token`, `user_email`, `user_role`, `user_company`.

**Why localStorage:** Demo transparency — we can copy the token and inspect it at jwt.io during the live demo.

**Production recommendation:** HttpOnly cookies with `SameSite=Strict` and `Secure` flags. HttpOnly cookies cannot be read by JavaScript, preventing XSS-based token theft. For this demo, localStorage is acceptable because the backend is the true authority for all access decisions.

## 2. What is inside the JWT payload?

```json
{
  "sub": "1",
  "email": "user1@example.com",
  "role": "INDIVIDUAL",
  "type": "access",
  "iat": 1712000000,
  "exp": 1712003600
}
```

Claims:
- `sub`: User ID (numeric, set from database)
- `email`: User's email address
- `role`: One of `ADMIN`, `CORPORATE`, `INDIVIDUAL` (set from database, not from client)
- `type`: `access` or `refresh`
- `iat`: Issued-at timestamp
- `exp`: Expiration timestamp

It does **not** contain: passwords, API keys, product data, database credentials, or any secrets.

## 3. What happens when the token expires?

- Access token expires in **1 hour** (`app.jwt.expiration-ms: 3600000` in `application.yml`)
- Refresh token expires in **7 days** (`app.jwt.refresh-expiration-ms: 604800000`)
- The backend rejects expired tokens (returns 401)
- The frontend auth interceptor (`auth.interceptor.ts`) catches 401 responses and calls `auth.logout()` -> redirects to `/login`
- The backend always validates independently — client-side checks are for UX only

## 4. Why doesn't changing the role in jwt.io grant admin access?

The JWT is signed with **HS512** using a strong configurable secret (`JWT_SECRET` env var, 64+ characters). If you:
1. Decode the JWT at jwt.io
2. Change `"role": "INDIVIDUAL"` to `"role": "ADMIN"`
3. Send the modified token

The server **rejects** it because the signature no longer matches. `JwtFilter` calls `Jwts.parser().verifyWith(key).build().parseSignedClaims(token)` which throws `SignatureException` for tampered tokens -> returns **401 Unauthorized**.

The `alg: none` attack is also not possible — our parser requires a valid HMAC signature via `verifyWith(key)`.

Even if a forged token were somehow accepted, backend endpoints also enforce role via `@PreAuthorize("hasAuthority('ADMIN')")` and ownership checks in service methods.

## 5. Why can't the Gemini API key be seen in the browser?

- The API key (`AI_API_KEY`) is stored only in the backend `.env` file
- It is loaded via `@Value("${app.ai.api-key}")` in `GeminiService.java`
- All Gemini API calls are made server-side: either by the Python chatbot (port 8000) or by `GeminiService.java` (fallback)
- The frontend calls `POST /api/chat/ask` on our backend (port 8080), which then internally forwards to the Python chatbot
- The browser never sees the Gemini URL, API key, or any external API call in the network tab

## 6. How is prompt injection mitigated?

Three layers of defense:

### Layer 1: `InputValidator.java` (Spring Boot)
Regex-based validation that runs BEFORE the message reaches the chatbot:
- **SQL injection patterns:** `SELECT...FROM`, `UNION SELECT`, `OR 1=1`, `WHERE 1=1`, `DROP TABLE`, `INSERT INTO`
- **Prompt injection patterns:** "ignore your instructions", "you are now an admin", "for testing purposes", "pretend as admin"
- **System prompt reveal:** "system prompt", "hidden instructions", "internal config"
- **Cross-user data access:** "show me all users", "products of user ID X", "what tables exist", "another company's products"

Rejected payloads get a safe message: "I can only help you with questions about your own product catalog."

### Layer 2: Guardrails Agent (Python chatbot)
LLM + keyword classification determines if the question is in-scope (e-commerce analytics):
- Greetings -> friendly welcome message
- Out-of-scope / prompt override -> rejection message
- `NOT_ECOMMERCE_BLACKLIST` catches non-analytics queries

### Layer 3: `_inject_role_filter` + `database.execute_query` (Python chatbot)
Deterministic code (not LLM-controlled) that:
- Injects `WHERE store_id = {authenticated_store_id}` for Corporate users
- Injects `WHERE user_id = {authenticated_user_id}` for Individual users
- No filters for Admin (full access)
- Blocks forbidden SQL patterns: INSERT, UPDATE, DELETE, DROP, ALTER, CREATE, TRUNCATE, GRANT, REVOKE, EXEC, EXECUTE
- `USE_SHARED_DB=true` enables `SET TRANSACTION READ ONLY`

**Key point:** Even if both InputValidator and Guardrails fail, `_inject_role_filter` is deterministic code that always scopes the query based on the JWT-authenticated role.

## 7. How is unauthorized product/data access prevented?

### Via REST API (traditional endpoints):
- **Corporate:** `GET /api/store/my/products` — service layer filters by authenticated user's store ownership
- **Individual:** `GET /api/orders/my/{id}` — service layer verifies order belongs to authenticated user, returns 404 (not 403) to prevent enumeration
- **Admin:** Full access to all data via `/api/admin/**` endpoints
- All controllers extract userId from the validated JWT principal, never from request parameters

### Via Chatbot (Text2SQL):
- `_inject_role_filter` deterministically injects ownership WHERE clauses
- STORE_SCOPED_TABLES and USER_SCOPED_TABLES define which tables get filtered
- The chatbot only generates SELECT/WITH queries (read-only)

## 8. Why does /api/products/1 without login return 401?

Spring Security configuration in `SecurityConfig.java`:
```java
.requestMatchers("/api/auth/login", "/api/auth/register", "/api/auth/refresh").permitAll()
.requestMatchers("/api/**").authenticated()
```

All `/api/` endpoints except login, register, and refresh require a valid JWT. Without the `Authorization: Bearer <token>` header, the request has no authentication context -> `JwtFilter` skips -> Spring Security returns **401 Unauthorized**.

## 9. Why do two different users see different data?

### In the chatbot:
The `_inject_role_filter` always adds ownership constraints based on the JWT-authenticated role:
- Individual: `WHERE user_id = 1` (from JWT `sub` claim)
- Corporate: `WHERE store_id = 3` (from Spring Boot's authenticated user's store ownership)
- Admin: No filters (full platform access)

These filters are deterministic code, not influenced by user input or conversation history.

### In REST endpoints:
Service methods always scope queries by the authenticated user's ID or store ID from the JWT.

## 10. Why doesn't "Show me products where 1=1" run as SQL?

Multiple layers prevent this:

1. **InputValidator.java** catches the `WHERE 1=1` pattern and blocks the request before it reaches the chatbot
2. Even without InputValidator, the chatbot's SQL Generator only creates `SELECT`/`WITH` queries — raw SQL fragments from user input are not interpolated
3. `_inject_role_filter` deterministically replaces WHERE clauses with ownership constraints
4. `database.execute_query` has `_FORBIDDEN_SQL_PATTERNS` that block destructive operations
5. `USE_SHARED_DB=true` sets `TRANSACTION READ ONLY` at the PostgreSQL level
6. Multi-statement detection blocks semicolons; `UNION`/`INTERSECT`/`EXCEPT` patterns are blocked

## Architecture Summary

```
User Input
    |
    v
[InputValidator.java] -- blocks SQL injection, prompt injection, cross-user access
    |
    v (passed validation)
[Spring Boot AiChatService] -- forwards to Python chatbot with JWT-sourced role/user_id/store_id
    |
    v
[Guardrails Agent] -- LLM scope check: GREETING / IN_SCOPE / OUT_OF_SCOPE
    |
    v (in-scope)
[SQL Generator + _inject_role_filter] -- NL -> SQL, deterministic WHERE clause injection
    |
    v
[Executor] -- runs SQL in READ ONLY transaction, blocks forbidden patterns
    |
    v
[Analyst + Visualizer] -- explains results, optionally generates Plotly chart
    |
    v
[Response to Angular] -- SQL in <pre>, data in <table>, Plotly in sandboxed <iframe>
```

The security model: **validate input (Layer 1), check scope (Layer 2), enforce ownership deterministically (Layer 3), execute read-only (Layer 3).**
