"""Copy leftover /arbel data into PlayTracker leagues (photos, vollis, tennis)."""

from __future__ import annotations

import os
import re
import sqlite3

from auth import get_user_by_email
from api.game_db import add_game
from api.legacy_vb_import import _legacy_id_exists, _normalize_date, year_summary
from api.league_db import (
    add_sport_to_league,
    create_league,
    get_league_by_slug,
    get_sports_for_league,
    update_league,
)
from api.player_profiles import (
    _names_in_sport,
    get_player_profile,
    save_player_photo_bytes,
)
from api.sport_templates import default_icon_for_template, focus_for_template
from db_utils import db_manager

PHOTO_EXT = {".jpg", ".jpeg", ".png", ".webp"}


def _connect(path):
    if not os.path.isfile(path):
        raise FileNotFoundError(f"Source database not found: {path}")
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    return conn


def load_legacy_table(source_db, table, order_column):
    conn = _connect(source_db)
    try:
        tables = {
            row[0]
            for row in conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table'"
            ).fetchall()
        }
        if table not in tables:
            raise ValueError(f"Source database has no {table} table: {source_db}")
        return conn.execute(
            f"SELECT * FROM {table} ORDER BY {order_column} ASC, id ASC"
        ).fetchall()
    finally:
        conn.close()


def parse_tennis_set_scores(text):
    if not text or not str(text).strip():
        return None
    pairs = []
    for part in str(text).split(","):
        piece = part.strip()
        if not piece:
            continue
        match = re.match(r"^(\d+)\s*-\s*(\d+)$", piece)
        if not match:
            return None
        winner = int(match.group(1))
        loser = int(match.group(2))
        if winner == loser:
            return None
        pairs.append([winner, loser])
    return pairs or None


def _photo_ext(filename, data):
    ext = os.path.splitext(filename or "")[1].lower()
    if data.startswith(b"\x89PNG"):
        return ".png"
    if data.startswith(b"RIFF") and b"WEBP" in data[:16]:
        return ".webp"
    if ext in PHOTO_EXT:
        return ".jpg" if ext == ".jpeg" else ext
    return ".jpg"


def resolve_photo_file(photo_dir, filename):
    if not photo_dir or not filename:
        return None
    safe = os.path.basename(str(filename))
    candidates = [
        os.path.join(photo_dir, safe),
        os.path.join(photo_dir, "players", safe),
    ]
    for path in candidates:
        if os.path.isfile(path):
            return path
    return None


def copy_legacy_photos_to_sport(sport_id, source_db, photo_dir, skip_existing=True):
    conn = _connect(source_db)
    try:
        tables = {
            row[0]
            for row in conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table'"
            ).fetchall()
        }
        if "player_profiles" not in tables:
            return {"copied": 0, "skipped": 0, "missing_file": [], "errors": []}
        rows = conn.execute(
            "SELECT name, photo_filename FROM player_profiles WHERE photo_filename IS NOT NULL"
        ).fetchall()
    finally:
        conn.close()

    names_in_sport = _names_in_sport(sport_id)
    copied = 0
    skipped = 0
    missing_file = []
    errors = []

    for row in rows:
        name = (row["name"] or "").strip()
        filename = row["photo_filename"]
        if not name or name not in names_in_sport:
            continue
        existing = get_player_profile(sport_id, name)
        if skip_existing and existing and (existing.get("has_photo") or existing.get("photo_filename")):
            skipped += 1
            continue
        path = resolve_photo_file(photo_dir, filename)
        if not path:
            missing_file.append({"name": name, "filename": filename})
            continue
        with open(path, "rb") as handle:
            data = handle.read()
        try:
            save_player_photo_bytes(sport_id, name, data, _photo_ext(filename, data))
            copied += 1
        except Exception as exc:
            errors.append({"name": name, "error": str(exc)})

    return {
        "copied": copied,
        "skipped": skipped,
        "missing_file": missing_file,
        "errors": errors,
    }


def ensure_owner_league(email, name, slug, template_id, visibility="public"):
    user = get_user_by_email(email.strip().lower())
    if not user:
        raise ValueError(f"No user found for email {email}")

    league = get_league_by_slug(slug)
    created = False
    if league:
        if league.get("owner_id") != user.id:
            raise ValueError(f"League slug '{slug}' is owned by another user.")
    else:
        league = create_league(
            owner_id=user.id,
            name=name,
            visibility=visibility,
            slug=slug,
            focus=focus_for_template(template_id),
        )
        created = True
        icon = default_icon_for_template(template_id)
        if icon:
            league = update_league(league["id"], icon=icon)

    sports = get_sports_for_league(league["id"]) or []
    matches = [sport for sport in sports if sport.get("template_id") == template_id]
    if matches:
        sport = matches[0]
    else:
        sport = add_sport_to_league(league["id"], template_id)

    if created is False and not league.get("icon"):
        icon = default_icon_for_template(template_id)
        if icon:
            league = update_league(league["id"], icon=icon)

    return {
        "league": league,
        "sport": sport,
        "created": created,
        "user": user,
    }


def _import_singles_rows(
    sport_id,
    user_id,
    rows,
    winner_key,
    loser_key,
    date_key,
    legacy_source,
    extra_metadata=None,
    dry_run=False,
):
    imported = 0
    skipped = 0
    errors = []

    for row in rows:
        legacy_id = row["id"]
        if _legacy_id_exists(sport_id, legacy_id):
            skipped += 1
            continue

        metadata = {
            "legacy_id": legacy_id,
            "legacy_source": legacy_source,
        }
        if extra_metadata:
            extra = extra_metadata(row)
            if extra:
                metadata.update(extra)

        payload = {
            "sport_id": sport_id,
            "winners": [row[winner_key]],
            "losers": [row[loser_key]],
            "winner_score": row["winner_score"],
            "loser_score": row["loser_score"],
            "game_date": _normalize_date(row[date_key]),
            "metadata": metadata,
            "entered_by": user_id,
        }

        if dry_run:
            imported += 1
            continue

        try:
            add_game(**payload)
            imported += 1
        except Exception as exc:
            errors.append({"legacy_id": legacy_id, "error": str(exc)})

    result = {
        "source_games": len(rows),
        "imported": imported,
        "skipped": skipped,
        "errors": errors,
    }
    if not dry_run and imported:
        result["years"] = year_summary(sport_id)
    return result


def tennis_metadata(row):
    keys = row.keys() if hasattr(row, "keys") else []
    raw = row["set_scores"] if "set_scores" in keys else None
    pairs = parse_tennis_set_scores(raw)
    if not pairs:
        return None
    winner_sets = sum(1 for winner, loser in pairs if winner > loser)
    loser_sets = len(pairs) - winner_sets
    if winner_sets <= loser_sets:
        return {"set_scores": raw}
    format_id = 1 if len(pairs) <= 1 else 3 if len(pairs) <= 3 else 5
    return {"format": format_id, "sets": pairs, "set_scores": raw}


def import_legacy_vollis(email, source_db, league_slug="arbels-vollis", dry_run=False):
    target = ensure_owner_league(
        email=email,
        name="Arbel's Vollis",
        slug=league_slug,
        template_id="vollis",
        visibility="public",
    )
    rows = load_legacy_table(source_db, "vollis_games", "game_date")
    result = _import_singles_rows(
        sport_id=target["sport"]["id"],
        user_id=target["user"].id,
        rows=rows,
        winner_key="winner",
        loser_key="loser",
        date_key="game_date",
        legacy_source="vollis_games",
        dry_run=dry_run,
    )
    result["league"] = {
        "id": target["league"]["id"],
        "name": target["league"]["name"],
        "slug": target["league"]["slug"],
        "created": target["created"],
    }
    result["sport_id"] = target["sport"]["id"]
    return result


def import_legacy_tennis(email, source_db, league_slug="arbels-tennis", dry_run=False):
    target = ensure_owner_league(
        email=email,
        name="Arbel's Tennis",
        slug=league_slug,
        template_id="tennis_singles",
        visibility="unlisted",
    )
    rows = load_legacy_table(source_db, "tennis_matches", "match_date")
    result = _import_singles_rows(
        sport_id=target["sport"]["id"],
        user_id=target["user"].id,
        rows=rows,
        winner_key="winner",
        loser_key="loser",
        date_key="match_date",
        legacy_source="tennis_matches",
        extra_metadata=tennis_metadata,
        dry_run=dry_run,
    )
    result["league"] = {
        "id": target["league"]["id"],
        "name": target["league"]["name"],
        "slug": target["league"]["slug"],
        "created": target["created"],
    }
    result["sport_id"] = target["sport"]["id"]
    return result


def import_arbel_legacy_bundle(
    email,
    source_db,
    photo_dir,
    beach_slug="arbels-beach-vb",
    vollis_slug="arbels-vollis",
    tennis_slug="arbels-tennis",
    dry_run=False,
):
    beach = get_league_by_slug(beach_slug)
    user = get_user_by_email(email.strip().lower())
    if not user:
        raise ValueError(f"No user found for email {email}")
    if not beach or beach.get("owner_id") != user.id:
        raise ValueError(f"User {email} does not own league '{beach_slug}'.")
    beach_sports = [
        sport
        for sport in (get_sports_for_league(beach["id"]) or [])
        if sport.get("template_id") == "beach_volleyball_2s"
    ]
    if not beach_sports:
        raise ValueError(f"League '{beach_slug}' has no beach volleyball sport.")

    result = {"email": email, "source_db": source_db}
    if dry_run:
        result["photos"] = {"note": "dry-run does not copy photos"}
    else:
        result["beach_photos"] = copy_legacy_photos_to_sport(
            beach_sports[0]["id"], source_db, photo_dir
        )

    result["vollis"] = import_legacy_vollis(
        email, source_db, league_slug=vollis_slug, dry_run=dry_run
    )
    result["tennis"] = import_legacy_tennis(
        email, source_db, league_slug=tennis_slug, dry_run=dry_run
    )

    if not dry_run:
        result["vollis_photos"] = copy_legacy_photos_to_sport(
            result["vollis"]["sport_id"], source_db, photo_dir
        )
        result["tennis_photos"] = copy_legacy_photos_to_sport(
            result["tennis"]["sport_id"], source_db, photo_dir
        )
    return result
