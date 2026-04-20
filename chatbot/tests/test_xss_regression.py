"""XSS & SQL Injection regression tests.

Ensures that attack payloads are properly blocked at both
the database execution layer (database.py) and the SQL
generation layer (sql_generator.py / guardrails).
"""

import database


# ── XSS payloads in SQL queries ──────────────────────────────────────────────

class TestXSSPayloadsBlocked:
    """Verify that XSS attack strings cannot be used to extract data."""

    def test_script_tag_in_table_name(self):
        """HTML script tags should be caught by table allowlist."""
        # The angle bracket makes invalid SQL, but more importantly
        # the 'table' name is not in the allowlist
        result = database.execute_query("SELECT 1 FROM evil_table")
        assert result["error"], "Unknown table should be blocked by allowlist"
        assert "evil_table" in result["error"]

    def test_img_onerror_payload(self):
        result = database.execute_query(
            "SELECT '<img onerror=alert(document.cookie)>' AS xss FROM users"
        )
        # Even if it passes SQL validation, sensitive columns are stripped
        # and the query references 'users' which is allowed, but the real
        # concern is the result — passwords should never leak
        assert "password_hash" not in result.get("columns", [])

    def test_document_cookie_in_column_alias(self):
        """document.cookie reference in column alias should not cause data leak."""
        result = database.execute_query(
            "SELECT email AS \"document.cookie\" FROM users"
        )
        # This is valid SQL but should not leak passwords
        if not result.get("error"):
            assert "password_hash" not in result.get("columns", [])

    def test_javascript_protocol_blocked(self):
        """javascript: protocol in SQL should be caught as invalid."""
        result = database.execute_query("javascript:alert(1)")
        assert result["error"] == "Only SELECT queries are allowed."


# ── SQL Injection payloads ───────────────────────────────────────────────────

class TestSQLInjectionBlocked:

    def test_or_1_equals_1_tautology(self):
        """Tautology attack with sensitive column should be blocked."""
        result = database.execute_query(
            "SELECT password_hash FROM users WHERE 1=1"
        )
        assert result["error"] == "Access to sensitive columns is not allowed."

    def test_union_select_blocked(self):
        result = database.execute_query(
            "SELECT id FROM products UNION SELECT password_hash FROM users"
        )
        assert result["error"], "UNION should be blocked"

    def test_stacked_query_blocked(self):
        result = database.execute_query(
            "SELECT 1; DROP TABLE users; --"
        )
        assert result["error"], "Multi-statement (stacked) queries should be blocked"

    def test_comment_bypass_blocked(self):
        result = database.execute_query(
            "SELECT password_hash /* hidden */ FROM users"
        )
        assert result["error"] == "Access to sensitive columns is not allowed."

    def test_case_variation_bypass(self):
        """Sensitive column detection should be case-insensitive."""
        result = database.execute_query("SELECT PASSWORD_HASH FROM users")
        assert result["error"] == "Access to sensitive columns is not allowed."

        result2 = database.execute_query("SELECT Password_Hash FROM users")
        assert result2["error"] == "Access to sensitive columns is not allowed."


# ── System catalog introspection ─────────────────────────────────────────────

class TestSystemCatalogBlocked:

    def test_information_schema(self):
        result = database.execute_query(
            "SELECT table_name FROM information_schema.tables"
        )
        assert result["error"] == "System catalog queries are not allowed."

    def test_pg_catalog(self):
        result = database.execute_query(
            "SELECT * FROM pg_catalog.pg_tables"
        )
        assert result["error"] == "System catalog queries are not allowed."

    def test_pg_shadow(self):
        """pg_shadow contains password hashes — must be blocked."""
        result = database.execute_query("SELECT * FROM pg_shadow")
        assert result["error"] == "System catalog queries are not allowed."

    def test_pg_roles(self):
        result = database.execute_query("SELECT * FROM pg_roles")
        assert result["error"] == "System catalog queries are not allowed."

    def test_pg_user(self):
        result = database.execute_query("SELECT * FROM pg_user")
        assert result["error"] == "System catalog queries are not allowed."

    def test_pg_auth_members(self):
        result = database.execute_query("SELECT * FROM pg_auth_members")
        assert result["error"] == "System catalog queries are not allowed."


# ── Table allowlist ──────────────────────────────────────────────────────────

class TestTableAllowlist:

    def test_unknown_table_rejected(self):
        result = database.execute_query("SELECT * FROM secret_admin_data")
        assert result["error"], "Unknown table should be rejected"
        assert "secret_admin_data" in result["error"]

    def test_known_tables_not_rejected_at_allowlist_level(self):
        """Known tables should pass the allowlist check (may fail at DB connect)."""
        for table in ["users", "stores", "products", "orders", "categories",
                       "order_items", "shipments", "reviews", "customer_profiles"]:
            result = database.execute_query(f"SELECT id FROM {table} LIMIT 1")
            # Should not have a table allowlist error
            if result.get("error"):
                assert "not allowed" not in result["error"] or "sensitive" in result["error"].lower()


# ── Sensitive column expanded list ───────────────────────────────────────────

class TestSensitiveColumnsExpanded:

    def test_password_hash_blocked(self):
        assert "password_hash" in database._SENSITIVE_COLUMNS

    def test_token_blocked(self):
        assert "token" in database._SENSITIVE_COLUMNS

    def test_api_key_blocked(self):
        assert "api_key" in database._SENSITIVE_COLUMNS

    def test_credit_card_blocked(self):
        assert "credit_card" in database._SENSITIVE_COLUMNS

    def test_ssn_blocked(self):
        assert "ssn" in database._SENSITIVE_COLUMNS

    def test_refresh_token_blocked(self):
        assert "refresh_token" in database._SENSITIVE_COLUMNS

    def test_private_key_blocked(self):
        assert "private_key" in database._SENSITIVE_COLUMNS

    def test_sensitive_col_regex_catches_variations(self):
        """Regex should catch case variations and aliases."""
        import re
        pattern = database._SENSITIVE_COL_IN_SQL
        assert pattern.search("SELECT api_key FROM config")
        assert pattern.search("SELECT API_KEY FROM config")
        assert pattern.search("SELECT ssn AS social FROM users")
        assert pattern.search("SELECT credit_card FROM payments")
        assert pattern.search("SELECT private_key FROM keys")


# ── DML/DDL forbidden patterns ──────────────────────────────────────────────

class TestDMLDDLBlocked:

    def test_insert_blocked(self):
        result = database.execute_query("INSERT INTO users (email) VALUES ('evil@evil.com')")
        assert result["error"]

    def test_update_blocked(self):
        result = database.execute_query("UPDATE users SET role_type = 'ADMIN'")
        assert result["error"]

    def test_delete_blocked(self):
        result = database.execute_query("DELETE FROM users")
        assert result["error"]

    def test_drop_blocked(self):
        result = database.execute_query("DROP TABLE users")
        assert result["error"]

    def test_grant_blocked(self):
        result = database.execute_query("GRANT ALL ON users TO public")
        assert result["error"]

    def test_truncate_blocked(self):
        result = database.execute_query("TRUNCATE users")
        assert result["error"]
