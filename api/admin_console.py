"""Dedicated PlayTracker super-admin console.

Separate login, cookie, and JWT audience from the public /login page, the
legacy Flask-Login session, and the future member web app.
"""

import hashlib
import hmac
import os
import secrets
import time
from datetime import timedelta
from functools import wraps

from flask import (
    Blueprint,
    abort,
    current_app,
    g,
    jsonify,
    make_response,
    redirect,
    render_template,
    request,
    url_for,
)
from flask_jwt_extended import create_access_token, decode_token
from jwt.exceptions import PyJWTError

from api.admin_data import (
    count_admins,
    ensure_admin_schema,
    ensure_bootstrap_admin,
    get_user_for_admin,
    list_users_for_admin,
    overview_counts,
    password_is_forbidden,
    set_user_password,
    touch_last_seen,
    user_requires_password_change,
    would_lock_out,
    write_audit,
)
from api.auth_service import authenticate_with_email
from api.brand import APP_NAME
from api.league_db import get_league_by_id, get_sports_for_league, league_to_dict, list_leagues_for_admin
from api.roadmap_data import (
    create_roadmap_item,
    delete_roadmap_item,
    ensure_roadmap_schema,
    get_roadmap_item,
    move_roadmap_item,
    roadmap_board,
    update_roadmap_item,
)
from api.sport_templates import VISIBILITY_OPTIONS
from auth import get_user_by_email, get_user_by_id, verify_password

try:
    from jwt.exceptions import ExpiredSignatureError, InvalidTokenError
except ImportError:
    ExpiredSignatureError = PyJWTError
    InvalidTokenError = PyJWTError


ADMIN_JWT_AUDIENCE = "playtracker-admin"
ADMIN_ACCESS_COOKIE = "pt_admin_access"
ADMIN_CSRF_COOKIE = "pt_admin_csrf"
ADMIN_COOKIE_PATH = "/admin-console"
ADMIN_SESSION_HOURS = 12
LOGIN_RATE_LIMIT = 5
LOGIN_RATE_WINDOW_SECONDS = 15 * 60

admin_bp = Blueprint("admin_console", __name__, url_prefix="/admin-console")

_login_attempts = {}


def admin_hosts():
    raw = (os.environ.get("ADMIN_HOST") or "admin.playtracker.org").strip().lower()
    return {item.strip() for item in raw.split(",") if item.strip()}


def is_admin_host(req=None):
    req = req or request
    host = (req.host or "").split(":")[0].lower()
    if host in admin_hosts():
        return True
    return host.startswith("admin.") and host not in ("admin.",)


def _is_production():
    try:
        if current_app.config.get("SESSION_COOKIE_SECURE"):
            return True
    except RuntimeError:
        pass
    return os.environ.get("FLASK_ENV") == "production"


def _client_ip():
    forwarded = (request.headers.get("X-Forwarded-For") or "").split(",")[0].strip()
    return forwarded or request.remote_addr or "unknown"


def _cookie_kwargs(max_age=None):
    return {
        "path": ADMIN_COOKIE_PATH,
        "httponly": True,
        "samesite": "Lax",
        "secure": _is_production(),
        "max_age": max_age if max_age is not None else ADMIN_SESSION_HOURS * 3600,
    }


def _csrf_secret():
    try:
        secret = current_app.config.get("SECRET_KEY") or os.environ.get("SECRET_KEY")
    except RuntimeError:
        secret = os.environ.get("SECRET_KEY")
    if isinstance(secret, bytes):
        return secret
    return (secret or "playtracker-admin-csrf").encode("utf-8")


def issue_csrf_token():
    nonce = secrets.token_urlsafe(24)
    digest = hmac.new(_csrf_secret(), nonce.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"{nonce}.{digest}"


def _tokens_match(left, right):
    if not left or not right:
        return False
    left_b = left.encode("utf-8") if isinstance(left, str) else left
    right_b = right.encode("utf-8") if isinstance(right, str) else right
    if len(left_b) != len(right_b):
        return False
    return hmac.compare_digest(left_b, right_b)


def valid_csrf_token(token):
    if not token or "." not in token:
        return False
    nonce, digest = token.rsplit(".", 1)
    expected = hmac.new(_csrf_secret(), nonce.encode("utf-8"), hashlib.sha256).hexdigest()
    return _tokens_match(expected, digest)


def login_rate_limited(ip):
    now = time.time()
    hits = [stamp for stamp in _login_attempts.get(ip, []) if now - stamp < LOGIN_RATE_WINDOW_SECONDS]
    _login_attempts[ip] = hits
    return len(hits) >= LOGIN_RATE_LIMIT


def record_login_attempt(ip):
    _login_attempts.setdefault(ip, []).append(time.time())


def clear_login_attempts(ip):
    _login_attempts.pop(ip, None)


def reset_login_rate_limit():
    _login_attempts.clear()


def _set_csrf_cookie(response, token):
    kwargs = _cookie_kwargs()
    kwargs["httponly"] = False
    response.set_cookie(ADMIN_CSRF_COOKIE, token, **kwargs)
    return response


def _set_access_cookie(response, token):
    response.set_cookie(ADMIN_ACCESS_COOKIE, token, **_cookie_kwargs())
    return response


def _clear_admin_cookies(response):
    kwargs = _cookie_kwargs(max_age=0)
    response.set_cookie(ADMIN_ACCESS_COOKIE, "", **kwargs)
    csrf_kwargs = dict(kwargs)
    csrf_kwargs["httponly"] = False
    response.set_cookie(ADMIN_CSRF_COOKIE, "", **csrf_kwargs)
    return response


def create_admin_token(user):
    csrf = issue_csrf_token()
    token = create_access_token(
        identity=str(user.id),
        additional_claims={
            "pt_aud": ADMIN_JWT_AUDIENCE,
            "pt_csrf": csrf,
            "is_admin": True,
        },
        expires_delta=timedelta(hours=ADMIN_SESSION_HOURS),
    )
    return token, csrf


def _read_admin_jwt():
    token = request.cookies.get(ADMIN_ACCESS_COOKIE)
    if not token:
        auth = request.headers.get("Authorization") or ""
        if auth.lower().startswith("bearer "):
            token = auth.split(" ", 1)[1].strip()
    if not token:
        return None
    try:
        decoded = decode_token(token)
    except (ExpiredSignatureError, InvalidTokenError, PyJWTError, Exception):
        return None
    if decoded.get("pt_aud") != ADMIN_JWT_AUDIENCE:
        return None
    return decoded


def current_admin_user():
    decoded = _read_admin_jwt()
    if not decoded:
        return None
    try:
        user_id = int(decoded.get("sub"))
    except (TypeError, ValueError):
        return None
    user = get_user_by_id(user_id)
    if not user or not user.is_admin:
        return None
    return user


def _csrf_ok():
    if request.method in ("GET", "HEAD", "OPTIONS"):
        return True
    form_token = request.form.get("csrf_token") or request.headers.get("X-CSRF-Token") or ""
    if not form_token or not valid_csrf_token(form_token):
        return False
    cookie_token = request.cookies.get(ADMIN_CSRF_COOKIE) or ""
    decoded = _read_admin_jwt()
    jwt_token = (decoded or {}).get("pt_csrf") or ""
    if cookie_token and not _tokens_match(form_token, cookie_token):
        return False
    if jwt_token and not _tokens_match(form_token, jwt_token):
        return False
    return bool(cookie_token or jwt_token)


def admin_login_required(f):
    @wraps(f)
    def wrapped(*args, **kwargs):
        user = current_admin_user()
        if not user:
            if request.accept_mimetypes.best == "application/json":
                abort(401)
            return redirect(url_for("admin_console.login", next=request.path))
        if request.method not in ("GET", "HEAD", "OPTIONS") and not _csrf_ok():
            abort(400)
        g.admin_user = user
        g.must_change_password = user_requires_password_change(user.id)
        if g.must_change_password and request.endpoint not in (
            "admin_console.change_password",
            "admin_console.logout",
        ):
            return redirect(url_for("admin_console.change_password"))
        return f(*args, **kwargs)

    return wrapped


def _no_store(response):
    response.headers["Cache-Control"] = "no-store, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["X-Robots-Tag"] = "noindex, nofollow"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "same-origin"
    return response


@admin_bp.after_request
def _admin_headers(response):
    return _no_store(response)


@admin_bp.context_processor
def _admin_template_globals():
    csrf = request.cookies.get(ADMIN_CSRF_COOKIE) or issue_csrf_token()
    return {
        "admin_csrf_token": csrf,
        "admin_user": getattr(g, "admin_user", None),
        "app_name": APP_NAME,
        "admin_count": count_admins(),
        "must_change_password": bool(getattr(g, "must_change_password", False)),
    }


def init_admin_console(app):
    ensure_admin_schema()
    ensure_roadmap_schema()
    with app.app_context():
        ensure_bootstrap_admin()
    if "admin_console" not in app.blueprints:
        app.register_blueprint(admin_bp)

        @app.before_request
        def _gate_admin_host():
            if not is_admin_host():
                return None
            path = request.path or "/"
            if path.startswith("/admin-console") or path.startswith("/static"):
                return None
            if path in (
                "/favicon.ico",
                "/apple-touch-icon.png",
                "/apple-touch-icon-precomposed.png",
            ):
                return None
            if path == "/":
                return redirect("/admin-console/")
            abort(404)


@admin_bp.route("/login", methods=["GET", "POST"])
def login():
    if current_admin_user() and request.method == "GET":
        if user_requires_password_change(current_admin_user().id):
            return redirect(url_for("admin_console.change_password"))
        return redirect(url_for("admin_console.users"))

    error = None
    csrf = request.cookies.get(ADMIN_CSRF_COOKIE) or issue_csrf_token()

    if request.method == "POST":
        ip = _client_ip()
        if login_rate_limited(ip):
            write_audit(
                None,
                "admin.login.rate_limited",
                ip=ip,
                user_agent=request.headers.get("User-Agent"),
            )
            error = "Too many sign-in attempts. Try again in a few minutes."
            response = make_response(
                render_template("admin_console/login.html", error=error, admin_csrf_token=csrf),
                429,
            )
            return _set_csrf_cookie(response, csrf)

        posted_csrf = request.form.get("csrf_token") or ""
        cookie_csrf = request.cookies.get(ADMIN_CSRF_COOKIE) or ""
        if (
            not valid_csrf_token(posted_csrf)
            or not cookie_csrf
            or not _tokens_match(posted_csrf, cookie_csrf)
        ):
            error = "Could not verify this form. Refresh and try again."
        else:
            identifier = (request.form.get("email") or request.form.get("username") or "").strip()
            password = request.form.get("password") or ""
            record_login_attempt(ip)
            user = authenticate_with_email(identifier, password) if identifier and password else None
            if not user or not user.is_admin:
                write_audit(
                    getattr(user, "id", None),
                    "admin.login.failure",
                    detail=identifier[:120],
                    ip=ip,
                    user_agent=request.headers.get("User-Agent"),
                )
                error = "Invalid credentials or this account is not a super-admin."
            else:
                clear_login_attempts(ip)
                touch_last_seen(user.id)
                token, csrf = create_admin_token(user)
                write_audit(
                    user.id,
                    "admin.login.success",
                    ip=ip,
                    user_agent=request.headers.get("User-Agent"),
                )
                if user_requires_password_change(user.id):
                    nxt = url_for("admin_console.change_password")
                else:
                    nxt = request.args.get("next") or request.form.get("next") or ""
                    if not nxt.startswith("/admin-console"):
                        nxt = url_for("admin_console.users")
                response = redirect(nxt)
                _set_access_cookie(response, token)
                _set_csrf_cookie(response, csrf)
                return response

    response = make_response(
        render_template("admin_console/login.html", error=error, admin_csrf_token=csrf)
    )
    return _set_csrf_cookie(response, csrf)


@admin_bp.route("/logout", methods=["POST"])
@admin_login_required
def logout():
    user = g.admin_user
    write_audit(
        user.id,
        "admin.logout",
        ip=_client_ip(),
        user_agent=request.headers.get("User-Agent"),
    )
    response = redirect(url_for("admin_console.login"))
    return _clear_admin_cookies(response)


@admin_bp.route("/change-password", methods=["GET", "POST"])
@admin_login_required
def change_password():
    error = None
    user = g.admin_user
    forced = user_requires_password_change(user.id)
    if request.method == "POST":
        current_password = request.form.get("current_password") or ""
        new_password = request.form.get("new_password") or ""
        confirm = request.form.get("confirm_password") or ""
        full = get_user_by_email(user.email)
        if not full or not verify_password(full, current_password):
            error = "Current password is incorrect."
        elif new_password != confirm:
            error = "New passwords do not match."
        elif len(new_password) < 8:
            error = "New password must be at least 8 characters."
        elif new_password == current_password or password_is_forbidden(new_password):
            error = "Choose a new password that is not the temporary one."
        else:
            set_user_password(user.id, new_password, require_change=False)
            write_audit(
                user.id,
                "admin.password.change",
                ip=_client_ip(),
                user_agent=request.headers.get("User-Agent"),
            )
            token, csrf = create_admin_token(user)
            response = redirect(url_for("admin_console.users"))
            _set_access_cookie(response, token)
            _set_csrf_cookie(response, csrf)
            return response
    return render_template(
        "admin_console/change_password.html",
        error=error,
        forced=forced,
    )


@admin_bp.route("/")
@admin_bp.route("/users")
@admin_login_required
def users():
    query = (request.args.get("q") or "").strip()
    role = (request.args.get("role") or "all").strip().lower()
    visibility = (request.args.get("visibility") or "").strip().lower()
    if role not in ("all", "admin", "user"):
        role = "all"
    if visibility not in VISIBILITY_OPTIONS:
        visibility = ""
    rows = list_users_for_admin(
        query=query or None,
        role=None if role == "all" else role,
        visibility=visibility or None,
    )
    counts = overview_counts()
    return render_template(
        "admin_console/users.html",
        users=rows,
        counts=counts,
        query=query,
        role=role,
        visibility=visibility,
        visibilities=VISIBILITY_OPTIONS,
    )


@admin_bp.route("/users/<int:user_id>")
@admin_login_required
def user_detail(user_id):
    user = get_user_for_admin(user_id)
    if not user:
        abort(404)
    write_audit(
        g.admin_user.id,
        "admin.view.user",
        target_type="user",
        target_id=user_id,
        ip=_client_ip(),
        user_agent=request.headers.get("User-Agent"),
    )
    return render_template(
        "admin_console/user_detail.html",
        user=user,
        is_self=g.admin_user.id == user["id"],
        lockout_protected=would_lock_out(user["id"]),
    )


@admin_bp.route("/leagues")
@admin_login_required
def leagues():
    query = (request.args.get("q") or "").strip()
    visibility = (request.args.get("visibility") or "").strip().lower()
    if visibility not in VISIBILITY_OPTIONS:
        visibility = ""
    rows = list_leagues_for_admin(
        query=query or None,
        visibility=visibility or None,
    )
    counts = overview_counts()
    return render_template(
        "admin_console/leagues.html",
        leagues=rows,
        counts=counts,
        query=query,
        visibility=visibility,
        visibilities=VISIBILITY_OPTIONS,
    )


@admin_bp.route("/roadmap")
@admin_login_required
def roadmap():
    return render_template(
        "admin_console/roadmap.html",
        board=roadmap_board(),
    )


def _roadmap_json_payload():
    if request.is_json:
        return request.get_json(silent=True) or {}
    return request.form.to_dict(flat=True)


def _roadmap_wants_json():
    return (
        request.is_json
        or "application/json" in (request.accept_mimetypes.best or "")
        or request.headers.get("X-Requested-With") == "XMLHttpRequest"
    )


@admin_bp.route("/roadmap/items", methods=["POST"])
@admin_login_required
def roadmap_create_item():
    payload = _roadmap_json_payload()
    if "details" in payload and isinstance(payload.get("details"), str):
        payload["details"] = [
            line.strip() for line in payload["details"].split("\n") if line.strip()
        ]
    if payload.get("premium") in ("1", "true", "on", True):
        payload["premium"] = True
    else:
        payload["premium"] = False
    try:
        item = create_roadmap_item(payload)
    except ValueError as err:
        if _roadmap_wants_json():
            return jsonify({"error": str(err)}), 400
        abort(400)
    write_audit(
        g.admin_user.id,
        "admin.roadmap.create",
        target_type="roadmap",
        target_id=item["id"],
        detail=item["title"],
        ip=_client_ip(),
        user_agent=request.headers.get("User-Agent"),
    )
    if _roadmap_wants_json():
        return jsonify(item)
    return redirect(url_for("admin_console.roadmap"))


@admin_bp.route("/roadmap/items/<item_id>", methods=["POST", "PATCH"])
@admin_login_required
def roadmap_update_item(item_id):
    if not get_roadmap_item(item_id):
        abort(404)
    payload = _roadmap_json_payload()
    if "details" in payload and isinstance(payload.get("details"), str):
        payload["details"] = [
            line.strip() for line in payload["details"].split("\n") if line.strip()
        ]
    if "premium" in payload:
        payload["premium"] = payload.get("premium") in ("1", "true", "on", True)
    item = update_roadmap_item(item_id, payload)
    write_audit(
        g.admin_user.id,
        "admin.roadmap.update",
        target_type="roadmap",
        target_id=item_id,
        detail=item["title"] if item else None,
        ip=_client_ip(),
        user_agent=request.headers.get("User-Agent"),
    )
    if _roadmap_wants_json():
        return jsonify(item)
    return redirect(url_for("admin_console.roadmap"))


@admin_bp.route("/roadmap/items/<item_id>/delete", methods=["POST", "DELETE"])
@admin_login_required
def roadmap_delete_item(item_id):
    ok = delete_roadmap_item(item_id)
    if not ok:
        abort(404)
    write_audit(
        g.admin_user.id,
        "admin.roadmap.delete",
        target_type="roadmap",
        target_id=item_id,
        ip=_client_ip(),
        user_agent=request.headers.get("User-Agent"),
    )
    if _roadmap_wants_json():
        return jsonify({"ok": True})
    return redirect(url_for("admin_console.roadmap"))


@admin_bp.route("/roadmap/items/<item_id>/move", methods=["POST"])
@admin_login_required
def roadmap_move_item(item_id):
    payload = _roadmap_json_payload()
    direction = (payload.get("direction") or "").strip().lower()
    if direction not in ("left", "right", "up", "down"):
        abort(400)
    item = move_roadmap_item(item_id, direction)
    if not item:
        abort(404)
    write_audit(
        g.admin_user.id,
        "admin.roadmap.move",
        target_type="roadmap",
        target_id=item_id,
        detail=direction,
        ip=_client_ip(),
        user_agent=request.headers.get("User-Agent"),
    )
    if _roadmap_wants_json():
        return jsonify(item)
    return redirect(url_for("admin_console.roadmap"))


@admin_bp.route("/leagues/<int:league_id>")
@admin_login_required
def league_detail(league_id):
    league = get_league_by_id(league_id)
    if not league:
        abort(404)
    from api.league_db import sport_to_dict
    from api.public_web import _pick_sport, _sport_block
    from api.web_present import with_sport_glyph

    sports = get_sports_for_league(league["id"]) or []
    selected = _pick_sport(sports, request.args.get("sport"))
    block = _sport_block(league, selected, year_arg=request.args.get("year")) if selected else None
    tabs = [with_sport_glyph(sport_to_dict(sport)) for sport in sports]
    selected_year = block["year"] if block else None
    for tab in tabs:
        tab["href"] = url_for(
            "admin_console.league_detail",
            league_id=league["id"],
            sport=tab["id"],
            year=selected_year or "all",
        )
    owner = get_user_by_id(league.get("owner_id")) if league.get("owner_id") else None
    write_audit(
        g.admin_user.id,
        "admin.view.league",
        target_type="league",
        target_id=league_id,
        detail=league.get("visibility"),
        ip=_client_ip(),
        user_agent=request.headers.get("User-Agent"),
    )
    return render_template(
        "admin_console/league_detail.html",
        league=league_to_dict(league, include_invite_code=True),
        league_row=league,
        owner=owner,
        sport_tabs=tabs,
        block=block,
    )
