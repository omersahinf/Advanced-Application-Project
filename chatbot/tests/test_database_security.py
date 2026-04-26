"""Tests for database query validation and safe result shaping."""

from types import SimpleNamespace

import config
import database


def test_forbidden_patterns_include_dml_and_privilege_keywords():
    for keyword in ["INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "CREATE", "TRUNCATE"]:
        assert keyword in database._FORBIDDEN_SQL_PATTERNS
    assert "GRANT" in database._FORBIDDEN_SQL_PATTERNS
    assert "REVOKE" in database._FORBIDDEN_SQL_PATTERNS
    assert "EXEC" in database._FORBIDDEN_SQL_PATTERNS
    assert "EXECUTE" in database._FORBIDDEN_SQL_PATTERNS


def test_sensitive_columns_are_configured():
    assert "password_hash" in database._SENSITIVE_COLUMNS
    assert "password" in database._SENSITIVE_COLUMNS
    assert "Password_Hash".lower() in database._SENSITIVE_COLUMNS


def test_execute_query_rejects_non_select_sql():
    result = database.execute_query("DELETE FROM users")
    assert result["error"] == "Only SELECT queries are allowed."


def test_execute_query_blocks_multi_statement_and_sensitive_columns():
    multi = database.execute_query("SELECT * FROM users; DELETE FROM users")
    sensitive = database.execute_query("SELECT password_hash FROM users")

    assert multi["error"] == "Forbidden SQL keyword: DELETE"
    assert sensitive["error"] == "Access to sensitive columns is not allowed."


def test_execute_query_filters_sensitive_columns_from_results(monkeypatch):
    class FakeResult:
        def keys(self):
            return ["id", "email", "password_hash"]

        def fetchall(self):
            return [(1, "user@example.com", "secret")]

    class FakeConn:
        def execute(self, statement):
            return FakeResult()

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

    monkeypatch.setattr(database, "engine", SimpleNamespace(
        connect=lambda: FakeConn(),
        dialect=SimpleNamespace(name="sqlite"),
    ))
    monkeypatch.setattr(config, "USE_SHARED_DB", False)

    result = database.execute_query("SELECT id, email FROM users")

    assert result["columns"] == ["id", "email"]
    assert result["rows"] == [{"id": 1, "email": "user@example.com"}]
    assert result["row_count"] == 1


def test_execute_query_sets_read_only_transaction_on_shared_db(monkeypatch):
    executed = []

    class FakeResult:
        def keys(self):
            return ["total_revenue"]

        def fetchall(self):
            return [(123.45,)]

    class FakeConn:
        def execute(self, statement):
            executed.append(str(statement))
            if "SET TRANSACTION READ ONLY" in str(statement):
                return None
            return FakeResult()

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

    monkeypatch.setattr(database, "engine", SimpleNamespace(
        connect=lambda: FakeConn(),
        dialect=SimpleNamespace(name="postgresql"),
    ))
    monkeypatch.setattr(config, "USE_SHARED_DB", True)

    result = database.execute_query("SELECT SUM(grand_total) AS total_revenue FROM orders")

    assert executed[0] == "SET TRANSACTION READ ONLY"
    assert result["row_count"] == 1
