"""
Download routes — submit, list, get, cancel, and info extraction.
"""

from __future__ import annotations

import uuid

from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.extensions import db
from app.models.download import (
    Download,
    MEDIA_AUDIO,
    MEDIA_VIDEO,
    STATUS_CANCELLED,
    STATUS_PENDING,
)
from app.services.downloader import extract_info, extract_playlist, get_platform
from app.utils.logger import logger
from app.utils.validators import validate_url

downloads_bp = Blueprint("downloads", __name__, url_prefix="/api/downloads")


@downloads_bp.route("", methods=["POST"])
@jwt_required()
def submit_download():
    """
    Submit a new download job.

    Expects JSON: ``{"url", "format_id"?, "media_type"?, "quality"?}``
    """
    data = request.get_json(silent=True) or {}
    url = data.get("url", "").strip()
    format_id = data.get("format_id")
    media_type = data.get("media_type", MEDIA_VIDEO)
    quality = data.get("quality")

    if not validate_url(url):
        return jsonify(success=False, message="Invalid URL."), 400

    if media_type not in (MEDIA_VIDEO, MEDIA_AUDIO):
        media_type = MEDIA_VIDEO

    user_id = get_jwt_identity()

    # Quick info extraction to populate title / thumbnail
    try:
        info = extract_info(url)
    except Exception as exc:
        logger.error(f"Info extraction failed: {exc}", source="downloads")
        info = {}

    platform = get_platform(url)

    download_record = Download(
        user_id=user_id,
        url=url,
        title=info.get("title", "Untitled"),
        thumbnail_url=info.get("thumbnail"),
        description=info.get("description"),
        duration=info.get("duration"),
        format_id=format_id,
        quality=quality,
        platform=platform,
        media_type=media_type,
        status=STATUS_PENDING,
    )
    db.session.add(download_record)
    db.session.commit()

    # Queue Celery task
    try:
        from app.tasks.download_tasks import download_video

        task = download_video.delay(str(download_record.id))
        download_record.celery_task_id = task.id
        db.session.commit()
    except Exception as exc:
        logger.error(f"Failed to queue Celery task: {exc}", source="downloads")

    logger.info(
        f"Download submitted: {download_record.title}",
        source="downloads",
        user_id=uuid.UUID(user_id),
        download_id=download_record.id,
    )

    return (
        jsonify(
            success=True,
            data=download_record.to_dict(),
            message="Download queued.",
        ),
        201,
    )


@downloads_bp.route("", methods=["GET"])
@jwt_required()
def list_downloads():
    """
    List downloads for the current user with pagination and filters.

    Query params: ``page``, ``per_page``, ``status``, ``platform``,
    ``media_type``, ``sort`` (``created_at`` desc by default).
    """
    user_id = get_jwt_identity()
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    per_page = min(per_page, 100)

    query = Download.query.filter_by(user_id=user_id)

    # Filters
    status = request.args.get("status")
    if status:
        query = query.filter_by(status=status)

    platform = request.args.get("platform")
    if platform:
        query = query.filter_by(platform=platform)

    media_type = request.args.get("media_type")
    if media_type:
        query = query.filter_by(media_type=media_type)

    # Sorting
    sort_dir = request.args.get("sort", "desc")
    if sort_dir == "asc":
        query = query.order_by(Download.created_at.asc())
    else:
        query = query.order_by(Download.created_at.desc())

    paginated = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify(
        success=True,
        data=[d.to_dict() for d in paginated.items],
        message="Downloads retrieved.",
        meta={
            "page": paginated.page,
            "per_page": paginated.per_page,
            "total": paginated.total,
            "pages": paginated.pages,
        },
    )


@downloads_bp.route("/<download_id>", methods=["GET"])
@jwt_required()
def get_download(download_id: str):
    """Retrieve a single download by ID."""
    user_id = get_jwt_identity()
    dl = Download.query.filter_by(id=download_id, user_id=user_id).first()
    if dl is None:
        return jsonify(success=False, message="Download not found."), 404
    return jsonify(success=True, data=dl.to_dict(), message="Download retrieved.")


@downloads_bp.route("/<download_id>", methods=["DELETE"])
@jwt_required()
def delete_download(download_id: str):
    """Cancel or delete a download."""
    user_id = get_jwt_identity()
    dl = Download.query.filter_by(id=download_id, user_id=user_id).first()
    if dl is None:
        return jsonify(success=False, message="Download not found."), 404

    # Attempt to revoke the Celery task if still running
    if dl.celery_task_id and dl.status in (STATUS_PENDING, "downloading"):
        try:
            from app.extensions import celery_app

            celery_app.control.revoke(dl.celery_task_id, terminate=True)
            dl.status = STATUS_CANCELLED
            db.session.commit()
            logger.info(
                f"Download cancelled: {dl.title}",
                source="downloads",
                download_id=dl.id,
            )
        except Exception as exc:
            logger.warning(f"Could not revoke task: {exc}", source="downloads")

    db.session.delete(dl)
    db.session.commit()

    return jsonify(success=True, data=None, message="Download deleted.")


@downloads_bp.route("/info", methods=["POST"])
@jwt_required()
def video_info():
    """
    Extract video info without downloading.

    Expects JSON: ``{"url": "…"}``
    """
    data = request.get_json(silent=True) or {}
    url = data.get("url", "").strip()

    if not validate_url(url):
        return jsonify(success=False, message="Invalid URL."), 400

    try:
        info = extract_info(url)
        return jsonify(success=True, data=info, message="Info extracted.")
    except Exception as exc:
        return jsonify(success=False, message=str(exc)), 500


@downloads_bp.route("/playlist-info", methods=["POST"])
@jwt_required()
def playlist_info():
    """
    Extract playlist info without downloading.

    Expects JSON: ``{"url": "…"}``
    """
    data = request.get_json(silent=True) or {}
    url = data.get("url", "").strip()

    if not validate_url(url):
        return jsonify(success=False, message="Invalid URL."), 400

    try:
        info = extract_playlist(url)
        return jsonify(success=True, data=info, message="Playlist info extracted.")
    except Exception as exc:
        return jsonify(success=False, message=str(exc)), 500
