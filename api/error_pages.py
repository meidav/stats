"""PlayTracker web error pages: random sport or game flavor, matching copy."""

from __future__ import annotations

import random

from flask import jsonify, render_template, request

from api.web_present import LEAGUE_ICON_MARKS
from arbel_prefix import is_arbel_request

ERROR_CODES = (400, 401, 403, 404, 405, 429, 500)

# Each flavor is a unit: icon + kicker + per-status title/lead. Never mix them.
ERROR_FLAVORS = [
    {
        "id": "beach_volleyball",
        "kicker": "Out of bounds",
        "copy": {
            404: {
                "title": "Ball went long",
                "lead": "This page sailed past the antenna. Try home, or browse public leagues.",
            },
            500: {
                "title": "Whiffed that one",
                "lead": "Something spiked the server. The ball is still in play. Try again in a moment.",
            },
            403: {
                "title": "Antenna violation",
                "lead": "That side of the court is closed. You do not have a play here.",
            },
            401: {
                "title": "Not on the roster",
                "lead": "Sign in before you take the court.",
            },
            429: {
                "title": "Side out",
                "lead": "Too many swings in a row. Catch your breath and try again.",
            },
        },
    },
    {
        "id": "cards",
        "kicker": "Misdeal",
        "copy": {
            404: {
                "title": "That's a misdeal",
                "lead": "This hand is not in the deck. Cut the cards and start from home.",
            },
            500: {
                "title": "House folded",
                "lead": "The dealer shuffled too hard. We will deal again shortly.",
            },
            403: {
                "title": "Not your seat",
                "lead": "This table is closed. You need an invite to sit down.",
            },
            401: {
                "title": "Ante up",
                "lead": "Buy in first. Sign in to take a seat.",
            },
            429: {
                "title": "Slow roll",
                "lead": "Too many cards off the top. Wait for the next hand.",
            },
        },
    },
    {
        "id": "chess",
        "kicker": "Illegal move",
        "copy": {
            404: {
                "title": "You're in check",
                "lead": "You can't move there. That square is empty. Try a different one.",
            },
            500: {
                "title": "Forked",
                "lead": "Our king walked into a fork. Reset the board and try again.",
            },
            403: {
                "title": "Pinned",
                "lead": "That piece cannot move. You do not have access to this square.",
            },
            401: {
                "title": "Clock not started",
                "lead": "Sign in before you touch a piece.",
            },
            429: {
                "title": "Flag fell",
                "lead": "Too many moves too fast. Wait, then play on.",
            },
        },
    },
    {
        "id": "scrabble",
        "kicker": "Challenge",
        "copy": {
            404: {
                "title": "That's not a word",
                "lead": "Those letters don't play here. Draw again from home or the league list.",
            },
            500: {
                "title": "Tile bag jammed",
                "lead": "We dumped the rack. Give us a second to draw again.",
            },
            403: {
                "title": "Blank not allowed",
                "lead": "That play is challenged. You don't have the tiles for this page.",
            },
            401: {
                "title": "Not your rack",
                "lead": "Sign in to play your letters.",
            },
            429: {
                "title": "Lose a turn",
                "lead": "Too many exchanges. Sit this one out, then try again.",
            },
        },
    },
    {
        "id": "tennis",
        "kicker": "Fault",
        "copy": {
            404: {
                "title": "Long",
                "lead": "That serve was out. Take a second serve from home.",
            },
            500: {
                "title": "Let",
                "lead": "It clipped the tape. Replay the point.",
            },
            403: {
                "title": "Foot fault",
                "lead": "You stepped over the line. This court is not yours.",
            },
            401: {
                "title": "Not on the draw",
                "lead": "Sign in to take your court.",
            },
            429: {
                "title": "Time violation",
                "lead": "Too many balls in play. Breathe, then serve again.",
            },
        },
    },
    {
        "id": "basketball",
        "kicker": "Air ball",
        "copy": {
            404: {
                "title": "Bricked it",
                "lead": "Nothing but rim. That page is not on this court.",
            },
            500: {
                "title": "Travel",
                "lead": "We took an extra step. Reset and try the shot again.",
            },
            403: {
                "title": "Goaltending",
                "lead": "That basket is protected. You can't finish this play.",
            },
            401: {
                "title": "Not in the lineup",
                "lead": "Check in at the scorer's table. Sign in first.",
            },
            429: {
                "title": "Shot clock",
                "lead": "Too many possessions. Inbound it again in a second.",
            },
        },
    },
    {
        "id": "soccer",
        "kicker": "Offside",
        "copy": {
            404: {
                "title": "Offside",
                "lead": "That run was a step too early. This page is not on the pitch.",
            },
            500: {
                "title": "Own goal",
                "lead": "We put it in the wrong net. Kick off again.",
            },
            403: {
                "title": "Red card",
                "lead": "You're sent off this play. No access here.",
            },
            401: {
                "title": "Not in the squad",
                "lead": "Sign in before you take the field.",
            },
            429: {
                "title": "Advantage over",
                "lead": "Too many touches. Wait for the whistle, then go again.",
            },
        },
    },
    {
        "id": "monopoly",
        "kicker": "Go to jail",
        "copy": {
            404: {
                "title": "Do not pass Go",
                "lead": "This property is not on the board. Head home without $200.",
            },
            500: {
                "title": "Bank error",
                "lead": "Not in your favor this time. Take another turn in a moment.",
            },
            403: {
                "title": "Just visiting",
                "lead": "You can look, but you can't buy. This space is closed.",
            },
            401: {
                "title": "Not a player",
                "lead": "Pick a token. Sign in to start the game.",
            },
            429: {
                "title": "Doubles limit",
                "lead": "Three doubles and you're done for now. Wait, then roll again.",
            },
        },
    },
    {
        "id": "dice",
        "kicker": "Snake eyes",
        "copy": {
            404: {
                "title": "Snake eyes",
                "lead": "That roll didn't hit. Shake the cup and start from home.",
            },
            500: {
                "title": "Cocked die",
                "lead": "That one didn't land flat. Re-roll.",
            },
            403: {
                "title": "Not your cup",
                "lead": "Those dice stay in the box. You don't get this roll.",
            },
            401: {
                "title": "No dice",
                "lead": "Sign in before you roll.",
            },
            429: {
                "title": "Too many rolls",
                "lead": "Yahtzee needs a pause. Try again in a second.",
            },
        },
    },
    {
        "id": "catan",
        "kicker": "Robber",
        "copy": {
            404: {
                "title": "Robber stole it",
                "lead": "This hex is not on the island. Build back from home.",
            },
            500: {
                "title": "Rolled a seven",
                "lead": "The robber blocked the server. Move it and try again.",
            },
            403: {
                "title": "No road",
                "lead": "You can't settle here. That spot is already claimed.",
            },
            401: {
                "title": "Not at the table",
                "lead": "Sign in to place your first settlement.",
            },
            429: {
                "title": "Discard half",
                "lead": "Too many cards in hand. Wait, then roll again.",
            },
        },
    },
    {
        "id": "checkers",
        "kicker": "No jump",
        "copy": {
            404: {
                "title": "Can't move there",
                "lead": "That square is empty. Slide back home and pick another.",
            },
            500: {
                "title": "Forced jump",
                "lead": "We took a piece we didn't mean to. Reset the board.",
            },
            403: {
                "title": "Blocked",
                "lead": "That man is locked. You don't have a jump on this page.",
            },
            401: {
                "title": "Not your color",
                "lead": "Sign in before you touch a piece.",
            },
            429: {
                "title": "Multi-jump pause",
                "lead": "Too many hops. Land, then go again.",
            },
        },
    },
    {
        "id": "puzzle",
        "kicker": "Missing piece",
        "copy": {
            404: {
                "title": "Doesn't fit",
                "lead": "This piece is from another puzzle. Try home or public leagues.",
            },
            500: {
                "title": "Upside down",
                "lead": "We forced a piece. Flip it and try again.",
            },
            403: {
                "title": "Wrong box",
                "lead": "This puzzle isn't yours. You don't have the lid for it.",
            },
            401: {
                "title": "Box still sealed",
                "lead": "Sign in to dump out the pieces.",
            },
            429: {
                "title": "Table shake",
                "lead": "Too much sorting at once. Pause, then place another piece.",
            },
        },
    },
]


def _mark_for(flavor_id):
    return dict(LEAGUE_ICON_MARKS.get(flavor_id) or {"glyph_src": None, "glyph": "🎮"})


def copy_for_flavor(flavor, code):
    table = flavor.get("copy") or {}
    if code in table:
        return table[code]
    if code >= 500:
        return table.get(500) or table.get(404) or {"title": "Whiffed that one", "lead": "Try again."}
    if code in (401, 403):
        return table.get(code) or table.get(403) or table.get(404)
    return table.get(404) or {"title": "Missing page", "lead": "Head back home."}


def pick_error_flavor(code=404, flavor_id=None):
    chosen = None
    if flavor_id:
        chosen = next((item for item in ERROR_FLAVORS if item["id"] == flavor_id), None)
    if chosen is None:
        chosen = random.choice(ERROR_FLAVORS)
    mark = _mark_for(chosen["id"])
    text = copy_for_flavor(chosen, int(code))
    return {
        "id": chosen["id"],
        "kicker": chosen["kicker"],
        "title": text["title"],
        "lead": text["lead"],
        "glyph_src": mark.get("glyph_src"),
        "glyph": mark.get("glyph") or "",
    }


def _wants_json():
    path = request.path or ""
    if path.startswith("/api"):
        return True
    best = request.accept_mimetypes.best
    if best == "application/json" and request.accept_mimetypes["application/json"] >= request.accept_mimetypes["text/html"]:
        return True
    return False


def render_web_error(code, error=None):
    code = int(code)
    if _wants_json():
        description = getattr(error, "description", None) or "error"
        return jsonify({"error": str(description)}), code

    if is_arbel_request():
        arbel = {
            404: {
                "title": "Ball went long",
                "message": "This page is out of boundaries.",
            },
            500: {
                "title": "Whiffed that one",
                "message": "Something spiked the server. The ball is still in play though. Try again or head back to stats.",
            },
        }.get(code) or {
            "title": "Whiffed that one",
            "message": "Something went out of bounds. Try again or head back to stats.",
        }
        detail = None
        if code >= 500:
            from flask import current_app

            if current_app.debug and error is not None:
                import traceback

                detail = "".join(traceback.format_exception(type(error), error, error.__traceback__))
        return render_template(
            "error.html",
            code=code,
            title=arbel["title"],
            message=arbel["message"],
            detail=detail,
        ), code

    flavor_id = (request.args.get("play") or "").strip() or None
    flavor = pick_error_flavor(code, flavor_id=flavor_id)
    detail = None
    if code >= 500:
        from flask import current_app

        if current_app.debug and error is not None:
            import traceback

            detail = "".join(traceback.format_exception(type(error), error, error.__traceback__))
    return render_template(
        "marketing_error.html",
        code=code,
        flavor=flavor,
        detail=detail,
        kind="http",
    ), code


LEAGUE_UNAVAILABLE_LEAD = (
    "This league is not on the public web. If you were invited, open PlayTracker "
    "and join with an invite code. Anyone can browse the public list."
)


def render_league_unavailable():
    flavor_id = (request.args.get("play") or "").strip() or None
    flavor = pick_error_flavor(404, flavor_id=flavor_id)
    flavor = dict(flavor)
    flavor["lead"] = LEAGUE_UNAVAILABLE_LEAD
    return render_template(
        "marketing_error.html",
        code=404,
        flavor=flavor,
        detail=None,
        kind="league",
    ), 404


def register_error_pages(app):
    def _http_error(error):
        return render_web_error(error.code or 500, error)

    for code in ERROR_CODES:
        app.register_error_handler(code, _http_error)
