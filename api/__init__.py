from datetime import timedelta

from flask import Blueprint
from flask_cors import CORS
from flask_jwt_extended import JWTManager

from api.league_db import create_leagues_tables
from api.google_auth import ensure_google_auth_schema
from api.app_settings import apply_runtime_settings, ensure_settings_schema
from api.routes import register_routes

api_bp = Blueprint("api", __name__, url_prefix="/api/v1")


def init_api(app):
    app.config.setdefault("JWT_SECRET_KEY", app.config["SECRET_KEY"])
    app.config.setdefault("JWT_ACCESS_TOKEN_EXPIRES", timedelta(days=30))
    JWTManager(app)
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    create_leagues_tables()
    ensure_google_auth_schema()
    ensure_settings_schema()
    apply_runtime_settings(app)
    register_routes(api_bp)
    app.register_blueprint(api_bp)
