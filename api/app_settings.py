from datetime import timedelta

from db_utils import db_manager

DEFAULTS = {
    "jwt_access_token_days": "30",
}

SETTING_LABELS = {
    "jwt_access_token_days": {
        "label": "App session duration (days)",
        "hint": "How long someone stays signed in on the PlayTracker app after login. Existing sessions keep their old expiry until the next sign-in.",
        "min": 1,
        "max": 365,
    },
}


def ensure_settings_schema():
    db_manager.execute_query(
        """
        CREATE TABLE IF NOT EXISTS app_settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
        """,
        fetch_all=False,
    )
    for key, value in DEFAULTS.items():
        db_manager.execute_query(
            """
            INSERT OR IGNORE INTO app_settings (key, value)
            VALUES (?, ?)
            """,
            (key, value),
            fetch_all=False,
        )


def get_setting(key, default=None):
    row = db_manager.execute_query(
        "SELECT value FROM app_settings WHERE key = ?",
        (key,),
        fetch_one=True,
    )
    if row is None:
        return DEFAULTS.get(key, default)
    data = dict(row)
    return data.get("value", DEFAULTS.get(key, default))


def set_setting(key, value):
    db_manager.execute_query(
        """
        INSERT INTO app_settings (key, value, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET
            value = excluded.value,
            updated_at = CURRENT_TIMESTAMP
        """,
        (key, str(value)),
        fetch_all=False,
    )


def jwt_access_token_days():
    try:
        days = int(get_setting("jwt_access_token_days", DEFAULTS["jwt_access_token_days"]))
    except (TypeError, ValueError):
        days = 30
    return max(1, min(days, 365))


def apply_runtime_settings(app):
    days = jwt_access_token_days()
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(days=days)
    app.config["PERMANENT_SESSION_LIFETIME"] = timedelta(days=days)
    return days
