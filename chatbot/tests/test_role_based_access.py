"""Tests for PDF Section 5.8 — Role-Based Chatbot Access.

Maps the spec's 3-row access matrix directly to `_inject_role_filter`:

    | Role       | Data Access Scope                                          |
    | Individual | Own orders, purchases, reviews, spending patterns only     |
    | Corporate  | Own store's products, orders, customers, reviews, sales    |
    | Admin      | Full platform access                                       |

Each test asserts one cell of that matrix.
"""
from agents.sql_generator import _inject_role_filter


# ---------- Individual ----------


def test_individual_sees_own_orders_only():
    """5.8 Individual: 'Own orders' — SQL on orders must be scoped to user_id."""
    sql = "SELECT id, grand_total FROM orders"
    result = _inject_role_filter(sql, "INDIVIDUAL", 42, None, question="Show my orders")
    assert "user_id = 42" in result


def test_individual_sees_own_purchases_only():
    """5.8 Individual: 'Own purchases' — aggregate spend scoped to user."""
    sql = "SELECT SUM(grand_total) FROM orders"
    result = _inject_role_filter(
        sql, "INDIVIDUAL", 42, None, question="How much have I spent?"
    )
    assert "user_id = 42" in result


def test_individual_sees_own_spending_patterns_only():
    """5.8 Individual: 'spending patterns' — customer_profiles scoped to user."""
    sql = "SELECT total_spend, items_purchased FROM customer_profiles"
    result = _inject_role_filter(
        sql, "INDIVIDUAL", 42, None, question="Show my spending profile"
    )
    assert "user_id = 42" in result


def test_individual_blocked_from_other_users():
    """5.8 Individual: cannot enumerate other users — users table → own row."""
    sql = "SELECT id, email FROM users"
    result = _inject_role_filter(
        sql, "INDIVIDUAL", 42, None, question="Show user profile"
    )
    assert "users.id = 42" in result


# ---------- Corporate ----------


def test_corporate_sees_own_store_products_only():
    """5.8 Corporate: 'Own store's products' — products scoped to store_id."""
    sql = "SELECT id, name, unit_price FROM products"
    result = _inject_role_filter(
        sql, "CORPORATE", 1, 7, question="Show my products"
    )
    assert "store_id = 7" in result


def test_corporate_sees_own_store_orders_only():
    """5.8 Corporate: 'Own store's orders' — orders scoped to store_id."""
    sql = "SELECT id, grand_total FROM orders"
    result = _inject_role_filter(
        sql, "CORPORATE", 1, 7, question="Show orders for my store"
    )
    assert "store_id = 7" in result


def test_corporate_sees_own_store_customers_only():
    """5.8 Corporate: 'Own store's customers' — users query scoped via store_id."""
    sql = "SELECT id, email FROM users"
    result = _inject_role_filter(
        sql, "CORPORATE", 1, 7, question="Show customers for my store"
    )
    assert "store_id = 7" in result


def test_corporate_sees_own_store_reviews_only():
    """5.8 Corporate: 'Own store's reviews' — reviews joined via store's products."""
    sql = "SELECT star_rating, review_body FROM reviews"
    result = _inject_role_filter(
        sql, "CORPORATE", 1, 7, question="Show reviews on my products"
    )
    assert "product_id IN (SELECT id FROM products WHERE store_id = 7)" in result


def test_corporate_sees_own_store_sales_aggregate():
    """5.8 Corporate: 'sales data' — aggregate sales filtered by store_id."""
    sql = "SELECT ROUND(SUM(oi.price * oi.quantity), 2) FROM order_items oi"
    result = _inject_role_filter(
        sql, "CORPORATE", 1, 7, question="Show my store sales"
    )
    assert "store_id = 7" in result


def test_corporate_store_table_limited_to_own_store():
    """5.8 Corporate: stores table must only expose the owned store."""
    sql = "SELECT id, name FROM stores"
    result = _inject_role_filter(
        sql, "CORPORATE", 1, 7, question="Show my store info"
    )
    assert "stores.id = 7" in result


# ---------- Admin ----------


def test_admin_has_full_access_no_filter_on_orders():
    """5.8 Admin: 'Full platform access' — no injected WHERE on orders."""
    sql = "SELECT * FROM orders"
    assert _inject_role_filter(sql, "ADMIN", 1, None, question="All orders") == sql


def test_admin_has_full_access_no_filter_on_products():
    """5.8 Admin: 'Full platform access' — no injected WHERE on products."""
    sql = "SELECT * FROM products"
    assert _inject_role_filter(sql, "ADMIN", 1, None, question="All products") == sql


def test_admin_has_full_access_no_filter_on_users():
    """5.8 Admin: 'Full platform access' — can see all users."""
    sql = "SELECT id, email FROM users"
    assert _inject_role_filter(sql, "ADMIN", 1, None, question="All users") == sql


def test_admin_has_full_access_on_aggregate():
    """5.8 Admin: 'aggregate data' — full platform revenue unfiltered."""
    sql = "SELECT SUM(grand_total) AS total_revenue FROM orders"
    assert _inject_role_filter(sql, "ADMIN", 1, None, question="Total platform revenue") == sql
