from flask import jsonify, request
from flask_jwt_extended import (
    create_access_token,
    get_jwt_identity,
    jwt_required,
    verify_jwt_in_request,
)

from auth import get_user_by_username, verify_password
from api.brand import APP_DOMAIN, APP_NAME, APP_TAGLINE, APP_URL
from api.game_db import (
    add_game,
    delete_game,
    game_to_dict,
    get_game_by_id,
    get_games_for_sport,
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
    league_to_dict,
    search_public_leagues,
    sport_to_dict,
    user_can_access_league,
)
from api.sport_templates import get_template, list_templates
from api.stats_service import compute_player_stats, compute_sport_stats


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
        templates = []
        for template in list_templates():
            templates.append(
                {
                    "id": template["id"],
                    "name": template["name"],
                    "players_per_side": template["players_per_side"],
                    "score_direction": template["score_direction"],
                    "default_name": template["default_name"],
                    "configurable": template.get("configurable", False),
                }
            )
        return jsonify({"templates": templates})

    @api.route("/auth/login", methods=["POST"])
    def api_login():
        data = request.get_json(silent=True) or {}
        username = (data.get("username") or "").strip()
        password = data.get("password") or ""

        if not username or not password:
            return jsonify({"error": "username and password required"}), 400

        user = get_user_by_username(username)
        if not user or not verify_password(user, password):
            return jsonify({"error": "invalid credentials"}), 401

        token = create_access_token(identity=str(user.id))
        return jsonify(
            {
                "access_token": token,
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "is_admin": user.is_admin,
                },
            }
        )

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

        try:
            league = create_league(
                owner_id=user_id,
                name=name,
                visibility=visibility,
                description=description,
                slug=slug,
            )
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400

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
        leagues = get_leagues_for_user(user_id)
        result = []
        for league in leagues:
            item = league_to_dict(league, include_invite_code=True)
            item["sports"] = [
                sport_to_dict(s) for s in get_sports_for_league(league["id"])
            ]
            result.append(item)
        return jsonify({"leagues": result})

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

        is_member = user_id and user_can_access_league(user_id, league)
        include_invite = is_member and league.get("owner_id") == user_id
        payload = league_to_dict(league, include_invite_code=include_invite)
        payload["sports"] = [
            sport_to_dict(s) for s in get_sports_for_league(league["id"])
        ]
        return jsonify(payload)

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
                        "sport_count": league["sport_count"],
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
        return jsonify({"games": [game_to_dict(g) for g in games]})

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
        try:
            stats = compute_sport_stats(sport_id, year=year, min_games=min_games)
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400
        return jsonify(stats)

    @api.route("/sports/<int:sport_id>/players/<player_name>", methods=["GET"])
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
        stats = compute_player_stats(sport_id, player_name, year=year)
        return jsonify(stats)

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
