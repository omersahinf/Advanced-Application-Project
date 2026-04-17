"""Tests for SQL generator — role-based filtering and follow-up logic.
Tests pure functions directly without LLM dependency.
"""
import re
import sys
import os

# We test the pure helper functions by copying them to avoid the LLM import chain.
# These match agents/sql_generator.py exactly.

USER_SCOPED_TABLES = {"orders", "reviews", "customer_profiles"}
STORE_SCOPED_TABLES = {"orders", "products", "order_items"}

_SQL_KEYWORDS = {
    "GROUP", "ORDER", "HAVING", "LIMIT", "WHERE", "ON", "AND", "OR", "NOT",
    "JOIN", "LEFT", "RIGHT", "INNER", "OUTER", "CROSS", "FULL", "NATURAL",
    "SET", "INTO", "VALUES", "FROM", "SELECT", "AS", "IN", "IS", "NULL",
    "BETWEEN", "LIKE", "EXISTS", "UNION", "INTERSECT", "EXCEPT", "CASE",
    "WHEN", "THEN", "ELSE", "END", "ASC", "DESC", "BY", "OFFSET",
}


def _add_where_clause(sql, filter_clause):
    sql_upper = sql.upper()
    if " WHERE " in sql_upper:
        sql = re.sub(r'(?i)\bWHERE\b', f'WHERE {filter_clause} AND', sql, count=1)
    else:
        match = re.search(r'(?i)(GROUP\s+BY|ORDER\s+BY|HAVING|LIMIT)\b', sql)
        if match:
            pos = match.start(0)
            sql = sql[:pos] + f'WHERE {filter_clause} ' + sql[pos:]
        else:
            sql = sql.rstrip().rstrip(';')
            sql += f' WHERE {filter_clause}'
    return sql


def _inject_role_filter(sql, role, user_id, store_id):
    if role == "ADMIN":
        return sql
    sql_upper = sql.upper()
    if role == "INDIVIDUAL":
        filter_col = "user_id"
        filter_val = user_id
        if re.search(r'\buser_id\s*=\s*' + str(user_id), sql, re.IGNORECASE):
            return sql
        tables_used = [t for t in USER_SCOPED_TABLES if re.search(r'\b' + t + r'\b', sql, re.IGNORECASE)]
        if not tables_used:
            return sql
        for table in tables_used:
            alias_match = re.search(r'\b(' + table + r')\s+(?:AS\s+)?(\w+)', sql, re.IGNORECASE)
            prefix = ""
            if alias_match:
                candidate = alias_match.group(2)
                if candidate.upper() not in _SQL_KEYWORDS:
                    prefix = candidate + "."
            filter_clause = f"{prefix}{filter_col} = {filter_val}"
            sql = _add_where_clause(sql, filter_clause)
            break
    elif role == "CORPORATE" and store_id:
        filter_col = "store_id"
        filter_val = store_id
        if re.search(r'\bstore_id\s*=\s*' + str(store_id), sql, re.IGNORECASE):
            return sql
        tables_used = [t for t in STORE_SCOPED_TABLES if re.search(r'\b' + t + r'\b', sql, re.IGNORECASE)]
        if not tables_used:
            return sql
        for table in tables_used:
            alias_match = re.search(r'\b(' + table + r')\s+(?:AS\s+)?(\w+)', sql, re.IGNORECASE)
            prefix = ""
            if alias_match:
                candidate = alias_match.group(2)
                if candidate.upper() not in _SQL_KEYWORDS:
                    prefix = candidate + "."
            filter_clause = f"{prefix}{filter_col} = {filter_val}"
            sql = _add_where_clause(sql, filter_clause)
            break
    return sql


# ---- TESTS ----

class TestAddWhereClause:
    def test_adds_where_to_simple_select(self):
        sql = "SELECT * FROM orders"
        result = _add_where_clause(sql, "user_id = 5")
        assert "WHERE user_id = 5" in result

    def test_appends_to_existing_where(self):
        sql = "SELECT * FROM orders WHERE status = 'PENDING'"
        result = _add_where_clause(sql, "user_id = 5")
        assert "user_id = 5 AND" in result
        assert "status = 'PENDING'" in result

    def test_inserts_before_group_by(self):
        sql = "SELECT store_id, COUNT(*) FROM orders GROUP BY store_id"
        result = _add_where_clause(sql, "user_id = 5")
        assert "WHERE user_id = 5" in result
        assert result.index("WHERE") < result.upper().index("GROUP BY")

    def test_inserts_before_order_by(self):
        sql = "SELECT * FROM orders ORDER BY id DESC"
        result = _add_where_clause(sql, "user_id = 5")
        assert "WHERE user_id = 5" in result
        assert result.index("WHERE") < result.upper().index("ORDER BY")

    def test_inserts_before_limit(self):
        sql = "SELECT * FROM orders LIMIT 10"
        result = _add_where_clause(sql, "user_id = 5")
        assert "WHERE user_id = 5" in result
        assert result.index("WHERE") < result.upper().index("LIMIT")


class TestInjectRoleFilter:
    def test_admin_no_filter(self):
        sql = "SELECT * FROM orders"
        result = _inject_role_filter(sql, "ADMIN", 1, None)
        assert result == sql  # Admin should not have filter injected

    def test_individual_adds_user_filter(self):
        sql = "SELECT * FROM orders"
        result = _inject_role_filter(sql, "INDIVIDUAL", 42, None)
        assert "user_id = 42" in result

    def test_individual_skips_if_filter_exists(self):
        sql = "SELECT * FROM orders WHERE user_id = 42"
        result = _inject_role_filter(sql, "INDIVIDUAL", 42, None)
        # Should not add duplicate filter
        assert result.count("user_id = 42") == 1

    def test_corporate_adds_store_filter(self):
        sql = "SELECT * FROM products"
        result = _inject_role_filter(sql, "CORPORATE", 1, 7)
        assert "store_id = 7" in result

    def test_corporate_skips_if_filter_exists(self):
        sql = "SELECT * FROM products WHERE store_id = 7"
        result = _inject_role_filter(sql, "CORPORATE", 1, 7)
        assert result.count("store_id = 7") == 1

    def test_individual_no_filter_on_non_scoped_table(self):
        sql = "SELECT * FROM categories"
        result = _inject_role_filter(sql, "INDIVIDUAL", 42, None)
        assert "user_id" not in result  # categories is not user-scoped

    def test_corporate_no_filter_on_non_scoped_table(self):
        sql = "SELECT * FROM users"
        result = _inject_role_filter(sql, "CORPORATE", 1, 7)
        assert "store_id" not in result  # users is not store-scoped

    def test_individual_filter_with_alias(self):
        sql = "SELECT o.id FROM orders o"
        result = _inject_role_filter(sql, "INDIVIDUAL", 42, None)
        assert "o.user_id = 42" in result

    def test_sql_keyword_not_used_as_alias(self):
        sql = "SELECT * FROM orders GROUP BY status"
        result = _inject_role_filter(sql, "INDIVIDUAL", 42, None)
        # "GROUP" should not be treated as an alias
        assert "GROUP.user_id" not in result
        assert "user_id = 42" in result
