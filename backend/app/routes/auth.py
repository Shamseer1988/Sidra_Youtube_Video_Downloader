"""
Authentication routes — login, logout, token refresh, current user.
"""

from __future__ import annotations

from datetime import timedelta

from flask import Blueprint, jsonify, request
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    get_jwt,
    get_jwt_identity,
    jwt_required,
    set_access_cookies,
    set_refresh_cookies,
    unset_jwt_cookies,
)

from app.models.user import User
from app.utils.jwt_helpers import add_token_to_blocklist
from app.utils.logger import logger

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.route("/login", methods=["POST"])
def login():
    """
    Authenticate a user and set JWT cookies.

    Expects JSON: ``{"username": "…", "password": "…"}``
    """
    data = request.get_json(silent=True) or {}
    username = data.get("username", "").strip()
    password = data.get("password", "")

    if not username or not password:
        return jsonify(success=False, message="Username and password are required."), 400

    user = User.query.filter_by(username=username).first()

    if user is None or not user.check_password(password):
        return jsonify(success=False, message="Invalid credentials."), 401

    if not user.is_active:
        return jsonify(success=False, message="Account is deactivated."), 403

    identity = str(user.id)
    access_token = create_access_token(identity=identity)
    refresh_token = create_refresh_token(identity=identity)

    response = jsonify(success=True, data=user.to_dict(), message="Login successful.")
    set_access_cookies(response, access_token)
    set_refresh_cookies(response, refresh_token)

    logger.info(f"User logged in: {user.username}", source="auth", user_id=user.id)
    return response, 200


@auth_bp.route("/logout", methods=["POST"])
@jwt_required()
def logout():
    """Revoke the current access token and clear cookies."""
    jti = get_jwt()["jti"]
    add_token_to_blocklist(jti, expires_delta=timedelta(minutes=15))

    response = jsonify(success=True, data=None, message="Logged out.")
    unset_jwt_cookies(response)

    logger.info("User logged out", source="auth", user_id=get_jwt_identity())
    return response, 200


@auth_bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    """Issue a fresh access token using a valid refresh token."""
    identity = get_jwt_identity()
    new_access = create_access_token(identity=identity)

    response = jsonify(success=True, data=None, message="Token refreshed.")
    set_access_cookies(response, new_access)
    return response, 200


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    """Return the currently authenticated user's profile."""
    user = User.query.get(get_jwt_identity())
    if user is None:
        return jsonify(success=False, message="User not found."), 404
    return jsonify(success=True, data=user.to_dict(), message="Current user."), 200
