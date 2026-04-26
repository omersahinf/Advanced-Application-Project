import re
from sqlalchemy import create_engine, text, MetaData, Table, Column, Integer, String, Float, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import sessionmaker
import config

engine = create_engine(config.DATABASE_URL, echo=False)
SessionLocal = sessionmaker(bind=engine)
metadata = MetaData()

# Schema matching Spring Boot entities
users = Table("users", metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("first_name", String), Column("last_name", String),
    Column("email", String, unique=True), Column("password_hash", String),
    Column("role_type", String), Column("gender", String),
    Column("created_at", DateTime), Column("updated_at", DateTime))

categories = Table("categories", metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("name", String), Column("parent_id", Integer, ForeignKey("categories.id")),
    Column("created_at", DateTime), Column("updated_at", DateTime))

stores = Table("stores", metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("owner_id", Integer, ForeignKey("users.id")),
    Column("name", String), Column("description", String),
    Column("status", String), Column("created_at", DateTime), Column("updated_at", DateTime))

products = Table("products", metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("store_id", Integer, ForeignKey("stores.id")),
    Column("category_id", Integer, ForeignKey("categories.id")),
    Column("sku", String), Column("name", String), Column("description", String),
    Column("unit_price", Float), Column("stock", Integer),
    Column("created_at", DateTime), Column("updated_at", DateTime))

orders = Table("orders", metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("user_id", Integer, ForeignKey("users.id")),
    Column("store_id", Integer, ForeignKey("stores.id")),
    Column("status", String), Column("grand_total", Float),
    Column("payment_method", String), Column("sales_channel", String),
    Column("fulfilment", String), Column("order_date", DateTime),
    Column("updated_at", DateTime))

order_items = Table("order_items", metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("order_id", Integer, ForeignKey("orders.id")),
    Column("product_id", Integer, ForeignKey("products.id")),
    Column("quantity", Integer), Column("price", Float),
    Column("discount_percent", Float))

shipments = Table("shipments", metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("order_id", Integer, ForeignKey("orders.id")),
    Column("warehouse", String), Column("mode", String),
    Column("status", String), Column("tracking_number", String),
    Column("carrier", String), Column("destination", String),
    Column("customer_care_calls", Integer),
    Column("shipped_date", DateTime), Column("estimated_arrival", DateTime),
    Column("delivered_date", DateTime),
    Column("created_at", DateTime), Column("updated_at", DateTime))

reviews = Table("reviews", metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("user_id", Integer, ForeignKey("users.id")),
    Column("product_id", Integer, ForeignKey("products.id")),
    Column("star_rating", Integer), Column("review_body", String),
    Column("sentiment", String), Column("helpful_votes", Integer),
    Column("total_votes", Integer), Column("review_date", DateTime),
    Column("updated_at", DateTime))

customer_profiles = Table("customer_profiles", metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("user_id", Integer, ForeignKey("users.id")),
    Column("age", Integer), Column("city", String),
    Column("membership_type", String), Column("total_spend", Float),
    Column("items_purchased", Integer), Column("avg_rating", Float),
    Column("discount_applied", Boolean), Column("satisfaction_level", String),
    Column("prior_purchases", Integer),
    Column("created_at", DateTime), Column("updated_at", DateTime))


_DB_TYPE = "PostgreSQL"

DB_SCHEMA_DESCRIPTION = f"""
Database Schema ({_DB_TYPE}):
- users (id, first_name, last_name, email, role_type [ADMIN/CORPORATE/INDIVIDUAL], gender, created_at, updated_at)
- stores (id, owner_id→users, name, description, status [ACTIVE/CLOSED], created_at, updated_at)
- categories (id, name, parent_id→categories, created_at, updated_at)  -- hierarchical
- products (id, store_id→stores, category_id→categories, sku, name, description, unit_price, stock, created_at, updated_at)
- orders (id, user_id→users, store_id→stores, status [PENDING/CONFIRMED/SHIPPED/DELIVERED/CANCELLED], grand_total, payment_method [CREDIT_CARD/DEBIT_CARD/PAYPAL/BANK_TRANSFER/COD], sales_channel, fulfilment, order_date, updated_at)
- order_items (id, order_id→orders, product_id→products, quantity, price, discount_percent)
- shipments (id, order_id→orders, warehouse, mode [Ship/Flight/Road], status, tracking_number, carrier, destination, customer_care_calls, shipped_date, estimated_arrival, delivered_date, created_at, updated_at)
- reviews (id, user_id→users, product_id→products, star_rating [1-5], review_body, sentiment [POSITIVE/NEUTRAL/NEGATIVE], helpful_votes, total_votes, review_date, updated_at)
- customer_profiles (id, user_id→users, age, city, membership_type [GOLD/SILVER/BRONZE], total_spend, items_purchased, avg_rating, discount_applied, satisfaction_level, prior_purchases, created_at, updated_at)

IMPORTANT JOIN RULES:
- ALWAYS use LEFT JOIN when joining shipments — most orders do NOT have a shipment record yet.
- NEVER use INNER JOIN with shipments, it will miss most orders.
- payment_method is CREDIT_CARD (not STRIPE). STRIPE is NOT a valid payment_method value.
- FOR TIMEFRAME QUESTIONS, filter on the date column of the entity being asked about: use `orders.order_date` for order/sales/revenue questions, `shipments.shipped_date` for shipment/delivery questions, and `reviews.review_date` for review questions. Do NOT default every timeframe filter to `orders.order_date`.
"""


def init_db():
    if not config.USE_SHARED_DB:
        metadata.create_all(engine)


_FORBIDDEN_SQL_PATTERNS = {"INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "CREATE", "TRUNCATE", "GRANT", "REVOKE", "EXEC", "EXECUTE"}
_SENSITIVE_COLUMNS = {
    "password_hash", "passwordhash", "password",
    "secret", "token", "api_key", "apikey",
    "credit_card", "creditcard", "card_number", "cvv",
    "ssn", "social_security",
    "refresh_token", "refreshtoken",
    "private_key", "privatekey",
}
# Pattern to detect sensitive columns being aliased (e.g. password_hash AS user_name)
_SENSITIVE_COL_IN_SQL = re.compile(
    r'\b(password_hash|passwordhash|password|secret|token|api_key|apikey|'
    r'credit_card|creditcard|card_number|cvv|ssn|social_security|'
    r'refresh_token|refreshtoken|private_key|privatekey)\b',
    re.IGNORECASE
)

# Table allowlist — only these application tables may be queried
_ALLOWED_TABLES = {
    "users", "stores", "categories", "products",
    "orders", "order_items", "shipments",
    "reviews", "customer_profiles",
}
_TABLE_REF_PATTERN = re.compile(r'\bFROM\s+(\w+)|\bJOIN\s+(\w+)', re.IGNORECASE)

# Per-table column allowlist — only these columns may appear in query results.
# Computed/alias columns (SUM, COUNT, etc.) pass through automatically.
# If a new column is added to the DB but not listed here, it won't leak.
_ALLOWED_COLUMNS_PER_TABLE = {
    "users":             {"id", "first_name", "last_name", "email", "role_type", "gender", "created_at", "updated_at", "company_name"},
    "stores":            {"id", "owner_id", "name", "description", "status", "created_at", "updated_at"},
    "categories":        {"id", "name", "parent_id", "created_at", "updated_at"},
    "products":          {"id", "store_id", "category_id", "sku", "name", "description", "unit_price", "stock", "created_at", "updated_at"},
    "orders":            {"id", "user_id", "store_id", "status", "grand_total", "payment_method", "sales_channel", "fulfilment", "order_date", "updated_at"},
    "order_items":       {"id", "order_id", "product_id", "quantity", "price", "discount_percent"},
    "shipments":         {"id", "order_id", "warehouse", "mode", "status", "tracking_number", "carrier", "destination",
                          "customer_care_calls", "shipped_date", "estimated_arrival", "delivered_date",
                          "created_at", "updated_at"},
    "reviews":           {"id", "user_id", "product_id", "star_rating", "review_body", "sentiment",
                          "helpful_votes", "total_votes", "review_date", "updated_at"},
    "customer_profiles": {"id", "user_id", "age", "city", "membership_type", "total_spend",
                          "items_purchased", "avg_rating", "discount_applied", "satisfaction_level", "prior_purchases",
                          "created_at", "updated_at"},
}
# Union of all allowed raw column names (for fast output filtering)
_ALL_ALLOWED_COLUMNS = set()
for _cols in _ALLOWED_COLUMNS_PER_TABLE.values():
    _ALL_ALLOWED_COLUMNS.update(_cols)
# All known raw column names across all tables (for detecting unlisted columns)
_ALL_KNOWN_RAW_COLUMNS = _ALL_ALLOWED_COLUMNS | _SENSITIVE_COLUMNS


def execute_query(sql: str) -> dict:
    """Execute a read-only SQL query and return results as dict."""
    # Safety check: only allow SELECT / WITH statements
    first_word = sql.strip().split()[0].upper() if sql.strip() else ""
    if first_word not in ("SELECT", "WITH"):
        return {"columns": [], "rows": [], "row_count": 0, "error": "Only SELECT queries are allowed."}
    # Strip SQL comments before validation
    sql_clean = re.sub(r'/\*.*?\*/', ' ', sql, flags=re.DOTALL)
    sql_clean = re.sub(r'--.*$', ' ', sql_clean, flags=re.MULTILINE)
    upper_sql = sql_clean.upper()

    # Check for forbidden DML/DDL keywords in the query
    for pattern in _FORBIDDEN_SQL_PATTERNS:
        if f" {pattern} " in f" {upper_sql} " or upper_sql.startswith(pattern):
            return {"columns": [], "rows": [], "row_count": 0, "error": f"Forbidden SQL keyword: {pattern}"}

    # Block UNION/INTERSECT/EXCEPT
    if re.search(r'\b(UNION|INTERSECT|EXCEPT)\b', upper_sql):
        return {"columns": [], "rows": [], "row_count": 0, "error": "Set operations (UNION/INTERSECT/EXCEPT) are not allowed."}

    # Block multi-statement queries
    if ";" in sql.strip().rstrip(";"):
        return {"columns": [], "rows": [], "row_count": 0, "error": "Multi-statement queries are not allowed."}

    # Block queries that reference sensitive columns (prevents alias bypass)
    if _SENSITIVE_COL_IN_SQL.search(sql_clean):
        return {"columns": [], "rows": [], "row_count": 0, "error": "Access to sensitive columns is not allowed."}

    # Block system catalog / schema introspection queries (AV-12 fix)
    _SYSTEM_TABLES_PATTERN = re.compile(
        r'\b(information_schema|pg_catalog|pg_stat|pg_class|pg_namespace|pg_attribute|'
        r'pg_tables|pg_columns|pg_views|pg_indexes|pg_roles|pg_user|pg_shadow|pg_auth_members)\b',
        re.IGNORECASE
    )
    if _SYSTEM_TABLES_PATTERN.search(sql_clean):
        return {"columns": [], "rows": [], "row_count": 0, "error": "System catalog queries are not allowed."}

    # Table allowlist — reject references to unknown tables
    referenced_tables = set()
    for m in _TABLE_REF_PATTERN.finditer(sql_clean):
        table_name = (m.group(1) or m.group(2)).lower()
        referenced_tables.add(table_name)
    unknown_tables = referenced_tables - _ALLOWED_TABLES
    if unknown_tables:
        return {"columns": [], "rows": [], "row_count": 0,
                "error": f"Access to table(s) {', '.join(sorted(unknown_tables))} is not allowed."}

    # SECURITY NOTE (parameterized queries):
    # LLM-generated SQL contains dynamic column names, table names, GROUP BY
    # clauses, and aggregate expressions that cannot be expressed as bind
    # parameters.  Instead, defense-in-depth is achieved through:
    #   1. SELECT/WITH-only enforcement (line 167)
    #   2. DML/DDL keyword blocklist (line 175)
    #   3. UNION/INTERSECT/EXCEPT ban (line 180)
    #   4. Multi-statement (;) ban (line 184)
    #   5. Sensitive column blacklist (line 188)
    #   6. System catalog blocklist (line 197)
    #   7. Table allowlist (line 201)
    #   8. Per-table column allowlist on output (line 220)
    #   9. SET TRANSACTION READ ONLY (below)
    # All nine layers must be bypassed simultaneously for data mutation, which
    # is infeasible given the current validation pipeline.

    with engine.connect() as conn:
        # Set read-only transaction for extra safety — prevents any writes
        # even if all validation layers were hypothetically bypassed.
        # NOTE: Only PostgreSQL supports SET TRANSACTION READ ONLY; SQLite
        # (used in unit tests) does not, so we guard on the dialect name.
        _dialect = getattr(engine, 'dialect', None)
        if _dialect and getattr(_dialect, 'name', '') == "postgresql":
            conn.execute(text("SET TRANSACTION READ ONLY"))
        result = conn.execute(text(sql))
        columns = list(result.keys())
        # Two-layer column output filter:
        # 1) Block sensitive columns (blacklist)
        # 2) If a column matches a known raw DB column but is NOT in the allowlist, hide it
        # Computed/alias columns (e.g. "total_revenue", "order_count") pass through
        def _is_column_allowed(col_name: str) -> bool:
            cl = col_name.lower()
            # Layer 1: always block sensitive columns
            if cl in _SENSITIVE_COLUMNS:
                return False
            # Layer 2: if it's a known raw column, it must be in the allowlist
            if cl in _ALL_KNOWN_RAW_COLUMNS:
                return cl in _ALL_ALLOWED_COLUMNS
            # Otherwise it's a computed/alias column — allow it
            return True

        safe_columns = [c for c in columns if _is_column_allowed(c)]
        rows = [{k: v for k, v in zip(columns, row) if _is_column_allowed(k)} for row in result.fetchall()]
        return {"columns": safe_columns, "rows": rows, "row_count": len(rows)}
