import os

from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

from api.social_auth import find_or_create_social_user, get_user_payload
from api.user_schema import ensure_user_schema


def _google_client_ids():
    keys = (
        "GOOGLE_CLIENT_ID",
        "GOOGLE_WEB_CLIENT_ID",
        "GOOGLE_IOS_CLIENT_ID",
        "GOOGLE_ANDROID_CLIENT_ID",
    )
    return [os.environ[key] for key in keys if os.environ.get(key)]


def google_auth_configured():
    return bool(_google_client_ids())


def ensure_google_auth_schema():
    ensure_user_schema()


def verify_google_id_token(token_str):
    audiences = _google_client_ids()
    if not audiences:
        raise ValueError("Google sign-in is not configured")

    request = google_requests.Request()
    last_error = None
    for audience in audiences:
        try:
            info = id_token.verify_oauth2_token(token_str, request, audience=audience)
            issuer = info.get("iss")
            if issuer not in ("accounts.google.com", "https://accounts.google.com"):
                raise ValueError("Invalid Google token issuer")
            if not info.get("email"):
                raise ValueError("Google account has no email")
            return info
        except Exception as exc:
            last_error = exc
    raise ValueError(str(last_error) or "Invalid Google token")


def find_or_create_google_user(google_sub, email, name=None):
    return find_or_create_social_user("google", google_sub, email, display_name=name)


__all__ = [
    "ensure_google_auth_schema",
    "find_or_create_google_user",
    "get_user_payload",
    "google_auth_configured",
    "verify_google_id_token",
]
