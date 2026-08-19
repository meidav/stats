from flask import abort, redirect, render_template

from arbel_prefix import is_arbel_request
from api.brand import APP_NAME, APP_URL
from api.league_db import (
    get_league_by_slug,
    get_sports_for_league,
    league_is_linkable,
    league_share_url,
    league_to_dict,
    search_public_leagues,
    sport_to_dict,
)
from api.stats_service import compute_sport_stats


def register_public_web(app):
    @app.route("/leagues")
    def public_leagues_index():
        if is_arbel_request():
            abort(404)
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
        if is_arbel_request():
            abort(404)
        return redirect("/leagues")

    @app.route("/l/<slug>")
    def public_league_standings(slug):
        if is_arbel_request():
            abort(404)
        league = get_league_by_slug(slug)
        if not league_is_linkable(league):
            return render_template("marketing_league_unavailable.html"), 404

        sports = get_sports_for_league(league["id"]) or []
        sport_blocks = []
        for sport in sports:
            try:
                stats = compute_sport_stats(sport["id"], min_games=1)
            except ValueError:
                stats = {"stats": [], "today_stats": [], "total_games": 0}
            sport_blocks.append(
                {
                    "sport": sport_to_dict(sport),
                    "stats": stats.get("stats") or [],
                    "today_stats": stats.get("today_stats") or [],
                    "total_games": stats.get("total_games") or 0,
                }
            )

        payload = league_to_dict(league)
        share_url = league_share_url(league) or f"{APP_URL}/l/{league['slug']}"
        return render_template(
            "marketing_league.html",
            league=payload,
            sport_blocks=sport_blocks,
            share_url=share_url,
            app_scheme_url=f"playtracker://l/{league['slug']}",
            app_name=APP_NAME,
        )
