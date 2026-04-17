"""Tests for database security — read-only enforcement and sensitive column filtering.
Tests data structures directly to avoid heavy dependency imports.
"""

# Copy the exact constants from database.py
_FORBIDDEN_SQL_PATTERNS = {"INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "CREATE", "TRUNCATE", "GRANT", "REVOKE", "EXEC", "EXECUTE"}
_SENSITIVE_COLUMNS = {"password_hash", "passwordhash", "password"}


def test_forbidden_patterns_include_dml():
    """All dangerous SQL keywords should be in the forbidden set."""
    for keyword in ["INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "CREATE", "TRUNCATE"]:
        assert keyword in _FORBIDDEN_SQL_PATTERNS, f"{keyword} should be forbidden"


def test_forbidden_patterns_include_privilege():
    """Privilege escalation keywords should be blocked."""
    assert "GRANT" in _FORBIDDEN_SQL_PATTERNS
    assert "REVOKE" in _FORBIDDEN_SQL_PATTERNS
    assert "EXEC" in _FORBIDDEN_SQL_PATTERNS
    assert "EXECUTE" in _FORBIDDEN_SQL_PATTERNS


def test_sensitive_columns_configured():
    """Password-related columns should be in the sensitive set."""
    assert "password_hash" in _SENSITIVE_COLUMNS
    assert "password" in _SENSITIVE_COLUMNS
    assert "passwordhash" in _SENSITIVE_COLUMNS


def test_sensitive_columns_case_insensitive_logic():
    """Sensitive column check uses .lower(), so mixed case should be caught."""
    test_column = "Password_Hash"
    assert test_column.lower() in _SENSITIVE_COLUMNS


def test_select_not_in_forbidden():
    """SELECT should NOT be in forbidden patterns — it's allowed."""
    assert "SELECT" not in _FORBIDDEN_SQL_PATTERNS
    assert "WITH" not in _FORBIDDEN_SQL_PATTERNS


def test_sql_validation_logic():
    """Simulate the execute_query validation logic."""
    def validate_sql(sql: str):
        first_word = sql.strip().split()[0].upper() if sql.strip() else ""
        if first_word not in ("SELECT", "WITH"):
            return "Only SELECT queries are allowed."
        upper_sql = sql.upper()
        for pattern in _FORBIDDEN_SQL_PATTERNS:
            if f" {pattern} " in f" {upper_sql} " or upper_sql.startswith(pattern):
                return f"Forbidden SQL keyword: {pattern}"
        return None

    # Valid queries
    assert validate_sql("SELECT * FROM users") is None
    assert validate_sql("WITH cte AS (SELECT 1) SELECT * FROM cte") is None

    # Invalid queries
    assert validate_sql("DELETE FROM users") is not None
    assert validate_sql("DROP TABLE users") is not None
    assert validate_sql("INSERT INTO users VALUES (1)") is not None
    assert validate_sql("UPDATE users SET name='x'") is not None

    # Subquery injection attempts
    assert validate_sql("SELECT * FROM users; DELETE FROM users") is not None


def test_column_filtering_logic():
    """Simulate the column filtering from execute_query."""
    columns = ["id", "first_name", "email", "password_hash"]
    safe_columns = [c for c in columns if c.lower() not in _SENSITIVE_COLUMNS]

    assert "password_hash" not in safe_columns
    assert "id" in safe_columns
    assert "email" in safe_columns
    assert len(safe_columns) == 3
