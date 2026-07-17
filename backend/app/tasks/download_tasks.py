"""
Celery download tasks — background workers that execute yt-dlp
downloads and broadcast progress via SocketIO.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from celery import shared_task
from celery.utils.log import get_task_logger

celery_logger = get_task_logger(__name__)


@shared_task(bind=True, name="tasks.download_video", max_retries=2)
def download_video(self, download_id: str) -> dict:
    """
    Download a single video/audio and update the database record
    as progress is made.

    Emits SocketIO events so the frontend can display live progress.
    """
    from app import create_app
    from app.extensions import db, socketio
    from app.models.download import (
        Download,
        STATUS_COMPLETED,
        STATUS_DOWNLOADING,
        STATUS_FAILED,
        MEDIA_AUDIO,
    )
    from app.services.downloader import download as run_download
    from app.utils.logger import logger

    app = create_app()

    with app.app_context():
        dl: Download | None = db.session.get(Download, download_id)
        if dl is None:
            celery_logger.error("Download record %s not found", download_id)
            return {"error": "Download not found"}

        # Mark as downloading
        dl.status = STATUS_DOWNLOADING
        dl.progress = 0.0
        db.session.commit()

        socketio.emit(
            "download_progress",
            {"id": download_id, "status": "downloading", "progress": 0},
            room="downloads",
            namespace="/",
        )

        # Determine output path
        if dl.media_type == MEDIA_AUDIO:
            output_path = app.config.get("DOWNLOAD_AUDIO_PATH", "/tmp/audio")
        else:
            output_path = app.config.get("DOWNLOAD_VIDEO_PATH", "/tmp/video")

        def _on_progress(percent: float, speed: str, eta: str) -> None:
            """Callback invoked by the downloader on each progress tick."""
            try:
                dl.progress = percent
                dl.speed = speed
                dl.eta = eta
                db.session.commit()

                socketio.emit(
                    "download_progress",
                    {
                        "id": download_id,
                        "status": "downloading",
                        "progress": percent,
                        "speed": speed,
                        "eta": eta,
                    },
                    room="downloads",
                    namespace="/",
                )
            except Exception:
                pass  # never crash the download because of a progress update

        try:
            result = run_download(
                url=dl.url,
                format_id=dl.format_id,
                output_path=output_path,
                media_type=dl.media_type,
                progress_callback=_on_progress,
            )

            dl.status = STATUS_COMPLETED
            dl.progress = 100.0
            dl.file_path = result.get("file_path")
            dl.file_size = result.get("file_size")
            dl.title = result.get("title") or dl.title
            dl.completed_at = datetime.now(timezone.utc)
            dl.speed = None
            dl.eta = None
            db.session.commit()

            socketio.emit(
                "download_progress",
                {
                    "id": download_id,
                    "status": "completed",
                    "progress": 100,
                    "file_path": dl.file_path,
                },
                room="downloads",
                namespace="/",
            )

            logger.info(
                f"Download completed: {dl.title}",
                source="celery",
                download_id=dl.id,
                user_id=dl.user_id,
            )

            return {"status": "completed", "file_path": dl.file_path}

        except Exception as exc:
            dl.status = STATUS_FAILED
            dl.error_message = str(exc)[:2000]
            db.session.commit()

            socketio.emit(
                "download_progress",
                {
                    "id": download_id,
                    "status": "failed",
                    "error": str(exc)[:500],
                },
                room="downloads",
                namespace="/",
            )

            logger.error(
                f"Download failed: {exc}",
                source="celery",
                download_id=dl.id,
                user_id=dl.user_id,
            )

            # Retry with exponential backoff
            raise self.retry(exc=exc, countdown=30 * (self.request.retries + 1))


@shared_task(bind=True, name="tasks.download_playlist")
def download_playlist(self, download_id: str, entries: list[dict]) -> dict:
    """
    Download each entry in a playlist, creating individual Download
    records and tracking overall progress.
    """
    from app import create_app
    from app.extensions import db, socketio
    from app.models.download import Download, STATUS_PENDING, MEDIA_VIDEO
    from app.services.downloader import get_platform

    app = create_app()

    with app.app_context():
        parent: Download | None = db.session.get(Download, download_id)
        if parent is None:
            return {"error": "Parent download not found"}

        playlist_uuid = parent.id
        total = len(entries)

        for idx, entry in enumerate(entries, start=1):
            entry_url = entry.get("url")
            if not entry_url:
                continue

            child = Download(
                user_id=parent.user_id,
                url=entry_url,
                title=entry.get("title", f"Track {idx}"),
                thumbnail_url=entry.get("thumbnail"),
                duration=entry.get("duration"),
                platform=get_platform(entry_url),
                media_type=parent.media_type or MEDIA_VIDEO,
                format_id=parent.format_id,
                quality=parent.quality,
                playlist_id=playlist_uuid,
                status=STATUS_PENDING,
            )
            db.session.add(child)
            db.session.commit()

            # Queue individual download
            download_video.delay(str(child.id))

            # Emit overall playlist progress
            socketio.emit(
                "playlist_progress",
                {
                    "playlist_id": str(playlist_uuid),
                    "queued": idx,
                    "total": total,
                },
                room="downloads",
                namespace="/",
            )

        return {"status": "all_queued", "total": total}


@shared_task(name="tasks.extract_info_task")
def extract_info_task(url: str) -> dict:
    """Async info extraction — useful for large playlists."""
    from app import create_app
    from app.services.downloader import extract_info

    app = create_app()
    with app.app_context():
        return extract_info(url)
