"""Dataset compatibility tests — verifies that the unified schema contains every
target column declared in docs/ETL_FIELD_MAPPING.md for the six Kaggle source
datasets listed in Section 8.1 of the report (Resources and References).

Hoca sunumda "Bu 6 Kaggle datasetini nasıl entegre ettiniz?" sorabilir. Bu
testler her datasetin ETL field-mapping'inde yazılı hedef tablo + kolon
setinin şemada gerçekten bulunduğunu kanıtlar.
"""
from __future__ import annotations

from pathlib import Path

import pytest
from sqlalchemy import inspect
from sqlalchemy.exc import SQLAlchemyError

from database import engine


# Hedef şema — docs/ETL_FIELD_MAPPING.md'den türetilmiştir.
DATASET_TARGETS: dict[str, dict[str, set[str]]] = {
    "DS1_UCI_Online_Retail": {
        "orders": {"id", "user_id", "grand_total", "order_date"},
        "order_items": {"order_id", "product_id", "quantity", "price"},
        "products": {"sku", "name", "unit_price", "created_at"},
    },
    "DS2_Customer_Behavior": {
        "users": {"id", "gender"},
        "customer_profiles": {
            "user_id",
            "age",
            "city",
            "membership_type",
            "total_spend",
            "items_purchased",
            "avg_rating",
            "discount_applied",
            "satisfaction_level",
        },
    },
    "DS3_Shipping_Data": {
        "shipments": {"id", "warehouse", "mode", "customer_care_calls"},
        "customer_profiles": {"prior_purchases"},
        # DS3.CustomerRating → reviews.star_rating (ETL_FIELD_MAPPING.md:91)
        "reviews": {"star_rating"},
    },
    "DS4_Amazon_Sales": {
        "orders": {"status", "sales_channel", "fulfilment", "order_date"},
        "products": {"sku", "name", "category_id"},
        "shipments": {"mode", "shipped_date"},
    },
    "DS5_Pakistan_Ecommerce": {
        "orders": {
            "id",
            "status",
            "grand_total",
            "payment_method",
            "order_date",
        },
        "order_items": {
            "order_id",
            "product_id",
            "quantity",
            "price",
            "discount_percent",
        },
        "products": {"sku", "unit_price", "category_id"},
    },
    "DS6_Amazon_Reviews": {
        "users": {"id"},
        "products": {"id", "name", "category_id"},
        "reviews": {
            "user_id",
            "product_id",
            "star_rating",
            "review_body",
            "helpful_votes",
            "total_votes",
            "review_date",
        },
    },
    # DS7 — Olist Brazilian E-Commerce (kaggle.com/datasets/olistbr/brazilian-ecommerce)
    # 7 ilişkisel CSV; diyagramdaki tablolar şu hedef tablolara map edilir:
    #   olist_orders_dataset            → orders
    #   olist_order_items_dataset       → order_items
    #   olist_order_payments_dataset    → orders.payment_method
    #   olist_order_reviews_dataset     → reviews
    #   olist_products_dataset          → products
    #   olist_sellers_dataset           → stores
    #   olist_customer_dataset          → users + customer_profiles
    #   olist_geolocation_dataset       → customer_profiles.city
    "DS7_Olist_Brazilian_Ecommerce": {
        "orders": {
            "id",                # olist_orders.order_id
            "user_id",           # olist_orders.customer_id
            "status",            # olist_orders.order_status
            "order_date",        # olist_orders.order_purchase_timestamp
            "payment_method",    # olist_order_payments.payment_type
            "grand_total",       # sum(olist_order_payments.payment_value)
        },
        "order_items": {
            "order_id",          # olist_order_items.order_id
            "product_id",        # olist_order_items.product_id
            "price",             # olist_order_items.price
            "quantity",          # olist_order_items.order_item_id (count)
        },
        "products": {
            "id",                # olist_products.product_id
            "name",              # olist_products.product_category_name
            "category_id",       # mapped from product_category_name
            "store_id",          # derived via olist_order_items.seller_id
        },
        "stores": {
            "id",                # olist_sellers.seller_id
        },
        "users": {
            "id",                # olist_customer.customer_id
        },
        "customer_profiles": {
            "user_id",           # FK to users
            "city",              # olist_customer.customer_city / olist_geolocation.geolocation_city
        },
        "reviews": {
            "user_id",           # derived from olist_orders.customer_id
            "product_id",        # derived from olist_order_items.product_id
            "star_rating",       # olist_order_reviews.review_score
            "review_body",       # olist_order_reviews.review_comment_message
            "review_date",       # olist_order_reviews.review_creation_date
        },
    },
}


ETL_DOC_PATH = Path(__file__).resolve().parents[2] / "docs" / "ETL_FIELD_MAPPING.md"


@pytest.fixture(scope="module")
def columns() -> dict[str, set[str]]:
    try:
        insp = inspect(engine)
        return {
            t: {c["name"] for c in insp.get_columns(t)}
            for t in insp.get_table_names()
        }
    except SQLAlchemyError:
        pytest.skip("Database unavailable — skipping dataset schema tests.")


@pytest.mark.parametrize("dataset", list(DATASET_TARGETS.keys()))
def test_dataset_target_tables_exist(dataset: str, columns: dict[str, set[str]]) -> None:
    """Her datasetin hedef aldığı tüm tablolar şemada mevcut olmalı."""
    required_tables = set(DATASET_TARGETS[dataset].keys())
    missing = required_tables - set(columns.keys())
    assert not missing, f"{dataset}: missing target tables {missing}"


@pytest.mark.parametrize("dataset", list(DATASET_TARGETS.keys()))
def test_dataset_target_columns_exist(dataset: str, columns: dict[str, set[str]]) -> None:
    """Her datasetin hedef kolonları ilgili tabloda mevcut olmalı."""
    missing: list[str] = []
    for table, required_cols in DATASET_TARGETS[dataset].items():
        table_cols = columns.get(table, set())
        for col in required_cols:
            if col not in table_cols:
                missing.append(f"{table}.{col}")
    assert not missing, f"{dataset}: missing columns {missing}"


def test_etl_field_mapping_doc_present() -> None:
    """ETL_FIELD_MAPPING.md mevcut ve 6 datasetin hepsini isimlendiriyor."""
    assert ETL_DOC_PATH.exists(), f"ETL mapping doc missing: {ETL_DOC_PATH}"
    content = ETL_DOC_PATH.read_text(encoding="utf-8")
    required_markers = ["DS1", "DS2", "DS3", "DS4", "DS5", "DS6"]
    missing = [m for m in required_markers if m not in content]
    assert not missing, f"ETL doc missing dataset markers: {missing}"


def test_currency_normalization_documented() -> None:
    """ETL doc'u GBP→USD (DS1) ve PKR→USD (DS5) dönüşümlerini belgeliyor."""
    content = ETL_DOC_PATH.read_text(encoding="utf-8")
    assert "GBP" in content and "USD" in content, "GBP→USD conversion missing from ETL doc"
    assert "PKR" in content, "PKR→USD conversion (DS5) missing from ETL doc"
