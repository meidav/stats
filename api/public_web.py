from flask import abort, redirect, render_template, request
from urllib.parse import quote, unquote
from datetime import date

from arbel_prefix import is_arbel_request
from api.brand import APP_NAME, APP_URL
from api.game_db import count_games_for_sport, get_games_for_sport, get_sport_years
from api.league_db import (
    get_league_by_slug,
    get_sports_for_league,
    league_is_linkable,
    league_share_url,
    league_to_dict,
    search_public_leagues,
    sport_to_dict,
)
from api.player_profiles import get_player_photo_url
from api.stats_service import compute_player_stats, compute_sport_stats
from api.web_present import (
    annotate_stat_rows,
    league_mark,
    league_path,
    present_games,
    present_player,
    present_public_league_card,
    with_sport_glyph,
)


GAMES_PAGE_SIZE = 50


def _abort_if_arbel():
    if is_arbel_request():
        abort(404)


def _linkable_league(slug):
    league = get_league_by_slug(slug)
    if not league_is_linkable(league):
        return None
    return league


def _pick_sport(sports, sport_id_arg):
    if not sports:
        return None
    if sport_id_arg:
        try:
            sport_id = int(sport_id_arg)
        except (TypeError, ValueError):
            sport_id = None
        if sport_id is not None:
            for sport in sports:
                if sport["id"] == sport_id:
                    return sport
    return sports[0]


def _resolve_year(year_arg, years):
    year_ids = [item["year"] for item in years or [] if item.get("year")]
    current = str(date.today().year)
    requested = (year_arg or "").strip().lower()
    if requested in ("all", "all-time"):
        return None
    if requested and requested in year_ids:
        return requested
    if current in year_ids:
        return current
    return year_ids[0] if year_ids else None


def _sport_block(league, sport, year_arg=None):
    payload = with_sport_glyph(sport_to_dict(sport))
    years = get_sport_years(sport["id"])
    year = _resolve_year(year_arg, years)
    current_year = str(date.today().year)
    show_today = year is None or year == current_year
    try:
        stats = compute_sport_stats(
            sport["id"],
            year=year,
            today=date.today().isoformat() if show_today else None,
        )
    except ValueError:
        stats = {
            "stats": [],
            "occasional_stats": [],
            "today_stats": [],
            "total_games": 0,
            "min_games": 1,
        }
    win_loss = payload.get("score_mode") == "win_loss"
    games = present_games(
        get_games_for_sport(sport["id"], year=year, limit=GAMES_PAGE_SIZE) or [],
        win_loss=win_loss,
    )
    games_total = count_games_for_sport(sport["id"], year=year)
    slug = league["slug"]
    sport_id = sport["id"]
    return {
        "sport": payload,
        "year": year,
        "years": years,
        "all_time_games": sum(item.get("games") or 0 for item in years),
        "min_games": stats.get("min_games") or 1,
        "total_games": stats.get("total_games") or 0,
        "stats": annotate_stat_rows(stats.get("stats") or [], slug, sport_id, year=year),
        "occasional_stats": annotate_stat_rows(
            stats.get("occasional_stats") or [], slug, sport_id, year=year
        ),
        "today_stats": annotate_stat_rows(
            stats.get("today_stats") or [], slug, sport_id, year=year
        ),
        "games": games,
        "games_total": games_total,
        "has_more": len(games) < games_total,
        "games_limit": GAMES_PAGE_SIZE,
        "win_loss": win_loss,
        "league_url": league_path(slug, sport_id, year),
    }


def register_public_web(app):
    @app.route("/leagues")
    def public_leagues_index():
        _abort_if_arbel()
        leagues = search_public_leagues(query=None, limit=100)
        cards = [present_public_league_card(league) for league in leagues]
        return render_template("marketing_leagues.html", leagues=cards)

    @app.route("/l")
    def public_league_root():
        _abort_if_arbel()
        return redirect("/leagues")

    @app.route("/l/<slug>")
    def public_league_standings(slug):
        _abort_if_arbel()
        league = _linkable_league(slug)
        if not league:
            return render_template("marketing_league_unavailable.html"), 404

        sports = get_sports_for_league(league["id"]) or []
        selected = _pick_sport(sports, request.args.get("sport"))
        year_arg = request.args.get("year")
        block = _sport_block(league, selected, year_arg=year_arg) if selected else None
        tabs = [with_sport_glyph(sport_to_dict(sport)) for sport in sports]
        payload = league_to_dict(league)
        share_url = league_share_url(league) or f"{APP_URL}/l/{league['slug']}"
        selected_year = block["year"] if block else None
        for tab in tabs:
            tab["href"] = league_path(league["slug"], tab["id"], selected_year)
        return render_template(
            "marketing_league.html",
            league=payload,
            sport_tabs=tabs,
            block=block,
            share_url=share_url,
            app_scheme_url=f"playtracker://l/{league['slug']}",
            app_name=APP_NAME,
        )

    @app.route("/l/<slug>/p/<path:player_name>")
    def public_league_player(slug, player_name):
        _abort_if_arbel()
        league = _linkable_league(slug)
        if not league:
            return render_template("marketing_league_unavailable.html"), 404

        sports = get_sports_for_league(league["id"]) or []
        sport = _pick_sport(sports, request.args.get("sport"))
        if not sport:
            return render_template("marketing_league_unavailable.html"), 404

        name = unquote(player_name or "").strip()
        if not name:
            return render_template("marketing_league_unavailable.html"), 404

        years = get_sport_years(sport["id"])
        year = _resolve_year(request.args.get("year"), years)
        try:
            profile = compute_player_stats(sport["id"], name, year=year)
        except ValueError:
            return render_template("marketing_league_unavailable.html"), 404

        payload = league_to_dict(league)
        sport_payload = with_sport_glyph(sport_to_dict(sport))
        presented = present_player(profile, league["slug"], sport["id"], year=year)
        presented["avatar_url"] = get_player_photo_url(sport["id"], name, absolute=False)
        share_url = league_share_url(league) or f"{APP_URL}/l/{league['slug']}"
        return render_template(
            "marketing_player.html",
            league=payload,
            sport=sport_payload,
            league_mark=league_mark(payload.get("icon"), sport_payload),
            player=presented,
            league_url=league_path(league["slug"], sport["id"], year),
            years=years,
            selected_year=year,
            all_time_games=sum(item.get("games") or 0 for item in years),
            year_base=f"/l/{league['slug']}/p/{quote(name, safe='')}?sport={sport['id']}",
            share_url=share_url,
            app_scheme_url=f"playtracker://l/{league['slug']}",
            app_name=APP_NAME,
        )
