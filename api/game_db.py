import json
from datetime import datetime

from db_utils import db_manager
from api.league_db import get_league_by_id, get_sport_by_id


def _parse_json_list(value):
    if isinstance(value, list):
        return value
    if value:
        return json.loads(value)
    return []


def _validate_players(names, expected_count, label):
    if not isinstance(names, list):
        raise ValueError(f"{label} must be a list of player names")
    cleaned = [n.strip() for n in names if n and str(n).strip()]
    if len(cleaned) != expected_count:
        raise ValueError(
            f"{label} must have exactly {expected_count} player(s), got {len(cleaned)}"
        )
    return cleaned


def _validate_scores(winner_score, loser_score, score_direction):
    if winner_score is None or loser_score is None:
        raise ValueError("winner_score and loser_score are required")

    try:
        winner_score = int(winner_score)
        loser_score = int(loser_score)
    except (TypeError, ValueError):
        raise ValueError("scores must be integers")

    if winner_score == loser_score:
        raise ValueError("scores cannot be tied")

    if score_direction == "higher_wins":
        if winner_score <= loser_score:
            raise ValueError("winner must have the higher score")
    elif score_direction == "lower_wins":
        if winner_score >= loser_score:
            raise ValueError("winner must have the lower score")
    else:
        raise ValueError(f"unknown score_direction: {score_direction}")

    return winner_score, loser_score


def _game_row_to_dict(row):
    if row is None:
        return None
    data = dict(row)
    data["winners"] = _parse_json_list(data["winners"])
    data["losers"] = _parse_json_list(data["losers"])
    if data.get("metadata"):
        data["metadata"] = json.loads(data["metadata"])
    else:
        data["metadata"] = {}
    return data


def add_game(sport_id, winners, losers, winner_score, loser_score, game_date=None, metadata=None, entered_by=None):
    sport = get_sport_by_id(sport_id)
    if not sport:
        raise ValueError("sport not found")

    winners = _validate_players(winners, sport["players_per_side"], "winners")
    losers = _validate_players(losers, sport["players_per_side"], "losers")
    winner_score, loser_score = _validate_scores(
        winner_score, loser_score, sport["score_direction"]
    )

    if game_date is None:
        game_date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    metadata_json = json.dumps(metadata or {})

    with db_manager.get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO league_games (
                sport_id, league_id, game_date, winners, losers,
                winner_score, loser_score, metadata, entered_by
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                sport_id,
                sport["league_id"],
                game_date,
                json.dumps(winners),
                json.dumps(losers),
                winner_score,
                loser_score,
                metadata_json,
                entered_by,
            ),
        )
        game_id = cursor.lastrowid
        cursor.execute(
            "UPDATE leagues SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (sport["league_id"],),
        )

    return get_game_by_id(game_id)


def get_game_by_id(game_id):
    row = db_manager.execute_query(
        "SELECT * FROM league_games WHERE id = ?",
        (game_id,),
        fetch_one=True,
    )
    return _game_row_to_dict(row)


def get_games_for_sport(sport_id, year=None, limit=100, offset=0):
    params = [sport_id]
    sql = "SELECT * FROM league_games WHERE sport_id = ?"
    if year:
        sql += " AND strftime('%Y', game_date) = ?"
        params.append(str(year))
    sql += " ORDER BY game_date DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])

    rows = db_manager.execute_query(sql, tuple(params))
    return [_game_row_to_dict(row) for row in rows]


def update_game(game_id, **fields):
    game = get_game_by_id(game_id)
    if not game:
        raise ValueError("game not found")

    sport = get_sport_by_id(game["sport_id"])
    winners = fields.get("winners", game["winners"])
    losers = fields.get("losers", game["losers"])
    winner_score = fields.get("winner_score", game["winner_score"])
    loser_score = fields.get("loser_score", game["loser_score"])

    winners = _validate_players(winners, sport["players_per_side"], "winners")
    losers = _validate_players(losers, sport["players_per_side"], "losers")
    winner_score, loser_score = _validate_scores(
        winner_score, loser_score, sport["score_direction"]
    )

    game_date = fields.get("game_date", game["game_date"])
    metadata = fields.get("metadata", game["metadata"])
    metadata_json = json.dumps(metadata or {})

    with db_manager.get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE league_games
            SET game_date = ?, winners = ?, losers = ?,
                winner_score = ?, loser_score = ?, metadata = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (
                game_date,
                json.dumps(winners),
                json.dumps(losers),
                winner_score,
                loser_score,
                metadata_json,
                game_id,
            ),
        )

    return get_game_by_id(game_id)


def delete_game(game_id):
    game = get_game_by_id(game_id)
    if not game:
        return False

    db_manager.execute_query(
        "DELETE FROM league_games WHERE id = ?",
        (game_id,),
        fetch_all=False,
    )
    return True


def user_can_edit_league(user_id, league_id):
    league = get_league_by_id(league_id)
    if not league:
        return False
    if league["owner_id"] == user_id:
        return True
    row = db_manager.execute_query(
        """
        SELECT role FROM league_members
        WHERE league_id = ? AND user_id = ? AND role IN ('owner', 'admin')
        """,
        (league_id, user_id),
        fetch_one=True,
    )
    return row is not None


def game_to_dict(game):
    if game is None:
        return None
    return {
        "id": game["id"],
        "sport_id": game["sport_id"],
        "league_id": game["league_id"],
        "game_date": game["game_date"],
        "winners": game["winners"],
        "losers": game["losers"],
        "winner_score": game["winner_score"],
        "loser_score": game["loser_score"],
        "metadata": game["metadata"],
        "entered_by": game["entered_by"],
        "created_at": game["created_at"],
        "updated_at": game["updated_at"],
    }
