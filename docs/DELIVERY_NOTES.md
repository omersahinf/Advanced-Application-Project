# Delivery Notes

## Required Environment

- `JWT_SECRET` is required for the backend and Docker Compose. It must be at least 64 characters because access and refresh tokens are signed with HS512.
- For the chatbot demo, backend `CHATBOT_API_KEY` must match chatbot `CHATBOT_API_KEY`.
- For Stripe checkout, use Stripe test keys and a test card such as `4242 4242 4242 4242`.

## Verified Test Commands

These commands were verified locally before submission:

```bash
cd backend
JWT_SECRET=ci-test-secret-at-least-64-characters-long-padding-padding-padding ./mvnw test
```

Result: 51 tests passed.

```bash
cd frontend
npx vitest run
```

Result: 5 test files passed, 38 tests passed.

```bash
cd chatbot
source venv/bin/activate
python -m pytest -q tests/test_sql_generator.py tests/test_role_based_access.py
```

Result: 35 role-scope and SQL generator tests passed.

## Demo Data

On startup, `DataSeeder` creates the expected demo surface:

- Admin: `admin@example.com` / `123`
- Corporate: `corporate1@example.com` through `corporate4@example.com` / `123`
- Individual: `user1@example.com` through `user20@example.com` / `123`

The seeded data includes users, stores, products, orders, order items, shipments, reviews, categories, customer profiles, and audit logs.
