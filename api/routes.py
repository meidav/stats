from urllib.parse import unquote
import os

from flask import jsonify, request
from flask_jwt_extended import (
    create_access_token,
    get_jwt_identity,
    jwt_required,
    verify_jwt_in_request,
)

from auth import get_user_by_email, get_user_by_id, get_user_by_username, verify_password
from api.auth_service import (
    authenticate_with_email,
    register_with_email,
    request_password_reset,
    reset_password_with_token,
    user_payload,
)
from api.brand import APP_DOMAIN, APP_NAME, APP_TAGLINE, APP_URL
from api.google_auth import (
    find_or_create_google_user,
    google_auth_configured,
    verify_google_id_token,
)
from api.game_db import (
    add_game,
    count_games_for_sport,
    delete_game,
    game_to_dict,
    get_game_by_id,
    get_games_for_sport,
    get_player_names_for_user,
    update_game,
    user_can_edit_league,
)
from api.league_db import (
    add_sport_to_league,
    create_league,
    get_league_by_id,
    get_league_by_slug,
    get_leagues_for_user,
    get_sport_by_id,
    get_sports_for_league,
    league_icon_usage,
    league_share_url,
    league_to_dict,
    player_share_url,
    search_public_leagues,
    sport_to_dict,
    update_league,
    delete_league,
    user_can_access_league,
    user_is_league_member,
)
from api.player_profiles import (
    clear_player_photo,
    get_player_photo_url,
    player_exists_in_sport,
    rename_player_in_sport,
    save_player_photo,
)
from api.sport_templates import (
    TEMPLATE_CATEGORIES,
    focus_for_template,
    get_template,
    list_templates,
    public_template,
)
from api.legacy_vb_import import import_legacy_doubles_vb
from api.stats_service import compute_player_stats, compute_score_hints, compute_sport_stats


def _player_payload(stats, league, sport, user_id=None):
    name = stats.get("player")
    payload = dict(stats)
    payload["avatar_url"] = get_player_photo_url(sport["id"], name)
    payload["can_edit"] = bool(user_id and user_can_edit_league(user_id, league["id"]))
    payload["share_url"] = player_share_url(league, name, sport["id"])
    payload["league"] = {
        "id": league["id"],
        "name": league["name"],
        "slug": league["slug"],
        "visibility": league.get("visibility"),
        "icon": league.get("icon"),
        "share_url": league_share_url(league),
    }
    payload["sport"] = sport_to_dict(sport)
    return payload


def register_routes(api):
    @api.route("/health", methods=["GET"])
    def health():
        return jsonify({
            "status": "ok",
            "version": "v1",
            "app": APP_NAME,
            "tagline": APP_TAGLINE,
            "domain": APP_DOMAIN,
            "url": APP_URL,
        })

    @api.route("/sports/templates", methods=["GET"])
    def sport_templates():
        return jsonify({
            "templates": [public_template(t) for t in list_templates()],
            "categories": list(TEMPLATE_CATEGORIES),
        })

    @api.route("/league-icons", methods=["GET"])
    def league_icons():
        return jsonify(league_icon_usage())

    @api.route("/auth/login", methods=["POST"])
    def api_login():
        data = request.get_json(silent=True) or {}
        email = (data.get("email") or "").strip()
        username = (data.get("username") or "").strip()
        password = data.get("password") or ""

        if not password:
            return jsonify({"error": "password is required"}), 400

        user = None
        if email:
            user = authenticate_with_email(email, password)
        elif username:
            user = get_user_by_username(username)
            if user and not verify_password(user, password):
                user = None

        if not user:
            return jsonify({"error": "invalid credentials"}), 401

        token = create_access_token(identity=str(user.id))
        return jsonify({"access_token": token, "user": user_payload(user)})

    @api.route("/auth/register", methods=["POST"])
    def api_register():
        data = request.get_json(silent=True) or {}
        email = (data.get("email") or "").strip()
        password = data.get("password") or ""

        if not email or not password:
            return jsonify({"error": "email and password are required"}), 400

        try:
            user = register_with_email(email, password)
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400

        token = create_access_token(identity=str(user.id))
        return jsonify({"access_token": token, "user": user_payload(user)}), 201

    @api.route("/auth/forgot-password", methods=["POST"])
    def api_forgot_password():
        data = request.get_json(silent=True) or {}
        email = (data.get("email") or "").strip()
        if not email:
            return jsonify({"error": "email is required"}), 400
        try:
            request_password_reset(email)
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400
        return jsonify({"message": "If that email exists, a reset link has been sent."})

    @api.route("/auth/reset-password", methods=["POST"])
    def api_reset_password():
        data = request.get_json(silent=True) or {}
        token = (data.get("token") or "").strip()
        password = data.get("password") or ""
        if not token or not password:
            return jsonify({"error": "token and password are required"}), 400
        try:
            user = reset_password_with_token(token, password)
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400

        access_token = create_access_token(identity=str(user.id))
        return jsonify({"access_token": access_token, "user": user_payload(user)})

    @api.route("/auth/google", methods=["POST"])
    def api_google_login():
        data = request.get_json(silent=True) or {}
        id_token_str = data.get("id_token") or data.get("idToken") or ""
        if not id_token_str:
            return jsonify({"error": "id_token is required"}), 400
        if not google_auth_configured():
            return jsonify({"error": "Google sign-in is not configured on the server"}), 503
        try:
            info = verify_google_id_token(id_token_str)
            user = find_or_create_google_user(
                google_sub=info["sub"],
                email=info["email"],
                name=info.get("name"),
            )
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 401

        token = create_access_token(identity=str(user["id"]))
        return jsonify({"access_token": token, "user": user})

    @api.route("/leagues", methods=["POST"])
    @jwt_required()
    def create_league_route():
        user_id = int(get_jwt_identity())
        data = request.get_json(silent=True) or {}

        name = (data.get("name") or "").strip()
        if not name:
            return jsonify({"error": "name is required"}), 400

        visibility = data.get("visibility", "public")
        description = data.get("description")
        slug = data.get("slug")
        sport_template_id = data.get("sport_template_id")
        focus = data.get("focus")
        if not focus and sport_template_id:
            focus = focus_for_template(sport_template_id)
        focus = focus or "mixed"

        try:
            league = create_league(
                owner_id=user_id,
                name=name,
                visibility=visibility,
                description=description,
                slug=slug,
                focus=focus,
            )
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400
        except Exception as exc:
            return jsonify({"error": f"Could not create league: {exc}"}), 500

        sports = []
        if sport_template_id:
            template = get_template(sport_template_id)
            if not template:
                return jsonify({"error": f"unknown sport template: {sport_template_id}"}), 400

            sport = add_sport_to_league(
                league_id=league["id"],
                template_id=sport_template_id,
                name=data.get("sport_name"),
                players_per_side=data.get("players_per_side"),
                score_direction=data.get("score_direction"),
            )
            sports.append(sport_to_dict(sport))

        payload = league_to_dict(league, include_invite_code=True)
        payload["sports"] = sports
        return jsonify(payload), 201

    @api.route("/leagues/mine", methods=["GET"])
    @jwt_required()
    def my_leagues():
        user_id = int(get_jwt_identity())
        try:
            leagues = get_leagues_for_user(user_id)
            result = []
            for league in leagues:
                item = league_to_dict(league, include_invite_code=True)
                item["sports"] = [
                    sport_to_dict(s) for s in get_sports_for_league(league["id"]) or []
                ]
                result.append(item)
            return jsonify({"leagues": result})
        except Exception as exc:
            return jsonify({"error": f"Could not load leagues: {exc}"}), 500

    @api.route("/players", methods=["GET"])
    @jwt_required()
    def my_players():
        user_id = int(get_jwt_identity())
        return jsonify({"players": get_player_names_for_user(user_id)})

    @api.route("/leagues/<slug>", methods=["GET"])
    def get_league(slug):
        league = get_league_by_slug(slug)
        if not league:
            return jsonify({"error": "league not found"}), 404

        verify_jwt_in_request(optional=True)
        identity = get_jwt_identity()
        user_id = int(identity) if identity else None

        if not user_can_access_league(user_id, league):
            return jsonify({"error": "access denied"}), 403

        is_member = user_is_league_member(user_id, league)
        include_invite = is_member and league.get("visibility") == "private"
        payload = league_to_dict(league, include_invite_code=include_invite)
        if is_member:
            if league.get("owner_id") == user_id:
                payload["role"] = "owner"
            elif user_can_edit_league(user_id, league["id"]):
                payload["role"] = "admin"
            else:
                payload["role"] = "member"
        payload["sports"] = [
            sport_to_dict(s) for s in get_sports_for_league(league["id"])
        ]
        return jsonify(payload)

    @api.route("/leagues/<slug>", methods=["PATCH", "PUT"])
    @jwt_required()
    def patch_league(slug):
        user_id = int(get_jwt_identity())
        league = get_league_by_slug(slug)
        if not league:
            return jsonify({"error": "league not found"}), 404
        if not user_can_edit_league(user_id, league["id"]):
            return jsonify({"error": "permission denied"}), 403

        data = request.get_json(silent=True) or {}
        fields = {}
        if "name" in data:
            fields["name"] = data.get("name")
        if "icon" in data:
            fields["icon"] = data.get("icon")
        if "visibility" in data:
            fields["visibility"] = data.get("visibility")
        try:
            updated = update_league(league["id"], **fields)
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400

        payload = league_to_dict(updated, include_invite_code=True)
        payload["role"] = "owner" if updated.get("owner_id") == user_id else "admin"
        payload["sports"] = [
            sport_to_dict(s) for s in get_sports_for_league(updated["id"]) or []
        ]
        return jsonify(payload)

    @api.route("/leagues/<slug>/import-legacy-vb", methods=["POST"])
    @jwt_required()
    def import_legacy_vb_route(slug):
        user_id = int(get_jwt_identity())
        league = get_league_by_slug(slug)
        if not league:
            return jsonify({"error": "league not found"}), 404
        if league.get("owner_id") != user_id:
            return jsonify({"error": "permission denied"}), 403

        source_db = os.environ.get("LEGACY_VB_SOURCE_DB")
        if not source_db or not os.path.isfile(source_db):
            return jsonify({
                "error": "legacy VB source database is not configured on the server",
            }), 503

        user = get_user_by_id(user_id)
        if not user:
            return jsonify({"error": "user not found"}), 404

        data = request.get_json(silent=True) or {}
        dedupe = data.get("dedupe", True)

        try:
            result = import_legacy_doubles_vb(
                email=user.email,
                source_db=source_db,
                league_slug=slug,
                dedupe=bool(dedupe),
            )
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400
        except FileNotFoundError as exc:
            return jsonify({"error": str(exc)}), 503

        return jsonify(result)

    @api.route("/leagues/<slug>", methods=["DELETE"])
    @jwt_required()
    def delete_league_route(slug):
        user_id = int(get_jwt_identity())
        league = get_league_by_slug(slug)
        if not league:
            return jsonify({"error": "league not found"}), 404
        if not user_can_edit_league(user_id, league["id"]):
            return jsonify({"error": "permission denied"}), 403
        delete_league(league["id"])
        return jsonify({"ok": True, "slug": slug})

    @api.route("/leagues/<int:league_id>/sports", methods=["POST"])
    @jwt_required()
    def add_sport(league_id):
        user_id = int(get_jwt_identity())
        data = request.get_json(silent=True) or {}
        template_id = data.get("template_id")

        if not template_id:
            return jsonify({"error": "template_id is required"}), 400

        from api.league_db import get_league_by_id

        league = get_league_by_id(league_id)
        if not league:
            return jsonify({"error": "league not found"}), 404
        if league["owner_id"] != user_id:
            return jsonify({"error": "only the league owner can add sports"}), 403

        try:
            sport = add_sport_to_league(
                league_id=league_id,
                template_id=template_id,
                name=data.get("name"),
                players_per_side=data.get("players_per_side"),
                score_direction=data.get("score_direction"),
            )
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400

        return jsonify(sport_to_dict(sport)), 201

    @api.route("/discover", methods=["GET"])
    def discover_leagues():
        query = request.args.get("q")
        limit = min(int(request.args.get("limit", 20)), 50)
        leagues = search_public_leagues(query=query, limit=limit)
        return jsonify(
            {
                "leagues": [
                    {
                        "id": league["id"],
                        "name": league["name"],
                        "slug": league["slug"],
                        "description": league["description"],
                        "visibility": "public",
                        "sport_count": league["sport_count"],
                        "share_url": league_share_url(league),
                        "created_at": league["created_at"],
                    }
                    for league in leagues
                ]
            }
        )

    @api.route("/sports/<int:sport_id>/games", methods=["GET"])
    def list_games(sport_id):
        sport = get_sport_by_id(sport_id)
        if not sport:
            return jsonify({"error": "sport not found"}), 404

        league = get_league_by_id(sport["league_id"])
        verify_jwt_in_request(optional=True)
        identity = get_jwt_identity()
        user_id = int(identity) if identity else None
        if not user_can_access_league(user_id, league):
            return jsonify({"error": "access denied"}), 403

        year = request.args.get("year")
        limit = min(int(request.args.get("limit", 50)), 200)
        offset = int(request.args.get("offset", 0))
        games = get_games_for_sport(sport_id, year=year, limit=limit, offset=offset)
        total = count_games_for_sport(sport_id, year=year)
        return jsonify(
            {
                "games": [game_to_dict(g) for g in games],
                "total": total,
                "limit": limit,
                "offset": offset,
                "has_more": offset + len(games) < total,
            }
        )

    @api.route("/sports/<int:sport_id>/games", methods=["POST"])
    @jwt_required()
    def create_game(sport_id):
        user_id = int(get_jwt_identity())
        sport = get_sport_by_id(sport_id)
        if not sport:
            return jsonify({"error": "sport not found"}), 404
        if not user_can_edit_league(user_id, sport["league_id"]):
            return jsonify({"error": "permission denied"}), 403

        data = request.get_json(silent=True) or {}
        try:
            game = add_game(
                sport_id=sport_id,
                winners=data.get("winners", []),
                losers=data.get("losers", []),
                winner_score=data.get("winner_score"),
                loser_score=data.get("loser_score"),
                game_date=data.get("game_date"),
                metadata=data.get("metadata"),
                entered_by=user_id,
            )
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400

        return jsonify(game_to_dict(game)), 201

    @api.route("/sports/<int:sport_id>/stats", methods=["GET"])
    def sport_stats(sport_id):
        sport = get_sport_by_id(sport_id)
        if not sport:
            return jsonify({"error": "sport not found"}), 404

        league = get_league_by_id(sport["league_id"])
        verify_jwt_in_request(optional=True)
        identity = get_jwt_identity()
        user_id = int(identity) if identity else None
        if not user_can_access_league(user_id, league):
            return jsonify({"error": "access denied"}), 403

        year = request.args.get("year")
        min_games_arg = request.args.get("min_games")
        min_games = int(min_games_arg) if min_games_arg is not None else None
        today = request.args.get("today")
        try:
            stats = compute_sport_stats(sport_id, year=year, min_games=min_games, today=today)
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400
        return jsonify(stats)

    @api.route("/sports/<int:sport_id>/score-hints", methods=["GET"])
    def sport_score_hints(sport_id):
        sport = get_sport_by_id(sport_id)
        if not sport:
            return jsonify({"error": "sport not found"}), 404

        league = get_league_by_id(sport["league_id"])
        verify_jwt_in_request(optional=True)
        identity = get_jwt_identity()
        user_id = int(identity) if identity else None
        if not user_can_access_league(user_id, league):
            return jsonify({"error": "access denied"}), 403

        try:
            return jsonify(compute_score_hints(sport_id))
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400

    @api.route("/sports/<int:sport_id>/players/<path:player_name>", methods=["GET"])
    def player_stats(sport_id, player_name):
        sport = get_sport_by_id(sport_id)
        if not sport:
            return jsonify({"error": "sport not found"}), 404

        league = get_league_by_id(sport["league_id"])
        verify_jwt_in_request(optional=True)
        identity = get_jwt_identity()
        user_id = int(identity) if identity else None
        if not user_can_access_league(user_id, league):
            return jsonify({"error": "access denied"}), 403

        year = request.args.get("year")
        name = unquote(player_name).strip()
        stats = compute_player_stats(sport_id, name, year=year)
        return jsonify(_player_payload(stats, league, sport, user_id))

    @api.route("/sports/<int:sport_id>/players/<path:player_name>", methods=["PATCH"])
    @jwt_required()
    def edit_player_profile(sport_id, player_name):
        user_id = int(get_jwt_identity())
        sport = get_sport_by_id(sport_id)
        if not sport:
            return jsonify({"error": "sport not found"}), 404

        league = get_league_by_id(sport["league_id"])
        if not league:
            return jsonify({"error": "league not found"}), 404
        if not user_can_edit_league(user_id, sport["league_id"]):
            return jsonify({"error": "permission denied"}), 403

        current_name = unquote(player_name).strip()
        if not player_exists_in_sport(sport_id, current_name):
            return jsonify({"error": "player not found"}), 404

        data = request.get_json(silent=True) or {}
        next_name = current_name
        if "name" in data and data.get("name") is not None:
            next_name = str(data.get("name") or "").strip()
        try:
            if next_name != current_name:
                next_name = rename_player_in_sport(sport_id, current_name, next_name)
            if data.get("photo"):
                save_player_photo(sport_id, next_name, data.get("photo"))
            elif data.get("photo") is None and "photo" in data:
                clear_player_photo(sport_id, next_name)
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400

        stats = compute_player_stats(sport_id, next_name)
        return jsonify(_player_payload(stats, league, sport, user_id))

    @api.route("/games/<int:game_id>", methods=["PUT"])
    @jwt_required()
    def edit_game(game_id):
        user_id = int(get_jwt_identity())
        game = get_game_by_id(game_id)
        if not game:
            return jsonify({"error": "game not found"}), 404
        if not user_can_edit_league(user_id, game["league_id"]):
            return jsonify({"error": "permission denied"}), 403

        data = request.get_json(silent=True) or {}
        try:
            updated = update_game(game_id, **data)
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400
        return jsonify(game_to_dict(updated))

    @api.route("/games/<int:game_id>", methods=["DELETE"])
    @jwt_required()
    def remove_game(game_id):
        user_id = int(get_jwt_identity())
        game = get_game_by_id(game_id)
        if not game:
            return jsonify({"error": "game not found"}), 404
        if not user_can_edit_league(user_id, game["league_id"]):
            return jsonify({"error": "permission denied"}), 403

        delete_game(game_id)
        return jsonify({"success": True})
