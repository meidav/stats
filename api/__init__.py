from flask import Blueprint
from flask_cors import CORS
from flask_jwt_extended import JWTManager

from api.league_db import create_leagues_tables
from api.routes import register_routes

api_bp = Blueprint("api", __name__, url_prefix="/api/v1")


def init_api(app):
    app.config.setdefault("JWT_SECRET_KEY", app.config["SECRET_KEY"])
    JWTManager(app)
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    create_leagues_tables()
    register_routes(api_bp)
    app.register_blueprint(api_bp)
