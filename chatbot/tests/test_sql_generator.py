"""Tests for SQL generator helpers using the real implementation."""

from agents.sql_generator import (
    _add_where_clause,
    _build_category_sales_timeframe_sql,
    _build_month_over_month_comparison_sql,
    _build_shipment_status_timeframe_sql,
    _build_shipped_by_air_sql,
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


def test_category_sales_last_month_sql_joins_orders_and_filters_month_for_corporate():
    sql = _build_category_sales_timeframe_sql(
        "Show me sales by category last month",
        "CORPORATE",
        user_id=2,
        store_id=1,
    )

    assert sql is not None
    assert "FROM orders o" in sql
    assert "JOIN order_items oi ON o.id = oi.order_id" in sql
    assert "JOIN categories c ON p.category_id = c.id" in sql
    assert "o.status != 'CANCELLED'" in sql
    assert "DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')" in sql
    assert "o.order_date < DATE_TRUNC('month', CURRENT_DATE)" in sql
    assert "p.store_id = 1" in sql
    assert "GROUP BY c.id, c.name" in sql
    assert "ORDER BY total_sales DESC" in sql


def test_month_over_month_comparison_sql_returns_period_rows_for_admin():
    sql = _build_month_over_month_comparison_sql(
        "Compare this month vs last month",
        "ADMIN",
        user_id=1,
        store_id=None,
    )

    assert sql is not None
    assert "FROM (VALUES " in sql
    assert "('Last Month'," in sql
    assert "('This Month'," in sql
    assert "SELECT p.period AS period" in sql
    assert "COUNT(o.id) AS order_count" in sql
    assert "SUM(o.grand_total)" in sql
    assert "LEFT JOIN orders o" in sql
    assert "o.status != 'CANCELLED'" in sql
    assert "GROUP BY p.period, p.sort_order" in sql
    assert "ORDER BY p.sort_order" in sql


def test_shipped_by_air_sql_is_platform_scoped_for_admin():
    sql = _build_shipped_by_air_sql(
        "How many orders were shipped by air?",
        "ADMIN",
        user_id=1,
        store_id=None,
    )

    assert sql is not None
    assert "SELECT 'Air' AS shipment_mode" in sql
    assert "LEFT JOIN shipments s ON o.id = s.order_id" in sql
    assert "UPPER(COALESCE(s.mode, '')) = 'FLIGHT'" in sql
    assert "o.status != 'CANCELLED'" in sql
    assert "o.store_id =" not in sql


def test_shipped_by_air_sql_is_store_scoped_for_corporate():
    sql = _build_shipped_by_air_sql(
        "How many orders were shipped by air?",
        "CORPORATE",
        user_id=2,
        store_id=1,
    )

    assert sql is not None
    assert "o.store_id = 1" in sql


def test_shipment_status_this_week_sql_uses_shipped_date_for_corporate():
    sql = _build_shipment_status_timeframe_sql(
        "What is the status of shipments made this week?",
        "CORPORATE",
        user_id=2,
        store_id=1,
    )

    assert sql is not None
    assert "FROM shipments s" in sql
    assert "JOIN orders o ON o.id = s.order_id" in sql
    assert "COALESCE(s.status, 'No Shipment Status') AS shipment_status" in sql
    assert "COUNT(*) AS shipment_count" in sql
    assert "s.shipped_date >= DATE_TRUNC('week', CURRENT_DATE)" in sql
    assert "s.shipped_date < DATE_TRUNC('week', CURRENT_DATE + INTERVAL '1 week')" in sql
    assert "o.store_id = 1" in sql
    assert "o.order_date" not in sql
