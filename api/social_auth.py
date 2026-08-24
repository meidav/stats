"""Shared account lookup and creation for third-party sign-in providers."""

import re
import sqlite3

from api.user_schema import ensure_user_schema
from db_utils import db_manager

PROVIDER_COLUMNS = {"google": "google_id", "apple": "apple_id"}

_USER_FIELDS = "id, username, email, is_admin, display_name"


def unique_username(base):
    slug = re.sub(r"[^a-z0-9]+", "", (base or "player").lower()) or "player"
    candidate = slug
    suffix = 2
    while True:
        row = db_manager.execute_query(
            "SELECT id FROM users WHERE username = ?",
            (candidate,),
            fetch_one=True,
        )
        if not row:
            return candidate
        candidate = f"{slug}{suffix}"
        suffix += 1


def row_user(row):
    if row is None:
        return None
    data = dict(row)
    return {
        "id": data["id"],
        "username": data["username"],
        "email": data["email"],
        "is_admin": bool(data["is_admin"]),
        "display_name": data.get("display_name"),
    }


def get_user_payload(user_id):
    row = db_manager.execute_query(
        f"SELECT {_USER_FIELDS} FROM users WHERE id = ?",
        (user_id,),
        fetch_one=True,
    )
    return row_user(row)


def find_or_create_social_user(provider, subject, email, display_name=None):
    """Match an existing account by provider ID, then by email, otherwise create one."""
    column = PROVIDER_COLUMNS.get(provider)
    if not column:
        raise ValueError(f"Unsupported sign-in provider: {provider}")
    if not subject:
        raise ValueError("Sign-in token is missing a subject")

    ensure_user_schema()
    email = (email or "").strip().lower()

    row = db_manager.execute_query(
        f"SELECT {_USER_FIELDS} FROM users WHERE {column} = ?",
        (subject,),
        fetch_one=True,
    )
    if row:
        user = row_user(row)
        # Apple only sends the name on first authorization, so backfill when it arrives.
        if display_name and not user["display_name"]:
            _update_user(user["id"], {"display_name": display_name})
            user["display_name"] = display_name
        return user

    if not email:
        raise ValueError("No email address was shared with PlayTracker")

    row = db_manager.execute_query(
        f"SELECT {_USER_FIELDS}, {column} AS provider_id FROM users WHERE email = ?",
        (email,),
        fetch_one=True,
    )
    if row:
        data = dict(row)
        updates = {}
        if not data.get("provider_id"):
            updates[column] = subject
        if display_name and not data.get("display_name"):
            updates["display_name"] = display_name
        if updates:
            _update_user(data["id"], updates)
        user = row_user(row)
        if "display_name" in updates:
            user["display_name"] = display_name
        return user

    username = unique_username((display_name or email).split("@")[0])
    with db_manager.get_connection() as conn:
        cursor = conn.cursor()
        try:
            cursor.execute(
                f"""
                INSERT INTO users (username, email, password_hash, is_admin, display_name, {column})
                VALUES (?, ?, NULL, ?, ?, ?)
                """,
                (username, email, False, display_name, subject),
            )
            user_id = cursor.lastrowid
        except sqlite3.IntegrityError as exc:
            raise ValueError("Could not create user") from exc

    return get_user_payload(user_id)


def _update_user(user_id, values):
    assignments = ", ".join(f"{column} = ?" for column in values)
    params = list(values.values()) + [user_id]
    with db_manager.get_connection() as conn:
        conn.cursor().execute(
            f"UPDATE users SET {assignments}, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            params,
        )
