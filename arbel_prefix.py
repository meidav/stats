from flask import redirect, request


ARBEL_PREFIX = "/arbel"

# Only these old stats URLs still bounce to /arbel. Unknown paths stay on PlayTracker.
LEGACY_PATH_PREFIXES = (
    "/stats",
    "/top_teams",
    "/player/",
    "/games",
    "/add_game",
    "/edit_game",
    "/edit_games",
    "/delete/",
    "/delete_vollis",
    "/delete_tennis",
    "/delete_one_v_one",
    "/delete_other",
    "/advanced_stats",
    "/vollis_",
    "/add_vollis",
    "/edit_vollis",
    "/tennis_",
    "/add_tennis",
    "/edit_tennis",
    "/one_v_one",
    "/add_one_v_one",
    "/edit_one_v_one",
    "/single_game_stats",
    "/other_stats",
    "/other_games",
    "/other_player",
    "/add_other",
    "/edit_other",
    "/admin/users",
    "/admin/players",
    "/admin/edit-user",
    "/admin/change-password",
    "/refresh-user",
    "/fix-admin",
)


class ArbelPrefixMiddleware:
    """Serve existing stats routes under /arbel without rewriting every Flask route."""

    def __init__(self, app, prefix=ARBEL_PREFIX):
        self.app = app
        self.prefix = prefix

    def __call__(self, environ, start_response):
        path = environ.get("PATH_INFO", "") or "/"
        if path == self.prefix or path.startswith(self.prefix + "/"):
            rest = path[len(self.prefix) :] or "/"
            environ["SCRIPT_NAME"] = (environ.get("SCRIPT_NAME") or "") + self.prefix
            environ["PATH_INFO"] = rest
        return self.app(environ, start_response)


def is_arbel_request():
    return (request.script_root or "").rstrip("/") == ARBEL_PREFIX


def is_legacy_arbel_path(path):
    path = path or "/"
    for prefix in LEGACY_PATH_PREFIXES:
        if prefix.endswith("_") or prefix.endswith("/"):
            if path.startswith(prefix):
                return True
            continue
        if path == prefix or path.startswith(prefix + "/") or path.startswith(prefix + "_"):
            return True
    return False


def redirect_legacy_to_arbel():
    if is_arbel_request():
        return None

    path = request.path or "/"
    if not is_legacy_arbel_path(path):
        return None

    dest = ARBEL_PREFIX + (path if path != "/" else "/")
    if request.query_string:
        dest += "?" + request.query_string.decode("utf-8", "ignore")
    return redirect(dest, code=302)
