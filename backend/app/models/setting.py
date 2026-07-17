"""
Setting model — key/value application settings, per-user or global.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy.dialects.postgresql import JSON, UUID

from app.extensions import db

# Sensible defaults that every new user starts with
DEFAULT_SETTINGS: dict[str, Any] = {
    "download_video_path": "",
    "download_audio_path": "",
    "default_video_format": "best",
    "default_audio_format": "bestaudio",
    "max_concurrent_downloads": 3,
    "auto_generate_thumbnail": True,
    "theme": "dark",
    "language": "en",
    "notifications_enabled": True,
    "download_subtitles": False,
    "subtitle_language": "en",
    "embed_metadata": True,
    "embed_thumbnail": True,
}


class Setting(db.Model):
    """
    Flexible key/value store for application settings.

    If ``user_id`` is ``None`` the setting is *global* (applies to
    all users).  Otherwise it is specific to the given user.
    """

    __tablename__ = "settings"
    __table_args__ = (
        db.UniqueConstraint("key", "user_id", name="uq_setting_key_user"),
    )

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    key = db.Column(db.String(128), nullable=False, index=True)
    value = db.Column(JSON, nullable=True)
    user_id = db.Column(
        UUID(as_uuid=True),
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    created_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # ── Class helpers ───────────────────────────────────────────────
    @classmethod
    def get(cls, key: str, user_id: Optional[uuid.UUID] = None) -> Any:
        """
        Retrieve a setting value.  Falls back to the global setting,
        then to ``DEFAULT_SETTINGS``.
        """
        # User-specific first
        if user_id is not None:
            row = cls.query.filter_by(key=key, user_id=user_id).first()
            if row is not None:
                return row.value

        # Global fallback
        row = cls.query.filter_by(key=key, user_id=None).first()
        if row is not None:
            return row.value

        return DEFAULT_SETTINGS.get(key)

    @classmethod
    def set(cls, key: str, value: Any, user_id: Optional[uuid.UUID] = None) -> "Setting":
        """Create or update a setting."""
        row = cls.query.filter_by(key=key, user_id=user_id).first()
        if row is None:
            row = cls(key=key, value=value, user_id=user_id)
            db.session.add(row)
        else:
            row.value = value
        db.session.commit()
        return row

    @classmethod
    def get_all_for_user(cls, user_id: uuid.UUID) -> dict[str, Any]:
        """
        Return the full settings dict for a user, merging defaults →
        global overrides → user overrides.
        """
        merged = dict(DEFAULT_SETTINGS)

        # Global overrides
        for row in cls.query.filter_by(user_id=None).all():
            merged[row.key] = row.value

        # User overrides
        for row in cls.query.filter_by(user_id=user_id).all():
            merged[row.key] = row.value

        return merged

    def to_dict(self) -> dict:
        return {
            "id": str(self.id),
            "key": self.key,
            "value": self.value,
            "user_id": str(self.user_id) if self.user_id else None,
        }

    def __repr__(self) -> str:
        return f"<Setting {self.key!r}>"
