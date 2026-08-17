import os
import re
import secrets
import sqlite3

from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from werkzeug.security import generate_password_hash

from db_utils import db_manager


def _google_client_ids():
    keys = (
        "GOOGLE_CLIENT_ID",
        "GOOGLE_WEB_CLIENT_ID",
        "GOOGLE_IOS_CLIENT_ID",
        "GOOGLE_ANDROID_CLIENT_ID",
    )
    return [os.environ[key] for key in keys if os.environ.get(key)]


def google_auth_configured():
    return bool(_google_client_ids())


def ensure_google_auth_schema():
    with db_manager.get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(users)")
        columns = [row[1] for row in cursor.fetchall()]
        if "google_id" not in columns:
            cursor.execute("ALTER TABLE users ADD COLUMN google_id TEXT")
        cursor.execute(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id
            ON users(google_id)
            WHERE google_id IS NOT NULL
            """
        )


def verify_google_id_token(token_str):
    audiences = _google_client_ids()
    if not audiences:
        raise ValueError("Google sign-in is not configured")

    request = google_requests.Request()
    last_error = None
    for audience in audiences:
        try:
            info = id_token.verify_oauth2_token(token_str, request, audience=audience)
            issuer = info.get("iss")
            if issuer not in ("accounts.google.com", "https://accounts.google.com"):
                raise ValueError("Invalid Google token issuer")
            if not info.get("email"):
                raise ValueError("Google account has no email")
            return info
        except Exception as exc:
            last_error = exc
    raise ValueError(str(last_error) or "Invalid Google token")


def _unique_username(base):
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


def _row_user(row):
    if row is None:
        return None
    data = dict(row)
    return {
        "id": data["id"],
        "username": data["username"],
        "email": data["email"],
        "is_admin": bool(data["is_admin"]),
    }


def find_or_create_google_user(google_sub, email, name=None):
    ensure_google_auth_schema()
    row = db_manager.execute_query(
        "SELECT id, username, email, is_admin FROM users WHERE google_id = ?",
        (google_sub,),
        fetch_one=True,
    )
    if row:
        return _row_user(row)

    row = db_manager.execute_query(
        "SELECT id, username, email, is_admin, google_id FROM users WHERE email = ?",
        (email.lower(),),
        fetch_one=True,
    )
    if row:
        data = dict(row)
        if not data.get("google_id"):
            with db_manager.get_connection() as conn:
                conn.cursor().execute(
                    "UPDATE users SET google_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                    (google_sub, data["id"]),
                )
        return {
            "id": data["id"],
            "username": data["username"],
            "email": data["email"],
            "is_admin": bool(data["is_admin"]),
        }

    username = _unique_username((name or email).split("@")[0])
    placeholder_hash = generate_password_hash(secrets.token_urlsafe(24), method="pbkdf2:sha256")
    with db_manager.get_connection() as conn:
        cursor = conn.cursor()
        try:
            cursor.execute(
                """
                INSERT INTO users (username, email, password_hash, is_admin, google_id)
                VALUES (?, ?, ?, ?, ?)
                """,
                (username, email.lower(), placeholder_hash, False, google_sub),
            )
            user_id = cursor.lastrowid
        except sqlite3.IntegrityError as exc:
            raise ValueError("Could not create user") from exc

    return get_user_payload(user_id)


def get_user_payload(user_id):
    row = db_manager.execute_query(
        "SELECT id, username, email, is_admin FROM users WHERE id = ?",
        (user_id,),
        fetch_one=True,
    )
    return _row_user(row)
