#!/usr/bin/env python3
"""Ensure database schema exists on deploy."""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from auth import create_user, create_users_table, get_user_by_email, get_user_by_username
from db_utils import db_manager
from api.auth_service import ensure_password_reset_schema
from api.google_auth import ensure_google_auth_schema
from api.league_db import create_leagues_tables


def ensure_demo_user():
    username = os.environ.get("DEMO_USER_USERNAME", "playtest")
    password = os.environ.get("DEMO_USER_PASSWORD")
    email = os.environ.get("DEMO_USER_EMAIL", "playtest@playtracker.org")

    if get_user_by_username(username):
        print(f"Demo user '{username}' already exists.")
    elif not password:
        print("DEMO_USER_PASSWORD not set; skipping demo user.")
        return
    elif create_user(username, email, password, is_admin=False):
        print(f"Demo user created: {username}")
    else:
        print(f"Failed to create demo user '{username}'.")

    # The demo login is shared with App Store review, so it must never be an admin.
    email_owner = get_user_by_email(email)
    if email_owner and email_owner.username != username:
        print(f"Email {email} already belongs to '{email_owner.username}'; leaving demo email unchanged.")
        db_manager.execute_query(
            "UPDATE users SET is_admin = 0 WHERE username = ?",
            (username,),
            fetch_all=False,
        )
    else:
        db_manager.execute_query(
            "UPDATE users SET is_admin = 0, email = ? WHERE username = ?",
            (email, username),
            fetch_all=False,
        )


# Old built-in admin accounts whose passwords were once committed to the repo.
# Matched on username AND placeholder email so real accounts are never touched.
LEGACY_ACCOUNTS = (
    ("arbel", "arbel@example.com"),
    ("admin", "admin@example.com"),
    ("admin", "admin@playtracker.org"),
)

# (table, column) pairs whose rows should keep pointing at the user for history.
_USER_HISTORY_REFS = (
    ("leagues", "owner_id"),
    ("league_games", "entered_by"),
    ("admin_audit_log", "admin_user_id"),
    ("league_activity", "admin_user_id"),
)


def _count_refs(table, column, user_id):
    try:
        row = db_manager.execute_query(
            f"SELECT COUNT(*) FROM {table} WHERE {column} = ?", (user_id,), fetch_one=True
        )
        return row[0] if row else 0
    except Exception:
        return 0  # table does not exist yet


def remove_legacy_accounts():
    for username, email in LEGACY_ACCOUNTS:
        row = db_manager.execute_query(
            "SELECT id FROM users WHERE username = ? AND lower(email) = ?",
            (username, email),
            fetch_one=True,
        )
        if not row:
            continue
        user_id = row[0]
        if any(_count_refs(t, c, user_id) for t, c in _USER_HISTORY_REFS):
            # Keep the row for history, but make it impossible to sign in as.
            db_manager.execute_query(
                "UPDATE users SET password_hash = '', is_admin = 0 WHERE id = ?",
                (user_id,),
                fetch_all=False,
            )
            print(f"Disabled legacy account '{username}' (kept for history).")
            continue
        for table in ("password_reset_tokens", "league_members"):
            try:
                db_manager.execute_query(
                    f"DELETE FROM {table} WHERE user_id = ?", (user_id,), fetch_all=False
                )
            except Exception:
                pass
        db_manager.execute_query("DELETE FROM users WHERE id = ?", (user_id,), fetch_all=False)
        print(f"Deleted legacy account '{username}'.")


def main():
    create_users_table()
    create_leagues_tables()
    ensure_google_auth_schema()
    ensure_password_reset_schema()
    ensure_demo_user()
    remove_legacy_accounts()
    print("Database bootstrap complete.")


if __name__ == "__main__":
    main()
