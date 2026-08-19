from flask import abort, redirect, render_template, request
from urllib.parse import unquote

from arbel_prefix import is_arbel_request
from api.brand import APP_NAME, APP_URL
from api.game_db import get_games_for_sport
from api.league_db import (
    get_league_by_slug,
    get_sports_for_league,
    league_is_linkable,
    league_share_url,
    league_to_dict,
    search_public_leagues,
    sport_to_dict,
)
from api.stats_service import compute_player_stats, compute_sport_stats
from api.web_present import annotate_stat_rows, present_games, present_player, with_sport_glyph


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


def _sport_block(league, sport):
    payload = with_sport_glyph(sport_to_dict(sport))
    try:
        stats = compute_sport_stats(sport["id"], min_games=1)
    except ValueError:
        stats = {"stats": [], "today_stats": [], "total_games": 0}
    win_loss = payload.get("score_mode") == "win_loss"
    games = present_games(get_games_for_sport(sport["id"], limit=200) or [], win_loss=win_loss)
    return {
        "sport": payload,
        "stats": annotate_stat_rows(stats.get("stats") or [], league["slug"], sport["id"]),
        "today_stats": annotate_stat_rows(stats.get("today_stats") or [], league["slug"], sport["id"]),
        "games": games,
    }


def register_public_web(app):
    @app.route("/leagues")
    def public_leagues_index():
        _abort_if_arbel()
        leagues = search_public_leagues(query=None, limit=100)
        cards = []
        for league in leagues:
            cards.append(
                {
                    "name": league["name"],
                    "slug": league["slug"],
                    "description": league.get("description") or "",
                    "sport_count": league.get("sport_count") or 0,
                    "url": f"{APP_URL}/l/{league['slug']}",
                }
            )
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
        block = _sport_block(league, selected) if selected else None
        tabs = [with_sport_glyph(sport_to_dict(sport)) for sport in sports]
        payload = league_to_dict(league)
        share_url = league_share_url(league) or f"{APP_URL}/l/{league['slug']}"
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

        try:
            profile = compute_player_stats(sport["id"], name)
        except ValueError:
            return render_template("marketing_league_unavailable.html"), 404

        payload = league_to_dict(league)
        sport_payload = with_sport_glyph(sport_to_dict(sport))
        share_url = league_share_url(league) or f"{APP_URL}/l/{league['slug']}"
        return render_template(
            "marketing_player.html",
            league=payload,
            sport=sport_payload,
            player=present_player(profile, league["slug"], sport["id"]),
            league_url=f"/l/{league['slug']}?sport={sport['id']}",
            share_url=share_url,
            app_scheme_url=f"playtracker://l/{league['slug']}",
            app_name=APP_NAME,
        )
