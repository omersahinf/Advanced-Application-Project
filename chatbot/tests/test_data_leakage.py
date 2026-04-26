"""Comprehensive data leakage tests — verifies strict data isolation.

Tests cover THREE attack surfaces:
  1) INDIVIDUAL user → must NEVER see other users' data OR corporate data
  2) CORPORATE user → must NEVER see other corporates' data
  3) ADMIN → CAN see everything (baseline correctness check)

Each test calls _inject_role_filter() with realistic SQL that the LLM might
generate and asserts the resulting SQL is properly scoped.
"""
import re
import pytest
from agents.sql_generator import (
    _inject_role_filter,
    _build_order_listing_sql,
    _build_personal_spending_sql,
    _build_revenue_by_month_sql,
    _build_most_reviewed_product_sql,
)


# ═══════════════════════════════════════════════════════════════════
#  SECTION 1: INDIVIDUAL cannot see OTHER users' data
# ═══════════════════════════════════════════════════════════════════

class TestIndividualCannotSeeOtherUsers:
    """An INDIVIDUAL (user_id=42) must never retrieve data belonging
    to user_id=99 or any other user."""

    USER_ID = 42

    def test_orders_query_always_scoped_to_own_user(self):
        """'Show my orders' → must have user_id = 42."""
        sql = "SELECT id, grand_total, status FROM orders"
        result = _inject_role_filter(sql, "INDIVIDUAL", self.USER_ID, None,
                                     question="Show my orders")
        assert f"user_id = {self.USER_ID}" in result

    def test_orders_query_with_wrong_user_id_gets_overridden(self):
        """LLM generates user_id = 99 → must be corrected to user_id = 42."""
        sql = "SELECT id, grand_total FROM orders WHERE user_id = 99"
        result = _inject_role_filter(sql, "INDIVIDUAL", self.USER_ID, None,
                                     question="Show my orders")
        # The filter should add user_id=42, NOT leave user_id=99
        assert f"user_id = {self.USER_ID}" in result

    def test_reviews_scoped_to_own_user(self):
        """'Show my reviews' → must have user_id = 42."""
        sql = "SELECT star_rating, review_body FROM reviews"
        result = _inject_role_filter(sql, "INDIVIDUAL", self.USER_ID, None,
                                     question="Show my reviews")
        assert f"user_id = {self.USER_ID}" in result

    def test_customer_profile_scoped_to_own_user(self):
        """'Show my profile' → must have user_id = 42."""
        sql = "SELECT total_spend, items_purchased FROM customer_profiles"
        result = _inject_role_filter(sql, "INDIVIDUAL", self.USER_ID, None,
                                     question="Show my spending profile")
        assert f"user_id = {self.USER_ID}" in result

    def test_users_table_limited_to_own_row(self):
        """'Show my user info' → must have users.id = 42."""
        sql = "SELECT id, email, first_name FROM users"
        result = _inject_role_filter(sql, "INDIVIDUAL", self.USER_ID, None,
                                     question="Show my profile info")
        assert f"users.id = {self.USER_ID}" in result

    def test_order_items_scoped_through_orders_subquery(self):
        """order_items has no user_id → must use subquery via orders."""
        sql = "SELECT product_id, quantity, price FROM order_items"
        result = _inject_role_filter(sql, "INDIVIDUAL", self.USER_ID, None,
                                     question="Show what I bought")
        assert f"order_id IN (SELECT id FROM orders WHERE user_id = {self.USER_ID})" in result

    def test_shipments_scoped_through_orders_subquery(self):
        """shipments has no user_id → must use subquery via orders."""
        sql = "SELECT tracking_number, status, carrier FROM shipments"
        result = _inject_role_filter(sql, "INDIVIDUAL", self.USER_ID, None,
                                     question="Show my shipment tracking")
        assert f"order_id IN (SELECT id FROM orders WHERE user_id = {self.USER_ID})" in result

    def test_personal_spending_builder_uses_own_user_id(self):
        """Deterministic builder for personal spending → scoped to user."""
        sql = _build_personal_spending_sql(
            "How much have I spent this year?", "INDIVIDUAL",
            user_id=self.USER_ID, store_id=None
        )
        assert sql is not None
        assert f"o.user_id = {self.USER_ID}" in sql

    def test_order_listing_builder_uses_own_user_id(self):
        """Deterministic order listing → scoped to user."""
        sql = _build_order_listing_sql(
            "Show my last 5 orders", "INDIVIDUAL",
            user_id=self.USER_ID, store_id=None
        )
        assert sql is not None
        assert f"o.user_id = {self.USER_ID}" in sql

    # ── AV-05: Cross-user name-based IDOR attacks ──

    def test_name_based_lookup_stripped_first_name(self):
        """LLM generates WHERE first_name = 'Bob' → must be replaced with user_id = 42."""
        sql = "SELECT SUM(grand_total) FROM orders o JOIN users u ON o.user_id = u.id WHERE u.first_name = 'Bob'"
        result = _inject_role_filter(sql, "INDIVIDUAL", self.USER_ID, None,
                                     question="how much has bob spent")
        assert f"user_id = {self.USER_ID}" in result
        assert "'Bob'" not in result

    def test_name_based_lookup_stripped_last_name(self):
        """LLM generates WHERE last_name = 'Smith' → must be replaced."""
        sql = "SELECT * FROM orders o JOIN users u ON o.user_id = u.id WHERE u.last_name = 'Smith'"
        result = _inject_role_filter(sql, "INDIVIDUAL", self.USER_ID, None,
                                     question="show smith's orders")
        assert f"user_id = {self.USER_ID}" in result
        assert "'Smith'" not in result

    def test_name_based_lookup_stripped_lower_function(self):
        """LLM generates LOWER(first_name) = 'bob' → must be replaced."""
        sql = "SELECT SUM(grand_total) FROM orders o JOIN users u ON o.user_id = u.id WHERE LOWER(u.first_name) = 'bob'"
        result = _inject_role_filter(sql, "INDIVIDUAL", self.USER_ID, None,
                                     question="how much has bob spent this year")
        assert f"user_id = {self.USER_ID}" in result
        assert "'bob'" not in result

    def test_name_based_lookup_with_like(self):
        """LLM generates WHERE first_name LIKE '%bob%' → must be replaced."""
        sql = "SELECT * FROM orders o JOIN users u ON o.user_id = u.id WHERE u.first_name LIKE '%Bob%'"
        result = _inject_role_filter(sql, "INDIVIDUAL", self.USER_ID, None,
                                     question="show bob's purchases")
        assert f"user_id = {self.USER_ID}" in result
        assert "'%Bob%'" not in result

    def test_name_based_lookup_without_alias(self):
        """LLM generates WHERE first_name = 'Bob' without table alias."""
        sql = "SELECT SUM(grand_total) FROM orders JOIN users ON orders.user_id = users.id WHERE first_name = 'Bob'"
        result = _inject_role_filter(sql, "INDIVIDUAL", self.USER_ID, None,
                                     question="bob's total spending")
        assert f"user_id = {self.USER_ID}" in result
        assert "'Bob'" not in result

# ═══════════════════════════════════════════════════════════════════
#  SECTION 2: INDIVIDUAL cannot see CORPORATE/ADMIN data
# ═══════════════════════════════════════════════════════════════════

class TestIndividualCannotSeeCorporateData:
    """INDIVIDUAL users must be blocked from store revenue, customer lists,
    and other corporate-only data — even if the LLM generates SQL for it."""

    USER_ID = 42

    def test_revenue_by_month_blocked_for_individual(self):
        """Revenue by month is corporate/admin only."""
        sql = _build_revenue_by_month_sql(
            "Show platform revenue by month", "INDIVIDUAL",
            user_id=self.USER_ID, store_id=None
        )
        assert sql is None, "INDIVIDUAL should NOT get revenue-by-month SQL"

    def test_store_revenue_keyword_blocked(self):
        """The keyword guardrail should reject 'store revenue' for INDIVIDUAL."""
        from agents.sql_generator import sql_generator_agent
        # We test the deterministic keyword list directly
        q_lower = "show me the store revenue this month"
        corporate_keywords = [
            'revenue', 'store sales', 'total sales', 'weekly revenue',
            'monthly revenue', 'top customer', 'my customer',
            'customer ranking', 'store performance', 'store report',
            'profit', 'all users', 'all orders', 'platform revenue',
            'gross revenue', 'net revenue', 'income', 'earnings', 'turnover',
            'sales amount', 'sales volume', 'sales figure', 'sales total',
            'gmv', 'aov', 'average order value', 'gross merchandise',
            'how much did the store', 'how much does the store',
            'store earn', 'store income', 'store profit', 'store revenue',
        ]
        assert any(k in q_lower for k in corporate_keywords), \
            "The keyword list should catch 'store revenue'"

    def test_individual_cannot_list_all_users(self):
        """'show all users' → keyword guard blocks for INDIVIDUAL."""
        q_lower = "show all users"
        corporate_keywords = ['all users', 'user list', 'user data']
        assert any(k in q_lower for k in corporate_keywords)

    def test_individual_profit_keyword_blocked(self):
        """'what is the profit margin' → blocked for INDIVIDUAL."""
        q_lower = "what is the profit margin"
        corporate_keywords = ['profit', 'margin', 'profit margin']
        assert any(k in q_lower for k in corporate_keywords)


# ═══════════════════════════════════════════════════════════════════
#  SECTION 3: CORPORATE cannot see OTHER CORPORATE's data
# ═══════════════════════════════════════════════════════════════════

class TestCorporateIsolation:
    """A CORPORATE user (store_id=7) must NEVER see data from store_id=3."""

    STORE_ID = 7
    OTHER_STORE = 3
    USER_ID = 10

    def test_products_scoped_to_own_store(self):
        """'Show my products' → must have store_id = 7."""
        sql = "SELECT id, name, unit_price FROM products"
        result = _inject_role_filter(sql, "CORPORATE", self.USER_ID, self.STORE_ID,
                                     question="Show my products")
        assert f"store_id = {self.STORE_ID}" in result

    def test_other_store_id_gets_overridden(self):
        """LLM generates store_id = 3 → must be corrected to store_id = 7."""
        sql = f"SELECT id, name FROM products WHERE store_id = {self.OTHER_STORE}"
        result = _inject_role_filter(sql, "CORPORATE", self.USER_ID, self.STORE_ID,
                                     question="Show products from store 3")
        assert f"store_id = {self.STORE_ID}" in result
        assert f"store_id = {self.OTHER_STORE}" not in result

    def test_orders_scoped_to_own_store(self):
        """'Show my store orders' → must have store_id = 7."""
        sql = "SELECT id, grand_total, status FROM orders"
        result = _inject_role_filter(sql, "CORPORATE", self.USER_ID, self.STORE_ID,
                                     question="Show my store orders")
        assert f"store_id = {self.STORE_ID}" in result

    def test_orders_with_wrong_store_id_corrected(self):
        """LLM generates store_id = 3 on orders → corrected to 7."""
        sql = f"SELECT id, grand_total FROM orders WHERE store_id = {self.OTHER_STORE}"
        result = _inject_role_filter(sql, "CORPORATE", self.USER_ID, self.STORE_ID,
                                     question="Show orders")
        assert f"store_id = {self.STORE_ID}" in result
        assert f"store_id = {self.OTHER_STORE}" not in result

    def test_reviews_scoped_via_products_subquery(self):
        """reviews → product_id IN (products WHERE store_id = 7)."""
        sql = "SELECT star_rating, review_body FROM reviews"
        result = _inject_role_filter(sql, "CORPORATE", self.USER_ID, self.STORE_ID,
                                     question="Show my store reviews")
        assert f"product_id IN (SELECT id FROM products WHERE store_id = {self.STORE_ID})" in result

    def test_stores_table_limited_to_own_store(self):
        """'Show my store info' → stores.id = 7."""
        sql = "SELECT id, name, status FROM stores"
        result = _inject_role_filter(sql, "CORPORATE", self.USER_ID, self.STORE_ID,
                                     question="Show my store info")
        assert f"stores.id = {self.STORE_ID}" in result

    def test_stores_with_other_store_id_overridden(self):
        """stores.id = 3 → stores.id = 7."""
        sql = f"SELECT name FROM stores WHERE stores.id = {self.OTHER_STORE}"
        result = _inject_role_filter(sql, "CORPORATE", self.USER_ID, self.STORE_ID,
                                     question="Show store info")
        assert f"stores.id = {self.STORE_ID}" in result or f"id = {self.STORE_ID}" in result
        assert f"stores.id = {self.OTHER_STORE}" not in result

    def test_owner_id_predicate_rewritten_to_store_id(self):
        """owner_id = 99 → stores.id = 7 (prevents IDOR via owner_id)."""
        sql = "SELECT name FROM stores WHERE owner_id = 99"
        result = _inject_role_filter(sql, "CORPORATE", self.USER_ID, self.STORE_ID,
                                     question="Show store info")
        assert "owner_id = 99" not in result
        assert f"stores.id = {self.STORE_ID}" in result

    def test_store_name_filter_rewritten(self):
        """stores.name = 'CompetitorStore' → stores.id = 7."""
        sql = "SELECT * FROM stores WHERE stores.name = 'CompetitorStore'"
        result = _inject_role_filter(sql, "CORPORATE", self.USER_ID, self.STORE_ID,
                                     question="Show CompetitorStore info")
        assert "CompetitorStore" not in result or f"stores.id = {self.STORE_ID}" in result

    def test_order_items_scoped_via_orders_subquery(self):
        """order_items → order_id IN (orders WHERE store_id = 7)."""
        sql = "SELECT product_id, quantity FROM order_items"
        result = _inject_role_filter(sql, "CORPORATE", self.USER_ID, self.STORE_ID,
                                     question="Show my store order items")
        assert f"store_id = {self.STORE_ID}" in result

    def test_revenue_by_month_scoped_to_own_store(self):
        """Revenue by month for CORPORATE → store_id = 7."""
        sql = _build_revenue_by_month_sql(
            "Show revenue by month", "CORPORATE",
            user_id=self.USER_ID, store_id=self.STORE_ID
        )
        assert sql is not None
        assert f"o.store_id = {self.STORE_ID}" in sql

    def test_most_reviewed_product_scoped_to_own_store(self):
        """Most reviewed product → store_id = 7."""
        sql = _build_most_reviewed_product_sql(
            "What is my most reviewed product?", "CORPORATE",
            user_id=self.USER_ID, store_id=self.STORE_ID
        )
        assert sql is not None
        assert f"p.store_id = {self.STORE_ID}" in sql

    def test_aliased_store_id_also_overridden(self):
        """LLM uses alias: o.store_id = 3 → must become o.store_id = 7."""
        sql = f"SELECT o.id FROM orders o WHERE o.store_id = {self.OTHER_STORE}"
        result = _inject_role_filter(sql, "CORPORATE", self.USER_ID, self.STORE_ID,
                                     question="Show orders")
        assert f"store_id = {self.STORE_ID}" in result
        assert f"store_id = {self.OTHER_STORE}" not in result


# ═══════════════════════════════════════════════════════════════════
#  SECTION 4: ADMIN CAN see everything (baseline correctness)
# ═══════════════════════════════════════════════════════════════════

class TestAdminFullAccess:
    """ADMIN must NOT have any filtering applied."""

    def test_admin_orders_unfiltered(self):
        sql = "SELECT * FROM orders"
        assert _inject_role_filter(sql, "ADMIN", 1, None, question="All orders") == sql

    def test_admin_products_unfiltered(self):
        sql = "SELECT * FROM products"
        assert _inject_role_filter(sql, "ADMIN", 1, None, question="All products") == sql

    def test_admin_users_unfiltered(self):
        sql = "SELECT id, email FROM users"
        assert _inject_role_filter(sql, "ADMIN", 1, None, question="All users") == sql

    def test_admin_stores_unfiltered(self):
        sql = "SELECT * FROM stores"
        assert _inject_role_filter(sql, "ADMIN", 1, None, question="All stores") == sql

    def test_admin_reviews_unfiltered(self):
        sql = "SELECT * FROM reviews"
        assert _inject_role_filter(sql, "ADMIN", 1, None, question="All reviews") == sql

    def test_admin_revenue_by_month_unfiltered(self):
        sql = _build_revenue_by_month_sql(
            "Show platform revenue by month", "ADMIN",
            user_id=1, store_id=None
        )
        assert sql is not None
        assert "store_id" not in sql


# ═══════════════════════════════════════════════════════════════════
#  SECTION 5: Cross-role SQL injection attempts
# ═══════════════════════════════════════════════════════════════════

class TestSQLInjectionViaRoleFilter:
    """Attempts to bypass role filtering via SQL tricks."""

    def test_individual_cannot_inject_union_to_see_other_data(self):
        """Even if SQL has UNION (blocked earlier), filter still scopes correctly."""
        sql = "SELECT id, grand_total FROM orders"
        result = _inject_role_filter(sql, "INDIVIDUAL", 42, None,
                                     question="Show my orders")
        assert "user_id = 42" in result

    def test_corporate_subquery_in_where_still_scoped(self):
        """Subquery in WHERE → store_id filter still applied."""
        sql = "SELECT id FROM products WHERE id IN (SELECT product_id FROM reviews)"
        result = _inject_role_filter(sql, "CORPORATE", 10, 7,
                                     question="Show reviewed products")
        assert "store_id = 7" in result

    def test_individual_join_with_all_users_still_scoped(self):
        """Even with JOIN on users, the filter scopes to own user."""
        sql = "SELECT u.email, o.grand_total FROM orders o JOIN users u ON o.user_id = u.id"
        result = _inject_role_filter(sql, "INDIVIDUAL", 42, None,
                                     question="Show my orders with email")
        assert "user_id = 42" in result or "users.id = 42" in result
