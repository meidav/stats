"""Sign in with Apple identity token verification."""

import os

import jwt
from jwt import PyJWKClient

from api.social_auth import find_or_create_social_user
from api.user_schema import ensure_user_schema

APPLE_ISSUER = "https://appleid.apple.com"
APPLE_JWKS_URL = "https://appleid.apple.com/auth/keys"

# Apple signs the identity token for the client that requested it: the bundle ID for
# native iOS sign-in, or the Service ID for the web/Android flow.
DEFAULT_BUNDLE_ID = "org.playtracker.app"

_jwk_client = None


def _apple_client_ids():
    keys = ("APPLE_CLIENT_ID", "APPLE_BUNDLE_ID", "APPLE_SERVICE_ID")
    configured = [os.environ[key] for key in keys if os.environ.get(key)]
    if configured:
        return configured
    return [DEFAULT_BUNDLE_ID]


def apple_auth_configured():
    return bool(_apple_client_ids())


def ensure_apple_auth_schema():
    ensure_user_schema()


def _signing_key(token_str):
    global _jwk_client
    if _jwk_client is None:
        _jwk_client = PyJWKClient(APPLE_JWKS_URL, cache_keys=True, lifespan=3600)
    return _jwk_client.get_signing_key_from_jwt(token_str).key


def verify_apple_identity_token(token_str):
    audiences = _apple_client_ids()
    if not audiences:
        raise ValueError("Apple sign-in is not configured")

    try:
        key = _signing_key(token_str)
    except Exception as exc:
        raise ValueError("Could not verify the Apple token signature") from exc

    last_error = None
    for audience in audiences:
        try:
            claims = jwt.decode(
                token_str,
                key,
                algorithms=["RS256"],
                audience=audience,
                issuer=APPLE_ISSUER,
            )
        except Exception as exc:
            last_error = exc
            continue

        if not claims.get("sub"):
            raise ValueError("Apple token has no subject")
        return claims

    raise ValueError(str(last_error) or "Invalid Apple token")


def find_or_create_apple_user(apple_sub, email, display_name=None):
    return find_or_create_social_user(
        "apple",
        apple_sub,
        email,
        display_name=display_name,
    )


def build_display_name(full_name):
    """Apple sends the name as separate parts, and only on the first authorization."""
    if not isinstance(full_name, dict):
        return None
    parts = [
        (full_name.get("givenName") or "").strip(),
        (full_name.get("familyName") or "").strip(),
    ]
    return " ".join(part for part in parts if part) or None
