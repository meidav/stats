"""Schema management for the `users` table shared by password, Google, and Apple sign-in."""

import logging
import os
import shutil
import sqlite3
import time

from db_utils import db_manager

logger = logging.getLogger(__name__)

# Definitions used when the table has to be rebuilt. `password_hash` is nullable so
# social-only accounts do not need a fake hash standing in for a password.
CORE_COLUMNS = (
    ("id", "INTEGER PRIMARY KEY AUTOINCREMENT"),
    ("username", "TEXT UNIQUE NOT NULL"),
    ("email", "TEXT UNIQUE NOT NULL"),
    ("password_hash", "TEXT"),
    ("is_admin", "BOOLEAN DEFAULT FALSE"),
    ("created_at", "DATETIME DEFAULT CURRENT_TIMESTAMP"),
    ("updated_at", "DATETIME DEFAULT CURRENT_TIMESTAMP"),
    ("google_id", "TEXT"),
    ("apple_id", "TEXT"),
    ("display_name", "TEXT"),
)

# Columns safe to bolt on with ALTER TABLE when they are missing.
ADDABLE_COLUMNS = (
    ("google_id", "TEXT"),
    ("apple_id", "TEXT"),
    ("display_name", "TEXT"),
)

INDEXES = (
    """
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id
    ON users(google_id) WHERE google_id IS NOT NULL
    """,
    """
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_apple_id
    ON users(apple_id) WHERE apple_id IS NOT NULL
    """,
)

_TEMP_TABLE = "users_schema_migration"


def _table_info(cursor, table="users"):
    cursor.execute(f"PRAGMA table_info({table})")
    return [
        {
            "name": row[1],
            "type": row[2],
            "notnull": row[3],
            "default": row[4],
            "pk": row[5],
        }
        for row in cursor.fetchall()
    ]


def _users_table_exists(cursor):
    cursor.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='users'")
    return cursor.fetchone() is not None


def ensure_user_schema():
    """Bring `users` up to date: social ID columns, display name, nullable password hash."""
    with db_manager.get_connection() as conn:
        cursor = conn.cursor()
        if not _users_table_exists(cursor):
            return

        columns = {col["name"]: col for col in _table_info(cursor)}
        for name, definition in ADDABLE_COLUMNS:
            if name not in columns:
                cursor.execute(f"ALTER TABLE users ADD COLUMN {name} {definition}")

        needs_rebuild = columns.get("password_hash", {}).get("notnull")

    if needs_rebuild:
        _make_password_hash_nullable()

    with db_manager.get_connection() as conn:
        cursor = conn.cursor()
        for statement in INDEXES:
            cursor.execute(statement)


def _build_create_sql(existing):
    """Compose the rebuilt table, keeping any columns this module does not know about."""
    known = {name for name, _ in CORE_COLUMNS}
    parts = [f"{name} {definition}" for name, definition in CORE_COLUMNS]

    for col in existing:
        if col["name"] in known:
            continue
        definition = f"{col['name']} {col['type'] or 'TEXT'}"
        if col["notnull"]:
            definition += " NOT NULL"
        if col["default"] is not None:
            definition += f" DEFAULT {col['default']}"
        parts.append(definition)

    body = ",\n    ".join(parts)
    return f"CREATE TABLE {_TEMP_TABLE} (\n    {body}\n)"


def _backup_database(path):
    if not path or not os.path.exists(path):
        return None
    backup_path = f"{path}.pre-social-auth.{int(time.time())}.bak"
    shutil.copy2(path, backup_path)
    logger.info("Backed up database to %s before users migration", backup_path)
    return backup_path


def _make_password_hash_nullable():
    """Rebuild `users` so password_hash allows NULL. SQLite cannot ALTER a column in place."""
    path = db_manager.database_path
    _backup_database(path)

    # Autocommit so PRAGMA statements land outside of the migration transaction.
    conn = sqlite3.connect(path, isolation_level=None)
    conn.row_factory = sqlite3.Row
    try:
        cursor = conn.cursor()
        cursor.execute("PRAGMA foreign_keys=OFF")
        cursor.execute(f"DROP TABLE IF EXISTS {_TEMP_TABLE}")

        existing = _table_info(cursor)
        create_sql = _build_create_sql(existing)
        new_names = {name for name, _ in CORE_COLUMNS} | {
            col["name"] for col in existing
        }
        carried = [col["name"] for col in existing if col["name"] in new_names]
        column_list = ", ".join(carried)

        cursor.execute("BEGIN IMMEDIATE")
        cursor.execute(create_sql)
        cursor.execute(
            f"INSERT INTO {_TEMP_TABLE} ({column_list}) SELECT {column_list} FROM users"
        )
        cursor.execute("DROP TABLE users")
        # Legacy rename keeps SQLite from rewriting other tables' foreign key clauses.
        cursor.execute("PRAGMA legacy_alter_table=ON")
        cursor.execute(f"ALTER TABLE {_TEMP_TABLE} RENAME TO users")
        cursor.execute("PRAGMA legacy_alter_table=OFF")

        violations = cursor.execute("PRAGMA foreign_key_check").fetchall()
        if violations:
            raise sqlite3.IntegrityError(
                f"users migration left {len(violations)} foreign key violations"
            )

        cursor.execute("COMMIT")
        logger.info("Rebuilt users table with nullable password_hash")
    except Exception:
        try:
            conn.execute("ROLLBACK")
        except sqlite3.Error:
            pass
        logger.exception("users table migration failed; database left unchanged")
        raise
    finally:
        try:
            conn.execute("PRAGMA foreign_keys=ON")
        except sqlite3.Error:
            pass
        conn.close()
