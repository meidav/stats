"""Copy PlayTracker games for Arbel's three leagues into the /arbel tables.

Railway links stats.db at the same file as DATABASE_PATH, so rows written
here show up on the legacy site. Games imported from /arbel already carry
metadata.legacy_id and are left alone.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime

from db_utils import db_manager

logger = logging.getLogger(__name__)

MIRRORS = (
    {
        "slug": "arbels-beach-vb",
        "template_id": "beach_volleyball_2s",
        "table": "games",
        "source": "games",
        "kind": "doubles",
    },
    {
        "slug": "arbels-tennis",
        "template_id": "tennis_singles",
        "table": "tennis_matches",
        "source": "tennis_matches",
        "kind": "tennis",
    },
    {
        "slug": "arbels-vollis",
        "template_id": "vollis",
        "table": "vollis_games",
        "source": "vollis_games",
        "kind": "singles",
    },
)


def _metadata(game):
    raw = game.get("metadata") if game else None
    if isinstance(raw, dict):
        return dict(raw)
    if isinstance(raw, str) and raw.strip():
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError:
            return {}
        return dict(parsed) if isinstance(parsed, dict) else {}
    return {}


def _legacy_id(game):
    value = _metadata(game).get("legacy_id")
    if value is None or value == "":
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _names(values, expected):
    if not isinstance(values, list):
        return None
    cleaned = [str(name).strip() for name in values if name and str(name).strip()]
    if len(cleaned) != expected:
        return None
    return cleaned


def _minute(value):
    text = str(value or "").strip().replace("T", " ")
    if len(text) >= 16:
        return text[:16]
    return text


def _scores(game):
    try:
        winner = int(game["winner_score"])
        loser = int(game["loser_score"])
    except (TypeError, ValueError, KeyError):
        return None
    return winner, loser


def tennis_set_text(metadata):
    sets = (metadata or {}).get("sets")
    if isinstance(sets, list) and sets:
        parts = []
        for item in sets:
            if isinstance(item, (list, tuple)) and len(item) >= 2:
                parts.append(f"{int(item[0])}-{int(item[1])}")
        if parts:
            return ", ".join(parts)
    raw = (metadata or {}).get("set_scores")
    if raw:
        return str(raw)
    return None


def _table_exists(conn, table):
    row = conn.execute(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?",
        (table,),
    ).fetchone()
    return row is not None


def _ensure_set_scores(conn):
    columns = [row[1] for row in conn.execute("PRAGMA table_info(tennis_matches)").fetchall()]
    if columns and "set_scores" not in columns:
        conn.execute("ALTER TABLE tennis_matches ADD COLUMN set_scores TEXT")


def _spec_for_game(game):
    from api.league_db import get_league_by_id, get_sport_by_id

    sport = get_sport_by_id(game.get("sport_id"))
    if not sport:
        return None
    league = get_league_by_id(sport.get("league_id") or game.get("league_id"))
    if not league:
        return None
    slug = league.get("slug")
    template_id = sport.get("template_id")
    for spec in MIRRORS:
        if spec["slug"] == slug and spec["template_id"] == template_id:
            return spec
    return None


def _payload(spec, game):
    scores = _scores(game)
    if not scores:
        return None
    winner_score, loser_score = scores
    when = str(game.get("game_date") or "").strip()
    if not when:
        return None
    updated_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    kind = spec["kind"]
    if kind == "doubles":
        winners = _names(game.get("winners"), 2)
        losers = _names(game.get("losers"), 2)
        if not winners or not losers:
            return None
        return {
            "game_date": when,
            "winner1": winners[0],
            "winner2": winners[1],
            "winner_score": winner_score,
            "loser1": losers[0],
            "loser2": losers[1],
            "loser_score": loser_score,
            "updated_at": updated_at,
        }
    winners = _names(game.get("winners"), 1)
    losers = _names(game.get("losers"), 1)
    if not winners or not losers:
        return None
    payload = {
        "game_date": when,
        "winner": winners[0],
        "winner_score": winner_score,
        "loser": losers[0],
        "loser_score": loser_score,
        "updated_at": updated_at,
    }
    if kind == "tennis":
        payload["set_scores"] = tennis_set_text(_metadata(game))
    return payload


def _same_people(row, payload, kind):
    if kind == "doubles":
        winners = {row["winner1"], row["winner2"]}
        losers = {row["loser1"], row["loser2"]}
        return winners == {payload["winner1"], payload["winner2"]} and losers == {
            payload["loser1"],
            payload["loser2"],
        }
    return row["winner"] == payload["winner"] and row["loser"] == payload["loser"]


def _find_existing(conn, spec, payload):
    minute = _minute(payload["game_date"])
    kind = spec["kind"]
    if kind == "doubles":
        rows = conn.execute(
            """
            SELECT id, game_date, winner1, winner2, loser1, loser2
            FROM games
            WHERE winner_score = ? AND loser_score = ?
              AND substr(game_date, 1, 16) = ?
            """,
            (payload["winner_score"], payload["loser_score"], minute),
        ).fetchall()
    elif kind == "tennis":
        rows = conn.execute(
            """
            SELECT id, match_date AS game_date, winner, loser
            FROM tennis_matches
            WHERE winner_score = ? AND loser_score = ?
              AND substr(match_date, 1, 16) = ?
            """,
            (payload["winner_score"], payload["loser_score"], minute),
        ).fetchall()
    else:
        rows = conn.execute(
            """
            SELECT id, game_date, winner, loser
            FROM vollis_games
            WHERE winner_score = ? AND loser_score = ?
              AND substr(game_date, 1, 16) = ?
            """,
            (payload["winner_score"], payload["loser_score"], minute),
        ).fetchall()
    for row in rows:
        if _same_people(row, payload, kind):
            return int(row["id"])
    return None


def _insert(conn, spec, payload):
    kind = spec["kind"]
    if kind == "doubles":
        cursor = conn.execute(
            """
            INSERT INTO games (
                game_date, winner1, winner2, winner_score, loser1, loser2, loser_score, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                payload["game_date"],
                payload["winner1"],
                payload["winner2"],
                payload["winner_score"],
                payload["loser1"],
                payload["loser2"],
                payload["loser_score"],
                payload["updated_at"],
            ),
        )
    elif kind == "tennis":
        _ensure_set_scores(conn)
        cursor = conn.execute(
            """
            INSERT INTO tennis_matches (
                match_date, winner, winner_score, loser, loser_score, updated_at, set_scores
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                payload["game_date"],
                payload["winner"],
                payload["winner_score"],
                payload["loser"],
                payload["loser_score"],
                payload["updated_at"],
                payload.get("set_scores"),
            ),
        )
    else:
        cursor = conn.execute(
            """
            INSERT INTO vollis_games (
                game_date, winner, winner_score, loser, loser_score, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                payload["game_date"],
                payload["winner"],
                payload["winner_score"],
                payload["loser"],
                payload["loser_score"],
                payload["updated_at"],
            ),
        )
    return int(cursor.lastrowid)


def _update(conn, spec, legacy_id, payload):
    kind = spec["kind"]
    if kind == "doubles":
        cursor = conn.execute(
            """
            UPDATE games
            SET game_date = ?, winner1 = ?, winner2 = ?, winner_score = ?,
                loser1 = ?, loser2 = ?, loser_score = ?, updated_at = ?
            WHERE id = ?
            """,
            (
                payload["game_date"],
                payload["winner1"],
                payload["winner2"],
                payload["winner_score"],
                payload["loser1"],
                payload["loser2"],
                payload["loser_score"],
                payload["updated_at"],
                legacy_id,
            ),
        )
    elif kind == "tennis":
        _ensure_set_scores(conn)
        cursor = conn.execute(
            """
            UPDATE tennis_matches
            SET match_date = ?, winner = ?, winner_score = ?, loser = ?,
                loser_score = ?, updated_at = ?, set_scores = ?
            WHERE id = ?
            """,
            (
                payload["game_date"],
                payload["winner"],
                payload["winner_score"],
                payload["loser"],
                payload["loser_score"],
                payload["updated_at"],
                payload.get("set_scores"),
                legacy_id,
            ),
        )
    else:
        cursor = conn.execute(
            """
            UPDATE vollis_games
            SET game_date = ?, winner = ?, winner_score = ?, loser = ?,
                loser_score = ?, updated_at = ?
            WHERE id = ?
            """,
            (
                payload["game_date"],
                payload["winner"],
                payload["winner_score"],
                payload["loser"],
                payload["loser_score"],
                payload["updated_at"],
                legacy_id,
            ),
        )
    return cursor.rowcount > 0


def _delete(conn, spec, legacy_id):
    conn.execute(f"DELETE FROM {spec['table']} WHERE id = ?", (legacy_id,))


def _stamp(conn, game, legacy_id, source):
    meta = _metadata(game)
    if meta.get("legacy_id") == legacy_id and meta.get("legacy_source") == source:
        return
    meta["legacy_id"] = legacy_id
    meta["legacy_source"] = source
    conn.execute(
        "UPDATE league_games SET metadata = ? WHERE id = ?",
        (json.dumps(meta), game["id"]),
    )


def _apply(conn, spec, game):
    if not _table_exists(conn, spec["table"]):
        return None
    payload = _payload(spec, game)
    if not payload:
        return None
    legacy_id = _legacy_id(game)
    if legacy_id:
        _update(conn, spec, legacy_id, payload)
        return legacy_id
    found = _find_existing(conn, spec, payload)
    if found:
        _stamp(conn, game, found, spec["source"])
        return found
    new_id = _insert(conn, spec, payload)
    _stamp(conn, game, new_id, spec["source"])
    return new_id


def mirror_game(game):
    """Insert or update the /arbel row for a PlayTracker game. No-op for other leagues."""
    if not game:
        return None
    spec = _spec_for_game(game)
    if not spec:
        return None
    try:
        with db_manager.get_connection() as conn:
            return _apply(conn, spec, game)
    except Exception:
        logger.exception("Could not mirror league game %s to /arbel", game.get("id"))
        return None


def mirror_delete(game):
    """Remove the linked /arbel row when a PlayTracker game is deleted."""
    if not game:
        return False
    legacy_id = _legacy_id(game)
    if not legacy_id:
        return False
    spec = _spec_for_game(game)
    if not spec:
        return False
    try:
        with db_manager.get_connection() as conn:
            if not _table_exists(conn, spec["table"]):
                return False
            _delete(conn, spec, legacy_id)
        return True
    except Exception:
        logger.exception("Could not delete /arbel row for league game %s", game.get("id"))
        return False


def sync_arbel_leagues():
    """Copy PlayTracker games that are not yet linked into the /arbel tables."""
    from api.game_db import _game_row_to_dict
    from api.league_db import get_league_by_slug, get_sports_for_league

    summary = []
    for spec in MIRRORS:
        league = get_league_by_slug(spec["slug"])
        if not league:
            continue
        sports = [
            sport
            for sport in (get_sports_for_league(league["id"]) or [])
            if sport.get("template_id") == spec["template_id"]
        ]
        for sport in sports:
            rows = db_manager.execute_query(
                "SELECT * FROM league_games WHERE sport_id = ? ORDER BY id ASC",
                (sport["id"],),
            ) or []
            copied = 0
            for row in rows:
                game = _game_row_to_dict(row)
                if _legacy_id(game):
                    continue
                if mirror_game(game):
                    copied += 1
            summary.append({"slug": spec["slug"], "copied": copied, "games": len(rows)})
    if summary:
        logger.info("Arbel legacy mirror: %s", summary)
    return summary
