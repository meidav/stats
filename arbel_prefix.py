from flask import redirect, request


ARBEL_PREFIX = "/arbel"

KEEP_PREFIXES = (
    "/api",
    "/static",
)

KEEP_EXACT = {
    "/",
    "/login",
    "/logout",
    "/deploy",
    "/favicon.ico",
    "/apple-touch-icon.png",
    "/apple-touch-icon-precomposed.png",
    "/robots.txt",
    "/privacy",
    "/terms",
    "/about",
    "/leagues",
    "/l",
}

KEEP_STARTSWITH = (
    "/admin/settings",
    "/admin/import",
    "/l/",
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


def redirect_legacy_to_arbel():
    if is_arbel_request():
        return None

    path = request.path or "/"
    if any(path.startswith(prefix) for prefix in KEEP_PREFIXES):
        return None
    if path == "/":
        return None
    if path in KEEP_EXACT:
        return None
    if path == "/admin":
        return None
    if any(path.startswith(prefix) for prefix in KEEP_STARTSWITH):
        return None

    dest = ARBEL_PREFIX + (path if path != "/" else "/")
    if request.query_string:
        dest += "?" + request.query_string.decode("utf-8", "ignore")
    return redirect(dest, code=302)
