"""
Log model — structured application log entries stored in the database.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import JSON, UUID

from app.extensions import db

LEVEL_DEBUG = "DEBUG"
LEVEL_INFO = "INFO"
LEVEL_WARNING = "WARNING"
LEVEL_ERROR = "ERROR"


class Log(db.Model):
    """Persistent, queryable application log entry."""

    __tablename__ = "logs"

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    level = db.Column(
        SAEnum(LEVEL_DEBUG, LEVEL_INFO, LEVEL_WARNING, LEVEL_ERROR, name="log_level"),
        nullable=False,
        default=LEVEL_INFO,
        index=True,
    )
    message = db.Column(db.Text, nullable=False)
    source = db.Column(db.String(128), nullable=True, index=True)
    details = db.Column(JSON, nullable=True)
    user_id = db.Column(
        UUID(as_uuid=True),
        db.ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    download_id = db.Column(
        UUID(as_uuid=True),
        db.ForeignKey("downloads.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    created_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )

    # ── Serialisation ───────────────────────────────────────────────
    def to_dict(self) -> dict:
        return {
            "id": str(self.id),
            "level": self.level,
            "message": self.message,
            "source": self.source,
            "details": self.details,
            "user_id": str(self.user_id) if self.user_id else None,
            "download_id": str(self.download_id) if self.download_id else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    # ── Factory ─────────────────────────────────────────────────────
    @classmethod
    def add(
        cls,
        level: str,
        message: str,
        source: str = "app",
        details: Optional[dict[str, Any]] = None,
        user_id: Optional[uuid.UUID] = None,
        download_id: Optional[uuid.UUID] = None,
    ) -> "Log":
        """Create and persist a new log entry."""
        entry = cls(
            level=level,
            message=message,
            source=source,
            details=details,
            user_id=user_id,
            download_id=download_id,
        )
        db.session.add(entry)
        db.session.commit()
        return entry

    def __repr__(self) -> str:
        return f"<Log [{self.level}] {self.message[:40]!r}>"
