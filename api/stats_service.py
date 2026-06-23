from collections import defaultdict

from api.game_db import get_games_for_sport
from api.league_db import get_sport_by_id


def _all_players(games):
    players = set()
    for game in games:
        for name in game["winners"] + game["losers"]:
            players.add(name)
    return sorted(players)


def compute_sport_stats(sport_id, year=None, min_games=None):
    sport = get_sport_by_id(sport_id)
    if not sport:
        raise ValueError("sport not found")

    if min_games is None:
        min_games = sport.get("min_games_for_rank") or 1
    games = get_games_for_sport(sport_id, year=year, limit=10000)

    totals = defaultdict(lambda: {"wins": 0, "losses": 0})
    for game in games:
        for name in game["winners"]:
            totals[name]["wins"] += 1
        for name in game["losers"]:
            totals[name]["losses"] += 1

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
            }
        )

    stats.sort(key=lambda s: (s["win_pct"], s["wins"]), reverse=True)
    return {
        "sport_id": sport_id,
        "year": year or "all",
        "min_games": min_games,
        "total_games": len(games),
        "stats": stats,
    }


def compute_player_stats(sport_id, player_name, year=None):
    sport = get_sport_by_id(sport_id)
    if not sport:
        raise ValueError("sport not found")

    player_name = player_name.strip()
    games = get_games_for_sport(sport_id, year=year, limit=10000)

    wins, losses = 0, 0
    game_history = []
    for game in games:
        in_winners = player_name in game["winners"]
        in_losers = player_name in game["losers"]
        if not in_winners and not in_losers:
            continue
        if in_winners:
            wins += 1
        else:
            losses += 1
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
    return {
        "sport_id": sport_id,
        "player": player_name,
        "year": year or "all",
        "wins": wins,
        "losses": losses,
        "games": total,
        "win_pct": round(wins / total, 4) if total else 0,
        "recent_games": game_history[:20],
    }
