"""
Settings routes — user settings CRUD and server-path browsing.
"""

from __future__ import annotations

import os
from pathlib import Path

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.extensions import db
from app.models.setting import DEFAULT_SETTINGS, Setting
from app.utils.logger import logger

settings_bp = Blueprint("settings", __name__, url_prefix="/api/settings")


@settings_bp.route("", methods=["GET"])
@jwt_required()
def get_settings():
    """Return all settings for the current user (merged with defaults)."""
    user_id = get_jwt_identity()
    merged = Setting.get_all_for_user(user_id)
    return jsonify(success=True, data=merged, message="Settings retrieved.")


@settings_bp.route("", methods=["PUT"])
@jwt_required()
def update_settings():
    """
    Partially update settings for the current user.

    Expects JSON: ``{"key1": value1, "key2": value2, …}``
    """
    user_id = get_jwt_identity()
    data = request.get_json(silent=True) or {}

    if not data:
        return jsonify(success=False, message="No settings provided."), 400

    updated = {}
    for key, value in data.items():
        Setting.set(key=key, value=value, user_id=user_id)
        updated[key] = value

    logger.info(
        f"Settings updated ({len(updated)} keys)", source="settings", user_id=user_id
    )
    return jsonify(success=True, data=updated, message="Settings updated.")


@settings_bp.route("/paths/browse", methods=["GET"])
@jwt_required()
def browse_paths():
    """
    Browse server directories.

    Query param: ``path`` — the directory to list. Defaults to the
    user's home directory.
    """
    target = request.args.get("path", os.path.expanduser("~"))
    target_path = Path(target)

    if not target_path.is_dir():
        return jsonify(success=False, message="Path is not a valid directory."), 400

    entries: list[dict] = []
    try:
        for entry in sorted(target_path.iterdir()):
            try:
                entries.append(
                    {
                        "name": entry.name,
                        "path": str(entry),
                        "is_dir": entry.is_dir(),
                        "size": entry.stat().st_size if entry.is_file() else None,
                    }
                )
            except PermissionError:
                continue
    except PermissionError:
        return jsonify(success=False, message="Permission denied."), 403

    return jsonify(
        success=True,
        data={
            "current_path": str(target_path.resolve()),
            "parent": str(target_path.parent),
            "entries": entries,
        },
        message="Directory listing.",
    )


@settings_bp.route("/paths/validate", methods=["POST"])
@jwt_required()
def validate_path():
    """
    Validate that a path exists and is writable.

    Expects JSON: ``{"path": "…"}``
    """
    data = request.get_json(silent=True) or {}
    path_str = data.get("path", "").strip()

    if not path_str:
        return jsonify(success=False, message="Path is required."), 400

    target = Path(path_str)

    result = {
        "path": path_str,
        "exists": target.exists(),
        "is_directory": target.is_dir(),
        "writable": os.access(path_str, os.W_OK) if target.exists() else False,
    }

    valid = result["exists"] and result["is_directory"] and result["writable"]
    return jsonify(
        success=valid,
        data=result,
        message="Path is valid." if valid else "Path is invalid or not writable.",
    )
