"""
User model — accounts, authentication, and authorisation.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

import bcrypt
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID

from app.extensions import db

ROLE_ADMIN = "admin"
ROLE_USER = "user"


class User(db.Model):
    """Application user with hashed-password authentication."""

    __tablename__ = "users"

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(
        SAEnum(ROLE_ADMIN, ROLE_USER, name="user_role"),
        nullable=False,
        default=ROLE_USER,
    )
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    avatar_url = db.Column(db.String(512), nullable=True)
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

    # ── Relationships ───────────────────────────────────────────────
    downloads = db.relationship(
        "Download", backref="user", lazy="dynamic", cascade="all, delete-orphan"
    )
    settings = db.relationship(
        "Setting", backref="user", lazy="dynamic", cascade="all, delete-orphan"
    )

    # ── Password helpers ────────────────────────────────────────────
    def set_password(self, plain_password: str) -> None:
        """Hash *plain_password* with bcrypt and store the result."""
        self.password_hash = bcrypt.hashpw(
            plain_password.encode("utf-8"), bcrypt.gensalt()
        ).decode("utf-8")

    def check_password(self, plain_password: str) -> bool:
        """Return ``True`` if *plain_password* matches the stored hash."""
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            self.password_hash.encode("utf-8"),
        )

    # ── Serialisation ───────────────────────────────────────────────
    def to_dict(self) -> dict:
        """Return a JSON-safe dictionary representation (no password)."""
        return {
            "id": str(self.id),
            "username": self.username,
            "email": self.email,
            "role": self.role,
            "is_active": self.is_active,
            "avatar_url": self.avatar_url,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self) -> str:
        return f"<User {self.username!r}>"
