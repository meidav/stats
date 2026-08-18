from collections import Counter, defaultdict
from datetime import date

from api.game_db import get_games_for_sport
from api.league_db import get_sport_by_id
from api.sport_templates import get_template, typical_win_score_for


def _is_today(game_date):
    if not game_date:
        return False
    return str(game_date)[:10] == date.today().isoformat()


def _rows_from_games(games, min_games=1):
    totals = defaultdict(lambda: {"wins": 0, "losses": 0, "plus_minus": 0})
    for game in games:
        wscore = game.get("winner_score") or 0
        lscore = game.get("loser_score") or 0
        diff = wscore - lscore
        for name in game["winners"]:
            totals[name]["wins"] += 1
            totals[name]["plus_minus"] += diff
        for name in game["losers"]:
            totals[name]["losses"] += 1
            totals[name]["plus_minus"] -= diff

    stats = []
    for player, record in totals.items():
        total = record["wins"] + record["losses"]
        if total < min_games:
            continue
        win_pct = record["wins"] / total if total else 0
        stats.append(
            {
                "player": player,
                "wins": record["wins"],
                "losses": record["losses"],
                "games": total,
                "win_pct": round(win_pct, 4),
                "plus_minus": record["plus_minus"],
            }
        )

    stats.sort(key=lambda s: (s["win_pct"], s["wins"], s["plus_minus"]), reverse=True)
    return stats


def compute_sport_stats(sport_id, year=None, min_games=None):
    sport = get_sport_by_id(sport_id)
    if not sport:
        raise ValueError("sport not found")

    if min_games is None:
        min_games = sport.get("min_games_for_rank") or 1
    games = get_games_for_sport(sport_id, year=year, limit=10000)
    today_games = [game for game in games if _is_today(game.get("game_date"))]

    return {
        "sport_id": sport_id,
        "year": year or "all",
        "min_games": min_games,
        "total_games": len(games),
        "stats": _rows_from_games(games, min_games=min_games),
        "today_stats": _rows_from_games(today_games, min_games=1) if today_games else [],
    }


def compute_player_stats(sport_id, player_name, year=None):
    sport = get_sport_by_id(sport_id)
    if not sport:
        raise ValueError("sport not found")

    player_name = player_name.strip()
    games = get_games_for_sport(sport_id, year=year, limit=10000)

    wins, losses, plus_minus = 0, 0, 0
    game_history = []
    partners = defaultdict(lambda: {"wins": 0, "losses": 0})
    opponents = defaultdict(lambda: {"wins": 0, "losses": 0})

    for game in games:
        in_winners = player_name in game["winners"]
        in_losers = player_name in game["losers"]
        if not in_winners and not in_losers:
            continue
        diff = (game.get("winner_score") or 0) - (game.get("loser_score") or 0)
        if in_winners:
            wins += 1
            plus_minus += diff
            for name in game["winners"]:
                if name != player_name:
                    partners[name]["wins"] += 1
            for name in game["losers"]:
                opponents[name]["wins"] += 1
        else:
            losses += 1
            plus_minus -= diff
            for name in game["losers"]:
                if name != player_name:
                    partners[name]["losses"] += 1
            for name in game["winners"]:
                opponents[name]["losses"] += 1
        game_history.append(
            {
                "id": game["id"],
                "game_date": game["game_date"],
                "result": "win" if in_winners else "loss",
                "winners": game["winners"],
                "losers": game["losers"],
                "winner_score": game["winner_score"],
                "loser_score": game["loser_score"],
            }
        )

    total = wins + losses
    last_results = []
    for game in reversed(game_history[:10]):
        last_results.append("W" if game["result"] == "win" else "L")

    streak = "0"
    if game_history:
        kind = game_history[0]["result"]
        count = 0
        for game in game_history:
            if game["result"] != kind:
                break
            count += 1
        streak = f"{count}{'W' if kind == 'win' else 'L'}"

    standings = _rows_from_games(games, min_games=1)
    rank = None
    for index, row in enumerate(standings, start=1):
        if row["player"] == player_name:
            rank = index
            break

    def _pair_rows(pairs):
        rows = []
        for name, record in pairs.items():
            games_played = record["wins"] + record["losses"]
            if not games_played:
                continue
            win_pct = record["wins"] / games_played
            rows.append(
                {
                    "player": name,
                    "wins": record["wins"],
                    "losses": record["losses"],
                    "games": games_played,
                    "win_pct": round(win_pct, 4),
                }
            )
        rows.sort(key=lambda s: (s["win_pct"], s["games"]), reverse=True)
        return rows

    return {
        "sport_id": sport_id,
        "sport_name": sport.get("name"),
        "player": player_name,
        "year": year or "all",
        "wins": wins,
        "losses": losses,
        "games": total,
        "win_pct": round(wins / total, 4) if total else 0,
        "plus_minus": plus_minus,
        "streak": streak,
        "rank": rank,
        "field_size": len(standings),
        "last_results": last_results,
        "partners": _pair_rows(partners),
        "opponents": _pair_rows(opponents),
        "recent_games": game_history[:20],
    }


def compute_score_hints(sport_id):
    sport = get_sport_by_id(sport_id)
    if not sport:
        raise ValueError("sport not found")

    template = get_template(sport.get("template_id")) or {}
    games = get_games_for_sport(sport_id, limit=10000)
    win_scores = [game["winner_score"] for game in games if game.get("winner_score") is not None]
    lose_scores = [game["loser_score"] for game in games if game.get("loser_score") is not None]
    typical = typical_win_score_for(sport.get("template_id"))
    winner_score = Counter(win_scores).most_common(1)[0][0] if win_scores else typical

    loser_scores = []
    if lose_scores:
        avg = int(round(sum(lose_scores) / len(lose_scores)))
        left = avg + 1
        right = max(avg - 1, 0)
        loser_scores = [left] if left == right else [left, right]

    return {
        "winner_score": winner_score,
        "loser_scores": loser_scores,
        "score_mode": template.get("score_mode", "points"),
    }
