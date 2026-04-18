"""Data quality smoke tests — verifies the seeded database has the variety
needed for the demo. Complements test_schema_supports_demo_queries.py
(schema) by checking that rows actually exist.
"""
import pytest
from sqlalchemy import text

from database import engine


def _count(sql: str) -> int:
    with engine.connect() as conn:
        return conn.execute(text(sql)).scalar() or 0


@pytest.mark.skipif(
    _count("SELECT COUNT(*) FROM users") == 0,
    reason="Database not seeded — skipping data quality checks.",
)
class TestSeededData:
    def test_has_reviews_for_products(self):
        count = _count("SELECT COUNT(*) FROM reviews")
        assert count > 0, "No reviews — 'most reviewed product' query will fail"

    def test_has_variety_of_shipment_modes(self):
        modes = [
            r[0]
            for r in engine.connect().execute(
                text("SELECT DISTINCT UPPER(mode) FROM shipments")
            )
        ]
        assert len(modes) >= 2, f"Need multiple shipment modes for demo, got: {modes}"

    def test_has_at_least_one_cancelled_order(self):
        count = _count("SELECT COUNT(*) FROM orders WHERE status = 'CANCELLED'")
        assert count > 0, "No cancelled orders — cancellation trend chart will be empty"

    def test_has_multiple_stores(self):
        assert _count("SELECT COUNT(*) FROM stores") >= 2

    def test_has_multiple_categories(self):
        assert _count("SELECT COUNT(*) FROM categories") >= 3

    def test_orders_reference_valid_users(self):
        orphans = _count(
            "SELECT COUNT(*) FROM orders o "
            "WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = o.user_id)"
        )
        assert orphans == 0, f"{orphans} orders reference missing users"

    def test_reviews_reference_valid_products(self):
        orphans = _count(
            "SELECT COUNT(*) FROM reviews r "
            "WHERE NOT EXISTS (SELECT 1 FROM products p WHERE p.id = r.product_id)"
        )
        assert orphans == 0, f"{orphans} reviews reference missing products"
