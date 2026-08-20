"""Admin-console data access. Privacy settings do not hide rows here."""

from datetime import datetime, timezone
import os

from db_utils import db_manager
from api.league_db import _ensure_column, _row_to_dict, sync_owner_memberships


def ensure_admin_schema():
    with db_manager.get_connection() as conn:
        cursor = conn.cursor()
        _ensure_column(cursor, "users", "last_seen_at", "DATETIME")
        _ensure_column(cursor, "users", "must_change_password", "INTEGER NOT NULL DEFAULT 0")
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS admin_audit_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                admin_user_id INTEGER,
                action TEXT NOT NULL,
                target_type TEXT,
                target_id TEXT,
                detail TEXT,
                ip TEXT,
                user_agent TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON admin_audit_log(created_at)"
        )


def touch_last_seen(user_id):
    if not user_id:
        return
    ensure_admin_schema()
    db_manager.execute_query(
        "UPDATE users SET last_seen_at = CURRENT_TIMESTAMP WHERE id = ?",
        (user_id,),
        fetch_all=False,
    )


def write_audit(admin_user_id, action, target_type=None, target_id=None, detail=None, ip=None, user_agent=None):
    ensure_admin_schema()
    db_manager.execute_query(
        """
        INSERT INTO admin_audit_log (
            admin_user_id, action, target_type, target_id, detail, ip, user_agent
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            admin_user_id,
            action,
            target_type,
            str(target_id) if target_id is not None else None,
            detail,
            ip,
            (user_agent or "")[:300] or None,
        ),
        fetch_all=False,
    )


def count_admins():
    row = db_manager.execute_query(
        "SELECT COUNT(*) AS n FROM users WHERE is_admin = 1",
        fetch_one=True,
    )
    return int(dict(row)["n"] if row else 0)


def would_lock_out(target_user_id):
    """True if removing admin from this user would leave zero super-admins."""
    user = db_manager.execute_query(
        "SELECT id, is_admin FROM users WHERE id = ?",
        (target_user_id,),
        fetch_one=True,
    )
    if not user or not user["is_admin"]:
        return False
    return count_admins() <= 1


def overview_counts():
    ensure_admin_schema()
    sync_owner_memberships()
    row = db_manager.execute_query(
        """
        SELECT
          (SELECT COUNT(*) FROM users) AS users,
          (SELECT COUNT(*) FROM users WHERE is_admin = 1) AS admins,
          (SELECT COUNT(*) FROM leagues) AS leagues,
          (SELECT COUNT(*) FROM leagues WHERE visibility = 'public') AS public_leagues,
          (SELECT COUNT(*) FROM leagues WHERE visibility = 'unlisted') AS unlisted_leagues,
          (SELECT COUNT(*) FROM leagues WHERE visibility = 'private') AS private_leagues,
          (SELECT COUNT(*) FROM league_games) AS games
        """,
        fetch_one=True,
    )
    data = dict(row) if row else {}
    return {
        "users": int(data.get("users") or 0),
        "admins": int(data.get("admins") or 0),
        "leagues": int(data.get("leagues") or 0),
        "public_leagues": int(data.get("public_leagues") or 0),
        "unlisted_leagues": int(data.get("unlisted_leagues") or 0),
        "private_leagues": int(data.get("private_leagues") or 0),
        "games": int(data.get("games") or 0),
    }


def _parse_dt(value):
    if not value:
        return None
    text = str(value).strip()
    if not text:
        return None
    for candidate in (text, text.replace("T", " ")):
        try:
            parsed = datetime.fromisoformat(candidate)
            if parsed.tzinfo is None:
                parsed = parsed.replace(tzinfo=timezone.utc)
            return parsed
        except ValueError:
            continue
    return None


def relative_time(value, now=None):
    parsed = _parse_dt(value)
    if not parsed:
        return "Never"
    now = now or datetime.now(timezone.utc)
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)
    delta = now - parsed
    seconds = int(delta.total_seconds())
    if seconds < 0:
        return "Just now"
    if seconds < 60:
        return "Just now"
    if seconds < 3600:
        minutes = seconds // 60
        return f"{minutes} min ago" if minutes != 1 else "1 min ago"
    if seconds < 86400:
        hours = seconds // 3600
        return f"{hours}h ago" if hours != 1 else "1h ago"
    if seconds < 86400 * 7:
        days = seconds // 86400
        return f"{days}d ago" if days != 1 else "Yesterday"
    return f"{parsed.strftime('%b')} {parsed.day}, {parsed.year}"


def initials(name):
    parts = [part for part in str(name or "").strip().split() if part]
    if not parts:
        email = str(name or "")
        return (email[:1] or "?").upper()
    if len(parts) == 1:
        token = parts[0]
        if "@" in token:
            token = token.split("@")[0]
        return token[:2].upper()
    return f"{parts[0][0]}{parts[-1][0]}".upper()


def _leagues_by_user():
    sync_owner_memberships()
    rows = db_manager.execute_query(
        """
        SELECT lm.user_id, lm.role, l.id, l.name, l.slug, l.visibility, l.owner_id,
               l.focus, l.icon, l.updated_at,
               (
                 SELECT COUNT(*) FROM league_games g WHERE g.league_id = l.id
               ) AS game_count,
               (
                 SELECT COUNT(*) FROM sports s WHERE s.league_id = l.id
               ) AS sport_count,
               (
                 SELECT s2.name FROM sports s2
                 WHERE s2.league_id = l.id
                 ORDER BY s2.created_at ASC LIMIT 1
               ) AS sport_name,
               (
                 SELECT s2.template_id FROM sports s2
                 WHERE s2.league_id = l.id
                 ORDER BY s2.created_at ASC LIMIT 1
               ) AS template_id
        FROM league_members lm
        JOIN leagues l ON l.id = lm.league_id
        ORDER BY game_count DESC, l.name COLLATE NOCASE ASC
        """
    )
    grouped = {}
    for row in rows or []:
        item = _row_to_dict(row)
        grouped.setdefault(item["user_id"], []).append({
            "id": item["id"],
            "name": item["name"],
            "slug": item["slug"],
            "visibility": item["visibility"] or "public",
            "role": item["role"] or "member",
            "owner_id": item["owner_id"],
            "game_count": int(item["game_count"] or 0),
            "sport_count": int(item["sport_count"] or 0),
            "sport_name": item["sport_name"],
            "template_id": item["template_id"],
            "focus": item.get("focus") or "mixed",
        })
    return grouped


def list_users_for_admin(query=None, role=None, visibility=None):
    """All users with nested league summaries. Private leagues are included."""
    ensure_admin_schema()
    params = []
    sql = """
        SELECT u.id, u.username, u.email, u.is_admin, u.created_at, u.updated_at, u.last_seen_at,
               (
                 SELECT MAX(activity) FROM (
                   SELECT u.last_seen_at AS activity
                   UNION ALL SELECT u.updated_at
                   UNION ALL SELECT u.created_at
                   UNION ALL SELECT MAX(g.created_at)
                     FROM league_games g
                     JOIN league_members lm ON lm.league_id = g.league_id AND lm.user_id = u.id
                   UNION ALL SELECT MAX(g2.created_at)
                     FROM league_games g2 WHERE g2.entered_by = u.id
                 )
               ) AS last_active_at
        FROM users u
        WHERE 1 = 1
    """
    if query:
        sql += """ AND (
            u.username LIKE ? OR u.email LIKE ?
            OR EXISTS (
                SELECT 1 FROM league_members lm
                JOIN leagues l ON l.id = lm.league_id
                WHERE lm.user_id = u.id AND l.name LIKE ?
            )
        )"""
        pattern = f"%{query.strip()}%"
        params.extend([pattern, pattern, pattern])
    if role == "admin":
        sql += " AND u.is_admin = 1"
    elif role == "user":
        sql += " AND (u.is_admin = 0 OR u.is_admin IS NULL)"
    sql += " ORDER BY datetime(COALESCE(last_active_at, u.created_at)) DESC, u.id DESC"

    rows = [_row_to_dict(row) for row in db_manager.execute_query(sql, tuple(params)) or []]
    leagues = _leagues_by_user()
    admin_total = count_admins()
    results = []
    for row in rows:
        user_leagues = leagues.get(row["id"], [])
        if visibility:
            if not any(item["visibility"] == visibility for item in user_leagues):
                continue
        last_active_at = row.get("last_active_at") or row.get("last_seen_at") or row.get("updated_at")
        results.append({
            "id": row["id"],
            "username": row["username"],
            "email": row["email"],
            "is_admin": bool(row["is_admin"]),
            "created_at": row["created_at"],
            "last_seen_at": row.get("last_seen_at"),
            "last_active_at": last_active_at,
            "last_active_label": relative_time(last_active_at),
            "initials": initials(row.get("username") or row.get("email")),
            "leagues": user_leagues,
            "league_count": len(user_leagues),
            "game_count": sum(item["game_count"] for item in user_leagues),
            "is_last_admin": bool(row["is_admin"]) and admin_total <= 1,
        })
    return results


def get_user_for_admin(user_id):
    users = list_users_for_admin()
    for user in users:
        if user["id"] == int(user_id):
            return user
    return None


BOOTSTRAP_EMAIL = "arbelmeidav@gmail.com"
BOOTSTRAP_USERNAME = "arbelmeidav"
BOOTSTRAP_PASSWORD = "admin123"
BOOTSTRAP_FLAG = "admin_console_bootstrap_v1"
FORBIDDEN_PASSWORDS = {"admin123", "password", "password12", "passw0rd"}


def user_requires_password_change(user_id):
    if not user_id:
        return False
    ensure_admin_schema()
    row = db_manager.execute_query(
        "SELECT must_change_password FROM users WHERE id = ?",
        (user_id,),
        fetch_one=True,
    )
    if not row:
        return False
    return bool(dict(row).get("must_change_password"))


def set_must_change_password(user_id, required):
    ensure_admin_schema()
    db_manager.execute_query(
        "UPDATE users SET must_change_password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        (1 if required else 0, user_id),
        fetch_all=False,
    )


def set_user_password(user_id, password, require_change=False):
    from werkzeug.security import generate_password_hash

    if len(password or "") < 8:
        raise ValueError("Password must be at least 8 characters")
    password_hash = generate_password_hash(password, method="pbkdf2:sha256")
    ensure_admin_schema()
    db_manager.execute_query(
        """
        UPDATE users
        SET password_hash = ?, must_change_password = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        """,
        (password_hash, 1 if require_change else 0, user_id),
        fetch_all=False,
    )


def password_is_forbidden(password):
    return (password or "").strip().lower() in FORBIDDEN_PASSWORDS


def _testing():
    if os.environ.get("FLASK_TESTING") == "1":
        return True
    try:
        from flask import current_app
        return bool(current_app.config.get("TESTING"))
    except Exception:
        return False


def ensure_bootstrap_admin(force=False, email=None, password=None, username=None):
    """Create the main super-admin once per database, with a forced password change."""
    from auth import create_user, get_user_by_email, update_user_admin_status
    from api.app_settings import ensure_settings_schema, get_setting, set_setting

    if not force and _testing():
        return None

    ensure_admin_schema()
    ensure_settings_schema()
    email = (email or os.environ.get("ADMIN_BOOTSTRAP_EMAIL") or BOOTSTRAP_EMAIL).strip().lower()
    password = password or os.environ.get("ADMIN_BOOTSTRAP_PASSWORD") or BOOTSTRAP_PASSWORD
    username = (username or BOOTSTRAP_USERNAME).strip()

    already = get_setting(BOOTSTRAP_FLAG)
    user = get_user_by_email(email)
    if already:
        if user and not user.is_admin:
            update_user_admin_status(user.id, True)
        return user

    if not user:
        created = create_user(username, email, password, is_admin=True)
        if not created:
            from api.auth_service import unique_username_from_email
            create_user(unique_username_from_email(email), email, password, is_admin=True)
        user = get_user_by_email(email)
    elif not user.is_admin:
        update_user_admin_status(user.id, True)

    if user:
        set_user_password(user.id, password, require_change=True)
        set_setting(BOOTSTRAP_FLAG, email)
        return get_user_by_email(email)
    return None

