import base64
import json
import os
import re
import uuid

from api.brand import APP_URL
from db_utils import db_manager

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ALLOWED_PHOTO_EXT = {".jpg", ".jpeg", ".png", ".webp"}
MAX_PHOTO_BYTES = 2 * 1024 * 1024
PHOTO_MIME = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
}


def get_upload_dir():
    env = os.environ.get("LEAGUE_PLAYER_UPLOAD_DIR")
    if env:
        return env
    volume = os.environ.get("RAILWAY_VOLUME_MOUNT_PATH")
    if volume:
        return os.path.join(volume, "uploads", "league-players")
    db_path = os.environ.get("DATABASE_PATH") or ""
    if db_path.startswith("/data"):
        return os.path.join("/data", "uploads", "league-players")
    return os.path.join(BASE_DIR, "static", "uploads", "league-players")


def _photo_path(filename):
    return os.path.join(get_upload_dir(), filename)


def _ensure_profile_columns(cursor):
    cursor.execute("PRAGMA table_info(sport_player_profiles)")
    existing = [row[1] for row in cursor.fetchall()]
    if "photo_bytes" not in existing:
        cursor.execute("ALTER TABLE sport_player_profiles ADD COLUMN photo_bytes BLOB")
    if "photo_mime" not in existing:
        cursor.execute("ALTER TABLE sport_player_profiles ADD COLUMN photo_mime TEXT")


def ensure_player_profile_table():
    os.makedirs(get_upload_dir(), exist_ok=True)
    with db_manager.get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS sport_player_profiles (
                sport_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                photo_filename TEXT,
                photo_bytes BLOB,
                photo_mime TEXT,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (sport_id, name),
                FOREIGN KEY (sport_id) REFERENCES sports(id)
            )
            """
        )
        _ensure_profile_columns(cursor)


def _slugify_name(name):
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", (name or "").strip().lower()).strip("-")
    return slug[:40] or "player"


def get_player_profile(sport_id, name):
    ensure_player_profile_table()
    row = db_manager.execute_query(
        """
        SELECT sport_id, name, photo_filename, photo_mime,
               CASE WHEN photo_bytes IS NULL THEN 0 ELSE 1 END AS has_photo
        FROM sport_player_profiles
        WHERE sport_id = ? AND name = ?
        """,
        (sport_id, name),
        fetch_one=True,
    )
    return dict(row) if row else None


def _media_url(filename, mtime=0):
    url = f"/media/league-players/{filename}"
    if mtime:
        url = f"{url}?v={int(mtime)}"
    return url


def get_player_photo_url(sport_id, name, absolute=True):
    profile = get_player_profile(sport_id, name)
    if not profile:
        return None
    filename = profile.get("photo_filename")
    has_photo = bool(profile.get("has_photo") or filename)
    if not has_photo:
        return None
    if filename:
        path = _photo_path(filename)
        mtime = 0
        if os.path.isfile(path):
            try:
                mtime = os.path.getmtime(path)
            except OSError:
                mtime = 0
            url = _media_url(filename, mtime)
            return f"{APP_URL}{url}" if absolute else url
        if profile.get("has_photo"):
            _restore_photo_file(sport_id, name)
            url = _media_url(filename)
            return f"{APP_URL}{url}" if absolute else url
        return None
    return None


def _restore_photo_file(sport_id, name):
    row = db_manager.execute_query(
        """
        SELECT photo_filename, photo_bytes
        FROM sport_player_profiles
        WHERE sport_id = ? AND name = ?
        """,
        (sport_id, name),
        fetch_one=True,
    )
    if not row or not row["photo_bytes"] or not row["photo_filename"]:
        return
    dest = _photo_path(row["photo_filename"])
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    if os.path.isfile(dest):
        return
    with open(dest, "wb") as handle:
        handle.write(row["photo_bytes"])


def get_photo_by_filename(filename):
    ensure_player_profile_table()
    safe = os.path.basename(filename or "")
    if not safe or safe != filename or ".." in filename:
        return None
    row = db_manager.execute_query(
        """
        SELECT photo_filename, photo_bytes, photo_mime
        FROM sport_player_profiles
        WHERE photo_filename = ?
        """,
        (safe,),
        fetch_one=True,
    )
    if not row:
        return None
    path = _photo_path(safe)
    data = row["photo_bytes"]
    if data and not os.path.isfile(path):
        os.makedirs(get_upload_dir(), exist_ok=True)
        with open(path, "wb") as handle:
            handle.write(data)
    if not os.path.isfile(path) and not data:
        return None
    return {
        "filename": safe,
        "path": path if os.path.isfile(path) else None,
        "bytes": data,
        "mime": row["photo_mime"] or "image/jpeg",
        "directory": get_upload_dir(),
    }


def _decode_photo_payload(photo):
    if not photo:
        raise ValueError("photo is required")
    raw = str(photo).strip()
    ext = ".jpg"
    if raw.startswith("data:"):
        header, _, payload = raw.partition(",")
        raw = payload
        if "image/png" in header:
            ext = ".png"
        elif "image/webp" in header:
            ext = ".webp"
        elif "image/jpeg" in header or "image/jpg" in header:
            ext = ".jpg"
    try:
        data = base64.b64decode(raw, validate=False)
    except (ValueError, TypeError):
        raise ValueError("photo must be a base64 image")
    if not data:
        raise ValueError("photo is empty")
    if len(data) > MAX_PHOTO_BYTES:
        raise ValueError("photo is too large")
    if data.startswith(b"\x89PNG"):
        ext = ".png"
    elif data.startswith(b"RIFF") and b"WEBP" in data[:16]:
        ext = ".webp"
    return data, ext


def save_player_photo(sport_id, name, photo):
    ensure_player_profile_table()
    os.makedirs(get_upload_dir(), exist_ok=True)
    data, ext = _decode_photo_payload(photo)
    if ext not in ALLOWED_PHOTO_EXT:
        raise ValueError("photo must be a jpg, png, or webp")

    existing = get_player_profile(sport_id, name)
    filename = f"{sport_id}-{_slugify_name(name)}-{uuid.uuid4().hex[:10]}{ext}"
    dest = _photo_path(filename)
    with open(dest, "wb") as handle:
        handle.write(data)

    old_name = (existing or {}).get("photo_filename")
    mime = PHOTO_MIME.get(ext, "image/jpeg")
    with db_manager.get_connection() as conn:
        conn.execute(
            """
            INSERT INTO sport_player_profiles (
                sport_id, name, photo_filename, photo_bytes, photo_mime, updated_at
            )
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(sport_id, name)
            DO UPDATE SET
                photo_filename = excluded.photo_filename,
                photo_bytes = excluded.photo_bytes,
                photo_mime = excluded.photo_mime,
                updated_at = CURRENT_TIMESTAMP
            """,
            (sport_id, name, filename, data, mime),
        )
    if old_name and old_name != filename:
        old_path = _photo_path(old_name)
        if os.path.isfile(old_path):
            try:
                os.remove(old_path)
            except OSError:
                pass
    return get_player_photo_url(sport_id, name)


def clear_player_photo(sport_id, name):
    ensure_player_profile_table()
    existing = get_player_profile(sport_id, name)
    filename = (existing or {}).get("photo_filename")
    with db_manager.get_connection() as conn:
        conn.execute(
            """
            INSERT INTO sport_player_profiles (
                sport_id, name, photo_filename, photo_bytes, photo_mime, updated_at
            )
            VALUES (?, ?, NULL, NULL, NULL, CURRENT_TIMESTAMP)
            ON CONFLICT(sport_id, name)
            DO UPDATE SET
                photo_filename = NULL,
                photo_bytes = NULL,
                photo_mime = NULL,
                updated_at = CURRENT_TIMESTAMP
            """,
            (sport_id, name),
        )
    if filename:
        path = _photo_path(filename)
        if os.path.isfile(path):
            try:
                os.remove(path)
            except OSError:
                pass


def _names_in_sport(sport_id):
    rows = db_manager.execute_query(
        "SELECT winners, losers FROM league_games WHERE sport_id = ?",
        (sport_id,),
    ) or []
    names = set()
    for row in rows:
        data = dict(row)
        for key in ("winners", "losers"):
            value = data.get(key)
            if isinstance(value, list):
                names.update(value)
            elif value:
                names.update(json.loads(value))
    return names


def player_exists_in_sport(sport_id, name):
    return name in _names_in_sport(sport_id)


def rename_player_in_sport(sport_id, old_name, new_name):
    old_name = (old_name or "").strip()
    new_name = (new_name or "").strip()
    if not old_name:
        raise ValueError("current name is required")
    if not new_name:
        raise ValueError("name is required")
    if new_name == old_name:
        return new_name

    names = _names_in_sport(sport_id)
    if old_name not in names:
        raise ValueError("player not found")
    if new_name in names:
        raise ValueError("a player with that name already exists")

    ensure_player_profile_table()
    with db_manager.get_connection() as conn:
        cursor = conn.cursor()
        rows = cursor.execute(
            "SELECT id, winners, losers FROM league_games WHERE sport_id = ?",
            (sport_id,),
        ).fetchall()
        for row in rows:
            winners = json.loads(row["winners"]) if not isinstance(row["winners"], list) else row["winners"]
            losers = json.loads(row["losers"]) if not isinstance(row["losers"], list) else row["losers"]
            next_winners = [new_name if item == old_name else item for item in winners]
            next_losers = [new_name if item == old_name else item for item in losers]
            if next_winners == winners and next_losers == losers:
                continue
            cursor.execute(
                """
                UPDATE league_games
                SET winners = ?, losers = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                (json.dumps(next_winners), json.dumps(next_losers), row["id"]),
            )
        cursor.execute(
            """
            UPDATE sport_player_profiles
            SET name = ?, updated_at = CURRENT_TIMESTAMP
            WHERE sport_id = ? AND name = ?
            """,
            (new_name, sport_id, old_name),
        )
        cursor.execute(
            "UPDATE leagues SET updated_at = CURRENT_TIMESTAMP WHERE id = (SELECT league_id FROM sports WHERE id = ?)",
            (sport_id,),
        )
    return new_name
