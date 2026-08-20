"""Import legacy doubles beach volleyball games into a PlayTracker league sport."""

from __future__ import annotations

import json
import os
import sqlite3

from auth import get_user_by_email
from api.game_db import add_game
from api.league_db import delete_league, get_league_by_slug, get_sports_for_league
from db_utils import db_manager


def _normalize_date(value):
    if not value:
        return None
    text = str(value).strip().replace("T", " ")
    if "." in text:
        text = text.split(".", 1)[0]
    if len(text) == 16:
        text += ":00"
    return text[:19]


def _legacy_id_exists(sport_id, legacy_id):
    rows = db_manager.execute_query(
        """
        SELECT id FROM league_games
        WHERE sport_id = ?
          AND json_extract(metadata, '$.legacy_id') = ?
        LIMIT 1
        """,
        (sport_id, legacy_id),
    )
    return bool(rows)


def load_legacy_games(source_db):
    if not os.path.isfile(source_db):
        raise FileNotFoundError(f"Source database not found: {source_db}")

    conn = sqlite3.connect(source_db)
    conn.row_factory = sqlite3.Row
    try:
        tables = {
            row[0]
            for row in conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table'"
            ).fetchall()
        }
        if "games" not in tables:
            raise ValueError(f"Source database has no games table: {source_db}")
        return conn.execute("SELECT * FROM games ORDER BY game_date ASC, id ASC").fetchall()
    finally:
        conn.close()


def resolve_beach_vb_sport(email, league_slug=None, sport_id=None):
    if sport_id:
        row = db_manager.execute_query(
            """
            SELECT s.id, s.league_id, s.name, s.template_id, l.slug, l.name AS league_name, l.owner_id
            FROM sports s
            JOIN leagues l ON l.id = s.league_id
            WHERE s.id = ?
            """,
            (sport_id,),
            fetch_one=True,
        )
        if not row:
            raise ValueError(f"Sport id {sport_id} not found.")
        return dict(row)

    user = get_user_by_email(email.strip().lower())
    if not user:
        raise ValueError(f"No user found for email {email}")

    if league_slug:
        league = get_league_by_slug(league_slug.strip())
        if not league:
            raise ValueError(f"League slug '{league_slug}' not found.")
        if league.get("owner_id") != user.id:
            raise ValueError(f"User {email} does not own league '{league_slug}'.")
        sports = get_sports_for_league(league["id"])
        matches = [s for s in sports if s.get("template_id") == "beach_volleyball_2s"]
        if not matches:
            raise ValueError(f"League '{league_slug}' has no beach_volleyball_2s sport.")
        sport = matches[0]
        return {
            "id": sport["id"],
            "league_id": sport["league_id"],
            "name": sport["name"],
            "template_id": sport["template_id"],
            "slug": league["slug"],
            "league_name": league["name"],
            "owner_id": league["owner_id"],
        }

    rows = db_manager.execute_query(
        """
        SELECT s.id, s.league_id, s.name, s.template_id, l.slug, l.name AS league_name, l.owner_id
        FROM sports s
        JOIN leagues l ON l.id = s.league_id
        WHERE l.owner_id = ? AND s.template_id = 'beach_volleyball_2s'
        ORDER BY s.created_at ASC
        """,
        (user.id,),
    )
    sports = [dict(row) for row in rows or []]
    if not sports:
        raise ValueError(
            f"No beach_volleyball_2s sport found for {email}. Create the league first."
        )
    if len(sports) > 1:
        names = [f"{s['league_name']} ({s['slug']}) sport {s['id']}" for s in sports]
        raise ValueError(
            "Multiple beach volleyball leagues found; pass league_slug or run dedupe first. "
            + "; ".join(names)
        )
    return sports[0]


def beach_vb_leagues_for_user(email):
    user = get_user_by_email(email.strip().lower())
    if not user:
        raise ValueError(f"No user found for email {email}")

    rows = db_manager.execute_query(
        """
        SELECT l.id, l.name, l.slug, l.created_at,
               s.id AS sport_id,
               (SELECT COUNT(*) FROM league_games g WHERE g.sport_id = s.id) AS game_count
        FROM leagues l
        JOIN sports s ON s.league_id = l.id AND s.template_id = 'beach_volleyball_2s'
        WHERE l.owner_id = ?
        ORDER BY l.created_at ASC, l.id ASC
        """,
        (user.id,),
    )
    return [dict(row) for row in rows or []]


def dedupe_beach_vb_leagues(email, keep_league_id=None):
    leagues = beach_vb_leagues_for_user(email)
    if len(leagues) <= 1:
        return {"kept": leagues[0] if leagues else None, "removed": []}

    if keep_league_id:
        keep = next((item for item in leagues if item["id"] == keep_league_id), None)
        if not keep:
            raise ValueError(f"League id {keep_league_id} not found for {email}")
    else:
        keep = max(leagues, key=lambda item: (item["game_count"], -item["id"]))
        ties = [item for item in leagues if item["game_count"] == keep["game_count"]]
        if len(ties) > 1:
            keep = min(ties, key=lambda item: item["id"])

    removed = []
    for league in leagues:
        if league["id"] == keep["id"]:
            continue
        delete_league(league["id"])
        removed.append({"id": league["id"], "name": league["name"], "slug": league["slug"]})

    return {"kept": keep, "removed": removed}


def year_summary(sport_id):
    rows = db_manager.execute_query(
        """
        SELECT strftime('%Y', game_date) AS yr, COUNT(*) AS n
        FROM league_games
        WHERE sport_id = ?
        GROUP BY yr
        ORDER BY yr
        """,
        (sport_id,),
    )
    return {row["yr"]: row["n"] for row in rows or []}


def import_legacy_doubles_vb(
    email,
    source_db,
    league_slug=None,
    sport_id=None,
    dedupe=False,
    dry_run=False,
):
    if dedupe and not dry_run:
        dedupe_beach_vb_leagues(email)

    sport = resolve_beach_vb_sport(email, league_slug=league_slug, sport_id=sport_id)
    user = get_user_by_email(email.strip().lower())
    rows = load_legacy_games(source_db)

    imported = 0
    skipped = 0
    errors = []

    for row in rows:
        legacy_id = row["id"]
        if _legacy_id_exists(sport["id"], legacy_id):
            skipped += 1
            continue

        payload = {
            "sport_id": sport["id"],
            "winners": [row["winner1"], row["winner2"]],
            "losers": [row["loser1"], row["loser2"]],
            "winner_score": row["winner_score"],
            "loser_score": row["loser_score"],
            "game_date": _normalize_date(row["game_date"]),
            "metadata": {"legacy_id": legacy_id, "legacy_source": "games"},
            "entered_by": user.id,
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
        "league": {"id": sport["league_id"], "name": sport["league_name"], "slug": sport["slug"]},
        "sport_id": sport["id"],
        "source_db": source_db,
        "source_games": len(rows),
        "imported": imported,
        "skipped": skipped,
        "errors": errors,
    }
    if not dry_run and imported:
        result["years"] = year_summary(sport["id"])
    return result
