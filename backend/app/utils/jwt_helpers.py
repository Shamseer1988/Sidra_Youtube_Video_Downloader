"""
JWT helper utilities — token blocklisting, custom claims, and
an admin-required decorator.
"""

from __future__ import annotations

import functools
import os
from datetime import timedelta

import redis
from flask import jsonify
from flask_jwt_extended import get_jwt, get_jwt_identity, verify_jwt_in_request

# ── Redis blocklist ─────────────────────────────────────────────────
_redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/1")
_blocklist_store = redis.Redis.from_url(_redis_url, decode_responses=True)

_ACCESS_EXPIRES = timedelta(minutes=15)


def add_token_to_blocklist(jti: str, expires_delta: timedelta | None = None) -> None:
    """Store a JTI in Redis with automatic expiry matching the token's lifetime."""
    ttl = expires_delta or _ACCESS_EXPIRES
    _blocklist_store.setex(f"blocklist:{jti}", int(ttl.total_seconds()), "1")


def is_token_blocklisted(jti: str) -> bool:
    """Return ``True`` if the token identified by *jti* has been revoked."""
    return _blocklist_store.exists(f"blocklist:{jti}") > 0


# ── JWT callback registration ──────────────────────────────────────
def register_jwt_callbacks(jwt_manager) -> None:
    """Attach all custom JWT callbacks to the given JWTManager instance."""

    @jwt_manager.token_in_blocklist_loader
    def _check_blocklist(_jwt_header: dict, jwt_payload: dict) -> bool:
        return is_token_blocklisted(jwt_payload["jti"])

    @jwt_manager.additional_claims_loader
    def _add_claims(identity: str) -> dict:
        from app.models.user import User  # deferred to avoid circular imports
        user = User.query.get(identity)
        if user:
            return {"role": user.role, "username": user.username}
        return {}

    @jwt_manager.expired_token_loader
    def _expired(_jwt_header, _jwt_payload):
        return jsonify(success=False, message="Token has expired."), 401

    @jwt_manager.invalid_token_loader
    def _invalid(error_string):
        return jsonify(success=False, message=f"Invalid token: {error_string}"), 401

    @jwt_manager.unauthorized_loader
    def _missing(error_string):
        return jsonify(success=False, message=f"Missing token: {error_string}"), 401

    @jwt_manager.revoked_token_loader
    def _revoked(_jwt_header, _jwt_payload):
        return jsonify(success=False, message="Token has been revoked."), 401


# ── Admin-required decorator ───────────────────────────────────────
def admin_required(fn):
    """
    Decorator that enforces JWT authentication **and** the ``admin`` role.
    Must be applied *after* ``@jwt_required()`` or used standalone.
    """

    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        claims = get_jwt()
        if claims.get("role") != "admin":
            return jsonify(success=False, message="Admin privileges required."), 403
        return fn(*args, **kwargs)

    return wrapper
