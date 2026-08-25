from collections import Counter, defaultdict
from datetime import date

from api.game_db import get_games_for_sport, get_sport_years
from api.league_db import get_sport_by_id
from api.rank_utils import pair_rank_key, player_rank_in_rows, with_ranks
from api.sport_templates import get_template, typical_win_score_for

# Share of league games a player must have played to appear in main standings.
STANDINGS_MIN_GAMES_PCT = 0.05


def min_games_for_standings(total_games):
    """Auto-scale qualification threshold (default 5% of games in the current view)."""
    if total_games <= 0:
        return 1
    return max(1, int(total_games * STANDINGS_MIN_GAMES_PCT))


def _is_on_day(game_date, day):
    if not game_date:
        return False
    return str(game_date)[:10] == day


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


def _occasional_from_games(games, min_games):
    if min_games <= 1:
        return []
    all_stats = _rows_from_games(games, min_games=1)
    occasional = [row for row in all_stats if row["games"] < min_games]
    occasional.sort(key=lambda s: (s["win_pct"], s["wins"], s["plus_minus"]), reverse=True)
    return occasional


def compute_sport_stats(sport_id, year=None, min_games=None, today=None):
    sport = get_sport_by_id(sport_id)
    if not sport:
        raise ValueError("sport not found")

    if min_games is None:
        games = get_games_for_sport(sport_id, year=year, limit=10000)
        min_games = min_games_for_standings(len(games))
    else:
        games = get_games_for_sport(sport_id, year=year, limit=10000)
    today_key = today or date.today().isoformat()
    today_games = [game for game in games if _is_on_day(game.get("game_date"), today_key)]

    return {
        "sport_id": sport_id,
        "year": year or "all",
        "min_games": min_games,
        "min_games_pct": STANDINGS_MIN_GAMES_PCT,
        "total_games": len(games),
        "stats": with_ranks(_rows_from_games(games, min_games=min_games)),
        "occasional_stats": with_ranks(_occasional_from_games(games, min_games)),
        "years": get_sport_years(sport_id),
        "today_stats": with_ranks(_rows_from_games(today_games, min_games=1)) if today_games else [],
    }


def _split_pair_rows(rows, min_games):
    """Main list is min_games+; occasional is below that (empty when threshold is 1)."""
    if min_games <= 1:
        return rows, []
    main = [row for row in rows if row["games"] >= min_games]
    occasional = [row for row in rows if row["games"] < min_games]
    return main, occasional


def compute_player_stats(sport_id, player_name, year=None):
    sport = get_sport_by_id(sport_id)
    if not sport:
        raise ValueError("sport not found")

    player_name = player_name.strip()
    games = get_games_for_sport(sport_id, year=year, limit=10000)

    wins, losses, plus_minus = 0, 0, 0
    player_games = []
    results = []
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
            results.append("win")
        else:
            losses += 1
            plus_minus -= diff
            for name in game["losers"]:
                if name != player_name:
                    partners[name]["losses"] += 1
            for name in game["winners"]:
                opponents[name]["losses"] += 1
            results.append("loss")
        player_games.append(game)

    total = wins + losses
    last_results = []
    for result in reversed(results[:10]):
        last_results.append("W" if result == "win" else "L")

    streak = "0"
    if results:
        kind = results[0]
        count = 0
        for result in results:
            if result != kind:
                break
            count += 1
        streak = f"{count}{'W' if kind == 'win' else 'L'}"

    league_min_games = min_games_for_standings(len(games))
    standings = _rows_from_games(games, min_games=league_min_games)
    rank, field_size = player_rank_in_rows(standings, player_name)

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
        rows.sort(key=lambda s: (s["win_pct"], s["wins"], s["games"]), reverse=True)
        return with_ranks(rows, pair_rank_key)

    # Same 5% rule as partner/opponent tables, based on this player's game count.
    min_games = min_games_for_standings(total)
    partner_rows = _pair_rows(partners)
    opponent_rows = _pair_rows(opponents)
    main_partners, occasional_partners = _split_pair_rows(partner_rows, min_games)
    main_opponents, occasional_opponents = _split_pair_rows(opponent_rows, min_games)

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
        "min_games": min_games,
        "min_games_pct": STANDINGS_MIN_GAMES_PCT,
        "partners": main_partners,
        "occasional_partners": occasional_partners,
        "opponents": main_opponents,
        "occasional_opponents": occasional_opponents,
        "player_games": player_games,
        "recent_games": player_games[:20],
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
