"""
Log routes — paginated listing, clearing, and real-time streaming.
"""

from __future__ import annotations

from datetime import datetime

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from flask_socketio import emit, join_room

from app.extensions import db, socketio
from app.models.log import LEVEL_DEBUG, LEVEL_ERROR, LEVEL_INFO, LEVEL_WARNING, Log
from app.utils.jwt_helpers import admin_required

logs_bp = Blueprint("logs", __name__, url_prefix="/api/logs")


@logs_bp.route("", methods=["GET"])
@jwt_required()
def list_logs():
    """
    Return paginated log entries.

    Query params: ``page``, ``per_page``, ``level``, ``source``,
    ``start_date``, ``end_date``, ``search``.
    """
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 50, type=int)
    per_page = min(per_page, 200)

    query = Log.query

    # Filters
    level = request.args.get("level")
    if level and level.upper() in (LEVEL_DEBUG, LEVEL_INFO, LEVEL_WARNING, LEVEL_ERROR):
        query = query.filter_by(level=level.upper())

    source = request.args.get("source")
    if source:
        query = query.filter_by(source=source)

    start_date = request.args.get("start_date")
    if start_date:
        try:
            dt = datetime.fromisoformat(start_date)
            query = query.filter(Log.created_at >= dt)
        except ValueError:
            pass

    end_date = request.args.get("end_date")
    if end_date:
        try:
            dt = datetime.fromisoformat(end_date)
            query = query.filter(Log.created_at <= dt)
        except ValueError:
            pass

    search = request.args.get("search")
    if search:
        query = query.filter(Log.message.ilike(f"%{search}%"))

    query = query.order_by(Log.created_at.desc())
    paginated = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify(
        success=True,
        data=[entry.to_dict() for entry in paginated.items],
        message="Logs retrieved.",
        meta={
            "page": paginated.page,
            "per_page": paginated.per_page,
            "total": paginated.total,
            "pages": paginated.pages,
        },
    )


@logs_bp.route("", methods=["DELETE"])
@admin_required
def clear_logs():
    """Delete all log entries (admin only)."""
    count = Log.query.delete()
    db.session.commit()
    return jsonify(
        success=True,
        data={"deleted": count},
        message=f"Cleared {count} log entries.",
    )


# ── WebSocket for real-time log streaming ───────────────────────────

@socketio.on("connect_logs")
def handle_connect_logs():
    """Allow a client to join the ``logs`` room for real-time updates."""
    join_room("logs")
    emit("log_connected", {"message": "Connected to real-time logs."})
