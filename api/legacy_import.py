import os
import sqlite3
import urllib.request

LEGACY_TABLES = (
    "games",
    "vollis_games",
    "tennis_matches",
    "one_v_one_games",
    "other_games",
    "poker_sessions",
    "player_profiles",
)

PA_ORIGIN = os.environ.get("PYTHONANYWHERE_ORIGIN", "https://arbel.pythonanywhere.com")


def _table_names(conn):
    rows = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    ).fetchall()
    return {row[0] for row in rows}


def _columns(conn, table):
    return [row[1] for row in conn.execute(f"PRAGMA table_info({table})").fetchall()]


def _ensure_table(dest, source, table):
    row = source.execute(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name=?",
        (table,),
    ).fetchone()
    if not row or not row[0]:
        return False
    dest.execute(row[0])
    return True


def import_legacy_sqlite(source_path, dest_path):
    source = sqlite3.connect(source_path)
    dest = sqlite3.connect(dest_path)
    source.row_factory = sqlite3.Row
    report = {}
    try:
        src_tables = _table_names(source)
        for table in LEGACY_TABLES:
            if table not in src_tables:
                report[table] = "skipped (not in source)"
                continue
            if table not in _table_names(dest):
                _ensure_table(dest, source, table)
            src_cols = _columns(source, table)
            dest_cols = _columns(dest, table)
            cols = [col for col in src_cols if col in dest_cols]
            if not cols:
                report[table] = "skipped (no shared columns)"
                continue
            quoted = ", ".join(cols)
            placeholders = ", ".join(["?"] * len(cols))
            rows = [
                tuple(row[col] for col in cols)
                for row in source.execute(f"SELECT {quoted} FROM {table}")
            ]
            dest.execute(f"DELETE FROM {table}")
            if rows:
                dest.executemany(
                    f"INSERT INTO {table} ({quoted}) VALUES ({placeholders})",
                    rows,
                )
            report[table] = f"imported {len(rows)} row{'s' if len(rows) != 1 else ''}"

        if "users" in src_tables and "users" in _table_names(dest):
            src_cols = _columns(source, "users")
            dest_cols = _columns(dest, "users")
            cols = [col for col in src_cols if col in dest_cols]
            if cols:
                quoted = ", ".join(cols)
                placeholders = ", ".join(["?"] * len(cols))
                inserted = 0
                for row in source.execute(f"SELECT {quoted} FROM users"):
                    values = tuple(row[col] for col in cols)
                    try:
                        dest.execute(
                            f"INSERT OR IGNORE INTO users ({quoted}) VALUES ({placeholders})",
                            values,
                        )
                        inserted += dest.rowcount > 0
                    except sqlite3.Error:
                        continue
                report["users"] = f"merged {inserted} missing account(s)"
        dest.commit()
        _sync_sequences(dest, LEGACY_TABLES + ("users",))
        dest.commit()
    finally:
        source.close()
        dest.close()
    return report


def _sync_sequences(dest, tables):
    names = _table_names(dest)
    for table in tables:
        if table not in names:
            continue
        cols = _columns(dest, table)
        if "id" not in cols:
            continue
        try:
            dest.execute("DELETE FROM sqlite_sequence WHERE name = ?", (table,))
            dest.execute(
                f"INSERT INTO sqlite_sequence(name, seq) SELECT ?, COALESCE(MAX(id), 0) FROM {table}",
                (table,),
            )
        except sqlite3.Error:
            continue


def fetch_player_photos(dest_db_path, upload_dir, origin=PA_ORIGIN):
    os.makedirs(upload_dir, exist_ok=True)
    conn = sqlite3.connect(dest_db_path)
    try:
        if "player_profiles" not in _table_names(conn):
            return {"fetched": 0, "missing": 0, "skipped": 0}
        rows = conn.execute(
            "SELECT photo_filename FROM player_profiles WHERE photo_filename IS NOT NULL AND photo_filename != ''"
        ).fetchall()
    finally:
        conn.close()

    fetched = missing = skipped = 0
    for (filename,) in rows:
        dest = os.path.join(upload_dir, filename)
        if os.path.isfile(dest) and os.path.getsize(dest) > 0:
            skipped += 1
            continue
        url = f"{origin.rstrip('/')}/static/uploads/players/{filename}"
        try:
            urllib.request.urlretrieve(url, dest)
            if os.path.isfile(dest) and os.path.getsize(dest) > 0:
                fetched += 1
            else:
                missing += 1
        except Exception:
            missing += 1
    return {"fetched": fetched, "missing": missing, "skipped": skipped}
