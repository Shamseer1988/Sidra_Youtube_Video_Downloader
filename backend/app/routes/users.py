"""
User management routes — admin-only CRUD operations.
"""

from __future__ import annotations

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.extensions import db
from app.models.user import ROLE_ADMIN, ROLE_USER, User
from app.utils.jwt_helpers import admin_required
from app.utils.logger import logger

users_bp = Blueprint("users", __name__, url_prefix="/api/users")


@users_bp.route("", methods=["GET"])
@admin_required
def list_users():
    """Return all users (admin only)."""
    users = User.query.order_by(User.created_at.desc()).all()
    return jsonify(
        success=True,
        data=[u.to_dict() for u in users],
        message="Users retrieved.",
    )


@users_bp.route("", methods=["POST"])
@admin_required
def create_user():
    """
    Create a new user (admin only).

    Expects JSON: ``{"username", "email", "password", "role"?}``
    """
    data = request.get_json(silent=True) or {}
    username = data.get("username", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    role = data.get("role", ROLE_USER)

    if not username or not email or not password:
        return jsonify(success=False, message="Username, email, and password are required."), 400

    if role not in (ROLE_ADMIN, ROLE_USER):
        role = ROLE_USER

    if User.query.filter_by(username=username).first():
        return jsonify(success=False, message="Username already exists."), 409

    if User.query.filter_by(email=email).first():
        return jsonify(success=False, message="Email already exists."), 409

    user = User(username=username, email=email, role=role)
    user.set_password(password)

    db.session.add(user)
    db.session.commit()

    logger.info(f"User created: {username}", source="users")
    return jsonify(success=True, data=user.to_dict(), message="User created."), 201


@users_bp.route("/<user_id>", methods=["PUT"])
@admin_required
def update_user(user_id: str):
    """
    Update an existing user (admin only).

    Accepts partial updates for ``username``, ``email``, ``role``,
    ``is_active``, ``avatar_url``, ``password``.
    """
    user = User.query.get(user_id)
    if user is None:
        return jsonify(success=False, message="User not found."), 404

    data = request.get_json(silent=True) or {}

    if "username" in data:
        new_name = data["username"].strip()
        existing = User.query.filter(User.username == new_name, User.id != user.id).first()
        if existing:
            return jsonify(success=False, message="Username already taken."), 409
        user.username = new_name

    if "email" in data:
        new_email = data["email"].strip().lower()
        existing = User.query.filter(User.email == new_email, User.id != user.id).first()
        if existing:
            return jsonify(success=False, message="Email already taken."), 409
        user.email = new_email

    if "role" in data and data["role"] in (ROLE_ADMIN, ROLE_USER):
        user.role = data["role"]

    if "is_active" in data:
        user.is_active = bool(data["is_active"])

    if "avatar_url" in data:
        user.avatar_url = data["avatar_url"]

    if "password" in data and data["password"]:
        user.set_password(data["password"])

    db.session.commit()

    logger.info(f"User updated: {user.username}", source="users")
    return jsonify(success=True, data=user.to_dict(), message="User updated.")


@users_bp.route("/<user_id>", methods=["DELETE"])
@admin_required
def delete_user(user_id: str):
    """Delete a user (admin only). An admin cannot delete themselves."""
    current_user_id = get_jwt_identity()

    if str(user_id) == str(current_user_id):
        return jsonify(success=False, message="Cannot delete your own account."), 400

    user = User.query.get(user_id)
    if user is None:
        return jsonify(success=False, message="User not found."), 404

    username = user.username
    db.session.delete(user)
    db.session.commit()

    logger.info(f"User deleted: {username}", source="users")
    return jsonify(success=True, data=None, message="User deleted.")
