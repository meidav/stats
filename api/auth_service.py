import os
import re
import secrets
import smtplib
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage

from werkzeug.security import generate_password_hash

from auth import create_user, get_user_by_email, get_user_by_username
from db_utils import db_manager


EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
RESET_TOKEN_HOURS = 24


def ensure_password_reset_schema():
    with db_manager.get_connection() as conn:
        conn.cursor().execute(
            """
            CREATE TABLE IF NOT EXISTS password_reset_tokens (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                token_hash TEXT NOT NULL,
                expires_at DATETIME NOT NULL,
                used_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
            """
        )


def normalize_email(value):
    return (value or "").strip().lower()


def is_valid_email(value):
    return bool(EMAIL_RE.match(normalize_email(value)))


def unique_username_from_email(email):
    base = re.sub(r"[^a-z0-9]+", "", email.split("@")[0].lower()) or "player"
    candidate = base
    suffix = 2
    while get_user_by_username(candidate):
        candidate = f"{base}{suffix}"
        suffix += 1
    return candidate


def user_payload(user):
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "is_admin": user.is_admin,
    }


def register_with_email(email, password):
    email = normalize_email(email)
    if not is_valid_email(email):
        raise ValueError("Enter a valid email address")
    if len(password or "") < 8:
        raise ValueError("Password must be at least 8 characters")

    if get_user_by_email(email):
        raise ValueError("An account with this email already exists")

    username = unique_username_from_email(email)
    if not create_user(username, email, password, is_admin=False):
        raise ValueError("Could not create account")

    user = get_user_by_email(email)
    if not user:
        raise ValueError("Could not create account")
    return user


def authenticate_with_email(email, password):
    from auth import verify_password

    email = normalize_email(email)
    user = get_user_by_email(email)
    if not user or not verify_password(user, password):
        return None
    return user


def _hash_token(token):
    return generate_password_hash(token, method="pbkdf2:sha256")


def _verify_token(token, token_hash):
    from werkzeug.security import check_password_hash

    return check_password_hash(token_hash, token)


def _smtp_configured():
    return bool(os.environ.get("SMTP_HOST") and os.environ.get("SMTP_FROM"))


def _send_email(to_email, subject, body):
    if not _smtp_configured():
        print(f"[auth] SMTP not configured. Email to {to_email}: {subject}\n{body}")
        return False

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = os.environ["SMTP_FROM"]
    msg["To"] = to_email
    msg.set_content(body)

    host = os.environ["SMTP_HOST"]
    port = int(os.environ.get("SMTP_PORT", "587"))
    user = os.environ.get("SMTP_USER")
    password = os.environ.get("SMTP_PASSWORD")

    with smtplib.SMTP(host, port, timeout=20) as server:
        server.ehlo()
        if os.environ.get("SMTP_TLS", "1") != "0":
            server.starttls()
            server.ehlo()
        if user and password:
            server.login(user, password)
        server.send_message(msg)
    return True


def request_password_reset(email):
    ensure_password_reset_schema()
    email = normalize_email(email)
    if not is_valid_email(email):
        raise ValueError("Enter a valid email address")

    user_row = db_manager.execute_query(
        "SELECT id FROM users WHERE email = ?",
        (email,),
        fetch_one=True,
    )
    # Always behave the same publicly, even if email is unknown.
    if not user_row:
        return {"sent": True}

    token = secrets.token_urlsafe(32)
    token_hash = _hash_token(token)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=RESET_TOKEN_HOURS)

    with db_manager.get_connection() as conn:
        conn.cursor().execute(
            """
            INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
            VALUES (?, ?, ?)
            """,
            (user_row["id"], token_hash, expires_at.replace(tzinfo=None).isoformat(sep=" ")),
        )

    app_url = os.environ.get("APP_URL", "https://www.playtracker.org")
    reset_url = f"{app_url}/reset-password?token={token}"
    body = (
        "You requested a password reset for PlayTracker.\n\n"
        f"Reset your password using this link:\n{reset_url}\n\n"
        f"Or enter this reset code in the app:\n{token}\n\n"
        "This link expires in 24 hours. If you did not request this, ignore this email."
    )
    _send_email(email, "Reset your PlayTracker password", body)
    return {"sent": True}


def reset_password_with_token(token, password):
    ensure_password_reset_schema()
    token = (token or "").strip()
    if not token:
        raise ValueError("Reset token is required")
    if len(password or "") < 8:
        raise ValueError("Password must be at least 8 characters")

    rows = db_manager.execute_query(
        """
        SELECT id, user_id, token_hash, expires_at, used_at
        FROM password_reset_tokens
        WHERE used_at IS NULL
        ORDER BY created_at DESC
        LIMIT 50
        """,
        fetch_all=True,
    )

    match = None
    for row in rows or []:
        if _verify_token(token, row["token_hash"]):
            match = row
            break

    if not match:
        raise ValueError("Invalid or expired reset token")

    expires_at = datetime.fromisoformat(str(match["expires_at"]))
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if datetime.now(timezone.utc) > expires_at.replace(tzinfo=timezone.utc):
        raise ValueError("Invalid or expired reset token")

    password_hash = generate_password_hash(password, method="pbkdf2:sha256")
    with db_manager.get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (password_hash, match["user_id"]),
        )
        cursor.execute(
            "UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = ?",
            (match["id"],),
        )

    user = db_manager.execute_query(
        "SELECT id, username, email, is_admin FROM users WHERE id = ?",
        (match["user_id"],),
        fetch_one=True,
    )
    if not user:
        raise ValueError("User not found")

    class SimpleUser:
        def __init__(self, data):
            self.id = data["id"]
            self.username = data["username"]
            self.email = data["email"]
            self.is_admin = bool(data["is_admin"])

    return SimpleUser(user)
