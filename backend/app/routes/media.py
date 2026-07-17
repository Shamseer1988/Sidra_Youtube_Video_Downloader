"""
Media routes — browse, list, stream, and thumbnail generation for
downloaded or Synology-hosted media files.
"""

from __future__ import annotations

import mimetypes
import os
import re
from pathlib import Path

from flask import (
    Blueprint,
    Response,
    abort,
    current_app,
    jsonify,
    request,
    send_file,
)
from flask_jwt_extended import jwt_required

from app.utils.file_utils import (
    AUDIO_EXTENSIONS,
    VIDEO_EXTENSIONS,
    generate_thumbnail,
    get_file_info,
    scan_directory,
)

media_bp = Blueprint("media", __name__, url_prefix="/api/media")


@media_bp.route("/videos", methods=["GET"])
@jwt_required()
def list_videos():
    """
    List video files from the configured download and media paths.
    """
    paths = _collect_paths("video")
    files: list[dict] = []
    for p in paths:
        files.extend(scan_directory(p, extensions=VIDEO_EXTENSIONS))

    # Sort by modified date descending
    files.sort(key=lambda f: f.get("modified", ""), reverse=True)
    return jsonify(success=True, data=files, message="Videos listed.")


@media_bp.route("/audios", methods=["GET"])
@jwt_required()
def list_audios():
    """
    List audio files from the configured download and media paths.
    """
    paths = _collect_paths("audio")
    files: list[dict] = []
    for p in paths:
        files.extend(scan_directory(p, extensions=AUDIO_EXTENSIONS))

    files.sort(key=lambda f: f.get("modified", ""), reverse=True)
    return jsonify(success=True, data=files, message="Audio files listed.")


@media_bp.route("/stream/<path:file_path>", methods=["GET"])
@jwt_required()
def stream_media(file_path: str):
    """
    Stream a media file with HTTP range-request support so the
    browser can seek.
    """
    # Security: resolve and verify the path is inside an allowed directory
    abs_path = _resolve_and_verify(file_path)
    if abs_path is None:
        abort(404)

    file_size = abs_path.stat().st_size
    content_type = mimetypes.guess_type(str(abs_path))[0] or "application/octet-stream"

    range_header = request.headers.get("Range")

    if range_header:
        # Parse "bytes=start-end"
        match = re.match(r"bytes=(\d+)-(\d*)", range_header)
        if not match:
            abort(416)

        start = int(match.group(1))
        end = int(match.group(2)) if match.group(2) else file_size - 1
        end = min(end, file_size - 1)

        if start > end or start >= file_size:
            abort(416)

        length = end - start + 1

        def _generate():
            with open(abs_path, "rb") as f:
                f.seek(start)
                remaining = length
                while remaining > 0:
                    chunk_size = min(8192, remaining)
                    data = f.read(chunk_size)
                    if not data:
                        break
                    remaining -= len(data)
                    yield data

        return Response(
            _generate(),
            status=206,
            mimetype=content_type,
            headers={
                "Content-Range": f"bytes {start}-{end}/{file_size}",
                "Accept-Ranges": "bytes",
                "Content-Length": str(length),
            },
        )

    # Full file
    return send_file(str(abs_path), mimetype=content_type)


@media_bp.route("/thumbnail/<path:file_path>", methods=["GET"])
@jwt_required()
def get_thumbnail(file_path: str):
    """
    Return a thumbnail for the given video file. Generates one
    on-the-fly if it doesn't exist yet.
    """
    abs_path = _resolve_and_verify(file_path)
    if abs_path is None:
        abort(404)

    thumb_path = abs_path.parent / f"{abs_path.stem}_thumb.jpg"

    if not thumb_path.is_file():
        result = generate_thumbnail(str(abs_path), str(thumb_path))
        if result is None:
            abort(500)

    return send_file(str(thumb_path), mimetype="image/jpeg")


@media_bp.route("/browse", methods=["GET"])
@jwt_required()
def browse_directory():
    """
    Browse a directory and return its contents.

    Query param: ``path``.
    """
    target = request.args.get("path", "")
    if not target:
        return jsonify(success=False, message="Path is required."), 400

    target_path = Path(target)
    if not target_path.is_dir():
        return jsonify(success=False, message="Invalid directory."), 400

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
                        "extension": entry.suffix.lower() if entry.is_file() else None,
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
        message="Directory contents.",
    )


# ── Helpers ─────────────────────────────────────────────────────────

def _collect_paths(kind: str) -> list[str]:
    """Gather all configured paths for *kind* (``video`` or ``audio``)."""
    paths: list[str] = []
    if kind == "video":
        for key in ("DOWNLOAD_VIDEO_PATH", "MEDIA_VIDEO_PATH"):
            val = current_app.config.get(key, "")
            if val and Path(val).is_dir():
                paths.append(val)
    else:
        for key in ("DOWNLOAD_AUDIO_PATH", "MEDIA_AUDIO_PATH"):
            val = current_app.config.get(key, "")
            if val and Path(val).is_dir():
                paths.append(val)
    return paths


def _resolve_and_verify(file_path: str) -> Path | None:
    """
    Resolve *file_path* and verify it lives inside one of the
    allowed media / download directories.  Returns ``None`` if the
    path is invalid or outside allowed dirs.
    """
    try:
        candidate = Path(file_path).resolve()
    except (ValueError, OSError):
        return None

    if not candidate.is_file():
        return None

    allowed_keys = (
        "DOWNLOAD_VIDEO_PATH",
        "DOWNLOAD_AUDIO_PATH",
        "MEDIA_VIDEO_PATH",
        "MEDIA_AUDIO_PATH",
    )
    for key in allowed_keys:
        allowed = current_app.config.get(key, "")
        if allowed and str(candidate).startswith(str(Path(allowed).resolve())):
            return candidate

    return None
