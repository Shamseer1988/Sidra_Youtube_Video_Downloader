"""
Database-backed logger that also writes to the console.

Usage::

    from app.utils.logger import logger

    logger.info("Download started", source="downloader", user_id=uid)
"""

from __future__ import annotations

import logging
import uuid
from typing import Any, Optional

# Standard Python console logger
_console = logging.getLogger("sidra")
_handler = logging.StreamHandler()
_handler.setFormatter(
    logging.Formatter("[%(asctime)s] %(levelname)-8s %(name)s: %(message)s")
)
if not _console.handlers:
    _console.addHandler(_handler)
    _console.setLevel(logging.DEBUG)


class DatabaseLogger:
    """
    Dual-output logger that writes structured entries to both the
    console and the ``Log`` database model.

    The database write is wrapped in a try/except so logging never
    takes down the request even when the DB is unreachable.
    """

    def _log(
        self,
        level: str,
        message: str,
        source: str = "app",
        details: Optional[dict[str, Any]] = None,
        user_id: Optional[uuid.UUID] = None,
        download_id: Optional[uuid.UUID] = None,
    ) -> None:
        # Console
        getattr(_console, level.lower(), _console.info)(
            f"[{source}] {message}"
        )

        # Database
        try:
            from app.models.log import Log  # deferred import

            Log.add(
                level=level.upper(),
                message=message,
                source=source,
                details=details,
                user_id=user_id,
                download_id=download_id,
            )
        except Exception as exc:
            _console.warning("Failed to write log to database: %s", exc)

    # ── Convenience methods ─────────────────────────────────────────
    def debug(self, message: str, **kwargs: Any) -> None:
        """Log a DEBUG-level message."""
        self._log("DEBUG", message, **kwargs)

    def info(self, message: str, **kwargs: Any) -> None:
        """Log an INFO-level message."""
        self._log("INFO", message, **kwargs)

    def warning(self, message: str, **kwargs: Any) -> None:
        """Log a WARNING-level message."""
        self._log("WARNING", message, **kwargs)

    def error(self, message: str, **kwargs: Any) -> None:
        """Log an ERROR-level message."""
        self._log("ERROR", message, **kwargs)


# Module-level singleton
logger = DatabaseLogger()
