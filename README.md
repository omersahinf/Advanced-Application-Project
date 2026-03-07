# E-Commerce Analytics Platform

Secure demo project: Spring Boot + Angular + Alibaba Qwen AI integration.

## Prerequisites

- Java 17+
- Node.js 18+
- npm
- (Optional) PostgreSQL if using postgres profile

## Quick Start (Fastest - H2 in-memory DB)

### 1. Backend

```bash
cd backend

# Create .env file from example
cp .env.example .env
# Edit .env and add your AI_API_KEY (Alibaba DashScope key, optional - fallback mode works without it)
# Edit JWT_SECRET to a strong random string (64+ chars)

# Run
./mvnw spring-boot:run
```

Backend starts on http://localhost:8080

### 2. Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start dev server (proxies API calls to backend)
npm start
```

Frontend starts on http://localhost:4200

### 3. Login

Open http://localhost:4200 and use:
- `user1@example.com` / `password` (TechCorp - 7 products)
- `user2@example.com` / `password` (GreenMarket - 6 products)

## Using PostgreSQL Instead

1. Create database: `createdb ecommerce_demo`
2. Set in `.env`:
   ```
   DB_URL=jdbc:postgresql://localhost:5432/ecommerce_demo
   DB_USERNAME=postgres
   DB_PASSWORD=yourpassword
   ```
3. Run with postgres profile:
   ```bash
   SPRING_PROFILES_ACTIVE=postgres ./mvnw spring-boot:run
   ```

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/auth/login | No | Login, returns JWT |
| GET | /api/auth/me | Yes | Current user info |
| GET | /api/products | Yes | User's products |
| GET | /api/products/{id} | Yes | Product detail (own only) |
| POST | /api/ai/chat | Yes | AI chat about products |

## Project Structure

```
backend/
  src/main/java/com/demo/ecommerce/
    config/         - Security config, data seeder
    security/       - JWT filter, util, principal
    controller/     - REST endpoints
    dto/            - Request/response objects
    entity/         - JPA entities
    repository/     - Data access
    service/        - Business logic, AI, validation
    exception/      - Global error handling

frontend/
  src/app/
    components/     - Login, Products, Chat UI
    services/       - HTTP services
    guards/         - Auth guard
    interceptors/   - JWT interceptor
    models/         - TypeScript interfaces
```

## AI Integration (Alibaba Qwen)

- If `AI_API_KEY` is set in `.env`, the chatbot uses Alibaba DashScope (Qwen) for intelligent responses.
- If not set, a built-in fallback engine handles basic queries (low stock, pricing, summaries).
- The API key is **never** exposed to the frontend.

## Known Limitations for MVP Demo

- H2 database resets on restart (use PostgreSQL for persistence)
- No user registration (seed data only)
- No product CRUD operations
- Chat history is in-memory (per session, not persisted)
- No rate limiting on endpoints
- No HTTPS (local dev only)
- JWT stored in localStorage (see SECURITY_NOTES.md for production recommendation)
