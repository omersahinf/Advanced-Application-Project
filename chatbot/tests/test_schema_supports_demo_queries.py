"""Schema presence tests — ensures every PDF Section 5.7 demo query has the
tables and columns needed to execute successfully.

Hoca's warning: sunum sırasında soru sorulduğunda "review tablosu yok" demek
ciddi puan kaybı. Bu testler şema seviyesinde her demo sorusunun önkoşulunu
doğrular. Veri seviyesi için test_data_quality.py'ye bakın.
"""
import pytest
from sqlalchemy import inspect

from database import engine


@pytest.fixture(scope="module")
def columns():
    insp = inspect(engine)
    return {t: {c["name"] for c in insp.get_columns(t)} for t in insp.get_table_names()}


# ---------- 5.7 Example #1: "Show me sales by category for last month" ----------


def test_schema_supports_sales_by_category(columns):
    assert "categories" in columns and "name" in columns["categories"]
    assert "products" in columns and "category_id" in columns["products"]
    assert "order_items" in columns and {"price", "quantity", "product_id"}.issubset(columns["order_items"])
    assert "orders" in columns and "order_date" in columns["orders"]


# ---------- 5.7 Example #2: "Top 5 customers by revenue" ----------


def test_schema_supports_top_customers_by_revenue(columns):
    assert "users" in columns and {"first_name", "last_name"}.issubset(columns["users"])
    assert "orders" in columns
    assert {"user_id", "grand_total"}.issubset(columns["orders"])


# ---------- 5.7 Example #3: "Compare this month vs last month" ----------


def test_schema_supports_period_comparison(columns):
    assert "orders" in columns
    assert {"order_date", "grand_total", "status"}.issubset(columns["orders"])


# ---------- 5.7 Example #4: "Lowest rated products" ----------


def test_schema_supports_lowest_rated_products(columns):
    assert "reviews" in columns, "Review table MUST exist (hoca's demo requirement)"
    assert {"product_id", "star_rating"}.issubset(columns["reviews"])
    assert "products" in columns and "name" in columns["products"]


# ---------- 5.7 Example #5: "Trend in order cancellations" ----------


def test_schema_supports_cancellation_trend(columns):
    assert "orders" in columns
    assert {"status", "order_date"}.issubset(columns["orders"])


# ---------- 5.7 Example #6: "Orders shipped by air" ----------


def test_schema_supports_shipment_mode_filter(columns):
    assert "shipments" in columns, "Shipments table required for 'shipped by air' query"
    assert "mode" in columns["shipments"]


# ---------- Extra: hoca's explicit example "most reviewed product" ----------


def test_schema_supports_most_reviewed_product(columns):
    """Hoca'nın açık örneği: 'en çok yorum almış ürün'."""
    assert "reviews" in columns
    assert "product_id" in columns["reviews"]
    assert "products" in columns
    assert "id" in columns["products"] and "name" in columns["products"]


# ---------- Core schema presence (PDF 2.3 Core Entities) ----------


def test_all_core_entities_exist(columns):
    required_tables = {
        "users", "stores", "products", "orders", "order_items",
        "shipments", "reviews", "categories", "customer_profiles",
    }
    missing = required_tables - set(columns.keys())
    assert not missing, f"Core entities missing from schema: {missing}"
