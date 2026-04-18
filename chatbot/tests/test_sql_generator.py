"""Tests for SQL generator helpers using the real implementation."""

from agents.sql_generator import (
    _add_where_clause,
    _inject_role_filter,
    _is_personal_query,
    _try_deterministic_followup,
)


def test_add_where_clause_inserts_before_order_by():
    sql = "SELECT * FROM orders ORDER BY id DESC"
    result = _add_where_clause(sql, "user_id = 5")
    assert "WHERE user_id = 5" in result
    assert result.index("WHERE") < result.upper().index("ORDER BY")


def test_personal_query_detection():
    assert _is_personal_query("Show my last 5 orders")
    assert _is_personal_query("How much did I spend last month?")
    assert not _is_personal_query("Show top 5 best selling products")


def test_admin_query_is_not_modified():
    sql = "SELECT * FROM orders"
    assert _inject_role_filter(sql, "ADMIN", 1, None, question="Show all orders") == sql


def test_individual_personal_orders_are_scoped():
    sql = "SELECT * FROM orders"
    result = _inject_role_filter(sql, "INDIVIDUAL", 42, None, question="Show my orders")
    assert "user_id = 42" in result


def test_individual_aggregate_query_is_not_scoped():
    sql = "SELECT * FROM orders"
    result = _inject_role_filter(
        sql,
        "INDIVIDUAL",
        42,
        None,
        question="Show top 5 best selling products",
    )
    assert result == sql


def test_individual_users_table_is_limited_to_own_row():
    sql = "SELECT id, email FROM users"
    result = _inject_role_filter(
        sql,
        "INDIVIDUAL",
        42,
        None,
        question="Show my user profile",
    )
    assert "users.id = 42" in result


def test_corporate_products_are_scoped_to_store():
    sql = "SELECT * FROM products"
    result = _inject_role_filter(sql, "CORPORATE", 1, 7, question="Show my products")
    assert "store_id = 7" in result


def test_corporate_reviews_use_product_subquery_scope():
    sql = "SELECT * FROM reviews"
    result = _inject_role_filter(sql, "CORPORATE", 1, 7, question="Show my store reviews")
    assert "product_id IN (SELECT id FROM products WHERE store_id = 7)" in result


def test_corporate_stores_query_is_limited_to_owned_store():
    sql = "SELECT * FROM stores"
    result = _inject_role_filter(sql, "CORPORATE", 1, 7, question="Show my store")
    assert "stores.id = 7" in result


def test_corporate_users_query_gets_store_scope():
    sql = "SELECT id, email FROM users"
    result = _inject_role_filter(sql, "CORPORATE", 1, 7, question="Show customers for my store")
    assert "store_id = 7" in result


def test_follow_up_query_builds_order_by_for_second_highest():
    sql = _try_deterministic_followup(
        "Which one had the second highest revenue?",
        "SELECT store_name, revenue FROM store_totals",
        "store_name, revenue",
    )
    assert sql == (
        "SELECT store_name, revenue FROM store_totals "
        "ORDER BY revenue DESC LIMIT 1 OFFSET 1"
    )
