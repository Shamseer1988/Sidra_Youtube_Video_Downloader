"""
Input validators and sanitisation helpers.
"""

from __future__ import annotations

import re
from urllib.parse import urlparse


def validate_url(url: str) -> bool:
    """
    Return ``True`` if *url* looks like a valid HTTP(S) URL.

    Does not guarantee the URL is reachable — only that it passes a
    basic structural check.
    """
    if not url or not isinstance(url, str):
        return False
    try:
        result = urlparse(url.strip())
        return result.scheme in ("http", "https") and bool(result.netloc)
    except Exception:
        return False


def validate_format(format_id: str, available_formats: list[dict]) -> bool:
    """
    Return ``True`` if *format_id* appears in the *available_formats*
    list (each entry is expected to have a ``"format_id"`` key).
    """
    if not format_id:
        return False
    return any(f.get("format_id") == format_id for f in available_formats)


def sanitize_filename(title: str, max_length: int = 200) -> str:
    """
    Clean *title* so it is safe to use as a filesystem name.

    * Strips/replaces characters forbidden by Windows and POSIX.
    * Collapses whitespace.
    * Truncates to *max_length* characters.
    """
    if not title:
        return "untitled"

    # Remove characters that are unsafe on Windows / Unix
    cleaned = re.sub(r'[<>:"/\\|?*\x00-\x1f]', "", title)
    # Collapse whitespace
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    # Remove leading/trailing dots (hidden files on Unix, reserved on Windows)
    cleaned = cleaned.strip(".")

    if not cleaned:
        return "untitled"

    return cleaned[:max_length]
