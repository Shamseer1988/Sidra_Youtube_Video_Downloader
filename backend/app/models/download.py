"""
Download model — tracks every download job submitted by a user.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import JSON, UUID

from app.extensions import db

# Status constants
STATUS_PENDING = "pending"
STATUS_DOWNLOADING = "downloading"
STATUS_COMPLETED = "completed"
STATUS_FAILED = "failed"
STATUS_CANCELLED = "cancelled"

# Media-type constants
MEDIA_VIDEO = "video"
MEDIA_AUDIO = "audio"

# Platform constants
PLATFORM_YOUTUBE = "youtube"
PLATFORM_VIMEO = "vimeo"
PLATFORM_INSTAGRAM = "instagram"
PLATFORM_FACEBOOK = "facebook"
PLATFORM_TWITTER = "twitter"
PLATFORM_OTHER = "other"


class Download(db.Model):
    """Represents a single download job (video or audio)."""

    __tablename__ = "downloads"

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = db.Column(
        UUID(as_uuid=True), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    url = db.Column(db.Text, nullable=False)
    title = db.Column(db.String(512), nullable=True)
    thumbnail_url = db.Column(db.Text, nullable=True)
    description = db.Column(db.Text, nullable=True)

    status = db.Column(
        SAEnum(
            STATUS_PENDING,
            STATUS_DOWNLOADING,
            STATUS_COMPLETED,
            STATUS_FAILED,
            STATUS_CANCELLED,
            name="download_status",
        ),
        nullable=False,
        default=STATUS_PENDING,
        index=True,
    )

    progress = db.Column(db.Float, default=0.0, nullable=False)
    speed = db.Column(db.String(64), nullable=True)
    eta = db.Column(db.String(64), nullable=True)

    format_id = db.Column(db.String(64), nullable=True)
    quality = db.Column(db.String(64), nullable=True)
    resolution = db.Column(db.String(32), nullable=True)

    file_path = db.Column(db.Text, nullable=True)
    file_size = db.Column(db.BigInteger, nullable=True)
    duration = db.Column(db.Float, nullable=True)

    platform = db.Column(
        db.String(32), nullable=False, default=PLATFORM_OTHER, index=True
    )

    media_type = db.Column(
        SAEnum(MEDIA_VIDEO, MEDIA_AUDIO, name="media_type"),
        nullable=False,
        default=MEDIA_VIDEO,
        index=True,
    )

    playlist_id = db.Column(UUID(as_uuid=True), nullable=True, index=True)

    error_message = db.Column(db.Text, nullable=True)
    celery_task_id = db.Column(db.String(256), nullable=True, index=True)

    created_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )
    completed_at = db.Column(db.DateTime(timezone=True), nullable=True)

    # ── Serialisation ───────────────────────────────────────────────
    def to_dict(self) -> dict:
        """Return a JSON-safe dictionary representation."""
        return {
            "id": str(self.id),
            "user_id": str(self.user_id),
            "url": self.url,
            "title": self.title,
            "thumbnail_url": self.thumbnail_url,
            "description": self.description,
            "status": self.status,
            "progress": self.progress,
            "speed": self.speed,
            "eta": self.eta,
            "format_id": self.format_id,
            "quality": self.quality,
            "resolution": self.resolution,
            "file_path": self.file_path,
            "file_size": self.file_size,
            "duration": self.duration,
            "platform": self.platform,
            "media_type": self.media_type,
            "playlist_id": str(self.playlist_id) if self.playlist_id else None,
            "error_message": self.error_message,
            "celery_task_id": self.celery_task_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }

    def __repr__(self) -> str:
        return f"<Download {self.id!s} [{self.status}]>"
