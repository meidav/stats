#!/usr/bin/env python3
"""Ensure database schema exists on deploy."""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from auth import create_user, create_users_table, get_user_by_username
from api.auth_service import ensure_password_reset_schema
from api.google_auth import ensure_google_auth_schema
from api.league_db import create_leagues_tables


def ensure_demo_user():
    username = os.environ.get("DEMO_USER_USERNAME", "playtest")
    password = os.environ.get("DEMO_USER_PASSWORD", "playtest123")
    email = os.environ.get("DEMO_USER_EMAIL", "playtest@playtracker.org")

    if get_user_by_username(username):
        print(f"Demo user '{username}' already exists.")
        return

    if create_user(username, email, password, is_admin=False):
        print(f"Demo user created: {username}")
    else:
        print(f"Failed to create demo user '{username}'.")


def main():
    create_users_table()
    create_leagues_tables()
    ensure_google_auth_schema()
    ensure_password_reset_schema()
    ensure_demo_user()
    print("Database bootstrap complete.")


if __name__ == "__main__":
    main()
