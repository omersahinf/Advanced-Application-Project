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
    Column("created_at", DateTime))

categories = Table("categories", metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("name", String), Column("parent_id", Integer, ForeignKey("categories.id")))

stores = Table("stores", metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("owner_id", Integer, ForeignKey("users.id")),
    Column("name", String), Column("description", String),
    Column("status", String), Column("created_at", DateTime))

products = Table("products", metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("store_id", Integer, ForeignKey("stores.id")),
    Column("category_id", Integer, ForeignKey("categories.id")),
    Column("sku", String), Column("name", String), Column("description", String),
    Column("unit_price", Float), Column("stock", Integer),
    Column("created_at", DateTime))

orders = Table("orders", metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("user_id", Integer, ForeignKey("users.id")),
    Column("store_id", Integer, ForeignKey("stores.id")),
    Column("status", String), Column("grand_total", Float),
    Column("payment_method", String), Column("sales_channel", String),
    Column("fulfilment", String), Column("order_date", DateTime))

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
    Column("delivered_date", DateTime))

reviews = Table("reviews", metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("user_id", Integer, ForeignKey("users.id")),
    Column("product_id", Integer, ForeignKey("products.id")),
    Column("star_rating", Integer), Column("review_body", String),
    Column("sentiment", String), Column("helpful_votes", Integer),
    Column("total_votes", Integer), Column("review_date", DateTime))

customer_profiles = Table("customer_profiles", metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("user_id", Integer, ForeignKey("users.id")),
    Column("age", Integer), Column("city", String),
    Column("membership_type", String), Column("total_spend", Float),
    Column("items_purchased", Integer), Column("avg_rating", Float),
    Column("discount_applied", Boolean), Column("satisfaction_level", String),
    Column("prior_purchases", Integer))


_DB_TYPE = "PostgreSQL" if config.USE_SHARED_DB else "SQLite"

DB_SCHEMA_DESCRIPTION = f"""
Database Schema ({_DB_TYPE}):
- users (id, first_name, last_name, email, role_type [ADMIN/CORPORATE/INDIVIDUAL], gender, created_at)
- stores (id, owner_id→users, name, description, status [ACTIVE/CLOSED], created_at)
- categories (id, name, parent_id→categories)  -- hierarchical
- products (id, store_id→stores, category_id→categories, sku, name, description, unit_price, stock, created_at)
- orders (id, user_id→users, store_id→stores, status [PENDING/CONFIRMED/SHIPPED/DELIVERED/CANCELLED], grand_total, payment_method, sales_channel, fulfilment, order_date)
- order_items (id, order_id→orders, product_id→products, quantity, price, discount_percent)
- shipments (id, order_id→orders, warehouse, mode [Ship/Flight/Road], status, tracking_number, carrier, destination, customer_care_calls, shipped_date, estimated_arrival, delivered_date)
- reviews (id, user_id→users, product_id→products, star_rating [1-5], review_body, sentiment [POSITIVE/NEUTRAL/NEGATIVE], helpful_votes, total_votes, review_date)
- customer_profiles (id, user_id→users, age, city, membership_type [GOLD/SILVER/BRONZE], total_spend, items_purchased, avg_rating, discount_applied, satisfaction_level, prior_purchases)
"""


def init_db():
    if not config.USE_SHARED_DB:
        metadata.create_all(engine)


_FORBIDDEN_SQL_PATTERNS = {"INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "CREATE", "TRUNCATE", "GRANT", "REVOKE", "EXEC", "EXECUTE"}
_SENSITIVE_COLUMNS = {"password_hash", "passwordhash", "password"}
# Pattern to detect sensitive columns being aliased (e.g. password_hash AS user_name)
_SENSITIVE_COL_IN_SQL = re.compile(r'\b(password_hash|passwordhash|password)\b', re.IGNORECASE)


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

    with engine.connect() as conn:
        # Set read-only transaction for extra safety
        if config.USE_SHARED_DB:
            conn.execute(text("SET TRANSACTION READ ONLY"))
        result = conn.execute(text(sql))
        columns = list(result.keys())
        # Filter out sensitive columns (e.g. password_hash)
        safe_columns = [c for c in columns if c.lower() not in _SENSITIVE_COLUMNS]
        rows = [{k: v for k, v in zip(columns, row) if k.lower() not in _SENSITIVE_COLUMNS} for row in result.fetchall()]
        return {"columns": safe_columns, "rows": rows, "row_count": len(rows)}
