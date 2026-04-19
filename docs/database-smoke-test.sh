#!/bin/bash
# Database Smoke Test Script
# Tests backend startup with PostgreSQL and MySQL profiles
# Prerequisites: PostgreSQL and/or MySQL running locally
#
# Usage:
#   ./docs/database-smoke-test.sh postgres
#   ./docs/database-smoke-test.sh mysql

set -e

PROFILE="${1:-postgres}"
echo "=== Database Smoke Test: $PROFILE ==="

cd "$(dirname "$0")/../backend"

case "$PROFILE" in
  postgres)
    echo "Testing PostgreSQL profile..."
    echo "Ensure PostgreSQL is running: docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=ecommerce_demo postgres:16"
    export SPRING_PROFILE=postgres
    export DB_URL=jdbc:postgresql://localhost:5432/ecommerce_demo
    export DB_USERNAME=postgres
    export DB_PASSWORD=postgres
    ;;
  mysql)
    echo "Testing MySQL profile..."
    echo "Ensure MySQL is running: docker run -d -p 3306:3306 -e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=ecommerce_demo mysql:8"
    export SPRING_PROFILE=mysql
    export DB_URL=jdbc:mysql://localhost:3306/ecommerce_demo
    export DB_USERNAME=root
    export DB_PASSWORD=root
    ;;
  *)
    echo "Unknown profile: $PROFILE (use 'postgres' or 'mysql')"
    exit 1
    ;;
esac

echo ""
echo "Starting backend with $PROFILE profile..."
./mvnw spring-boot:run -Dspring-boot.run.arguments="--spring.profiles.active=$PROFILE" &
BACKEND_PID=$!

sleep 15

echo ""
echo "=== Health Check ==="
curl -s http://localhost:8080/api-docs | head -c 200
echo ""

echo ""
echo "=== Auth Test ==="
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"password"}' | python3 -c "import sys,json; print(json.load(sys.stdin).get('token','FAIL'))")
echo "Admin token: ${TOKEN:0:20}..."

echo ""
echo "=== Dashboard Test ==="
curl -s http://localhost:8080/api/dashboard/admin \
  -H "Authorization: Bearer $TOKEN" | python3 -c "
import sys,json
d = json.load(sys.stdin)
print(f'Users: {d[\"totalUsers\"]}, Stores: {d[\"totalStores\"]}, Products: {d[\"totalProducts\"]}, Orders: {d[\"totalOrders\"]}, Revenue: {d[\"totalRevenue\"]}')
"

echo ""
echo "=== Chatbot Shared DB Test ==="
echo "Chatbot should use: DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5432/ecommerce_demo"
echo "Set USE_SHARED_DB=true in chatbot/.env"

echo ""
echo "=== Cleanup ==="
kill $BACKEND_PID 2>/dev/null || true
echo "Backend stopped."
echo ""
echo "=== Smoke test complete for $PROFILE ==="
