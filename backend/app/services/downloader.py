"""
yt-dlp wrapper service — video info extraction, download execution,
and platform detection.
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import Any, Callable, Optional

import yt_dlp

from app.utils.logger import logger
from app.utils.validators import sanitize_filename


# ── Platform detection ──────────────────────────────────────────────

_PLATFORM_PATTERNS: list[tuple[str, re.Pattern]] = [
    ("youtube", re.compile(r"(youtube\.com|youtu\.be)", re.I)),
    ("vimeo", re.compile(r"vimeo\.com", re.I)),
    ("instagram", re.compile(r"instagram\.com", re.I)),
    ("facebook", re.compile(r"(facebook\.com|fb\.watch)", re.I)),
    ("twitter", re.compile(r"(twitter\.com|x\.com)", re.I)),
]


def get_platform(url: str) -> str:
    """Detect the hosting platform from *url*. Defaults to ``'other'``."""
    for name, pattern in _PLATFORM_PATTERNS:
        if pattern.search(url):
            return name
    return "other"


# ── Info extraction ─────────────────────────────────────────────────

def extract_info(url: str) -> dict[str, Any]:
    """
    Extract metadata and available formats for a single video URL.

    Returns a structured dict with keys:
    ``title``, ``thumbnail``, ``description``, ``duration``,
    ``formats`` (list), ``platform``, ``webpage_url``.
    """
    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "ignoreerrors": False,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            raw = ydl.extract_info(url, download=False)

        if raw is None:
            raise ValueError("yt-dlp returned no data for this URL.")

        formats = _parse_formats(raw.get("formats") or [])

        return {
            "title": raw.get("title", "Untitled"),
            "thumbnail": raw.get("thumbnail"),
            "description": raw.get("description"),
            "duration": raw.get("duration"),
            "webpage_url": raw.get("webpage_url", url),
            "platform": get_platform(url),
            "uploader": raw.get("uploader"),
            "upload_date": raw.get("upload_date"),
            "view_count": raw.get("view_count"),
            "formats": formats,
        }
    except Exception as exc:
        logger.error(f"extract_info failed for {url}: {exc}", source="downloader")
        raise


def extract_playlist(url: str) -> dict[str, Any]:
    """
    Extract playlist metadata using flat extraction (no per-video download).

    Returns ``title``, ``count``, ``entries`` (list of dicts with
    ``id``, ``title``, ``url``, ``duration``).
    """
    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "extract_flat": True,
        "ignoreerrors": True,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            raw = ydl.extract_info(url, download=False)

        if raw is None:
            raise ValueError("yt-dlp returned no data for this URL.")

        entries_raw = raw.get("entries") or []
        entries = []
        for entry in entries_raw:
            if entry is None:
                continue
            entries.append(
                {
                    "id": entry.get("id"),
                    "title": entry.get("title", "Untitled"),
                    "url": entry.get("url") or entry.get("webpage_url"),
                    "duration": entry.get("duration"),
                    "thumbnail": entry.get("thumbnail"),
                }
            )

        return {
            "title": raw.get("title", "Untitled Playlist"),
            "count": len(entries),
            "entries": entries,
            "platform": get_platform(url),
        }
    except Exception as exc:
        logger.error(f"extract_playlist failed for {url}: {exc}", source="downloader")
        raise


# ── Download execution ──────────────────────────────────────────────

def download(
    url: str,
    format_id: str | None,
    output_path: str,
    media_type: str = "video",
    progress_callback: Optional[Callable[[float, str, str], None]] = None,
) -> dict[str, Any]:
    """
    Download a single video/audio and return a result dict.

    Parameters
    ----------
    url : str
        The page URL to download from.
    format_id : str | None
        yt-dlp format selector.  ``None`` falls back to ``"best"``
        for video or ``"bestaudio/best"`` for audio.
    output_path : str
        Directory to write the file into.
    media_type : str
        ``"video"`` or ``"audio"``.
    progress_callback : callable, optional
        Called with ``(percent, speed_str, eta_str)`` on each progress
        event.

    Returns
    -------
    dict with ``file_path``, ``file_size``, ``title``.
    """
    Path(output_path).mkdir(parents=True, exist_ok=True)

    outtmpl = str(Path(output_path) / "%(title)s.%(ext)s")

    if format_id:
        fmt = format_id
    elif media_type == "audio":
        fmt = "bestaudio/best"
    else:
        fmt = "bestvideo+bestaudio/best"

    ydl_opts: dict[str, Any] = {
        "format": fmt,
        "outtmpl": outtmpl,
        "quiet": True,
        "no_warnings": True,
        "ignoreerrors": False,
        "noprogress": True,
        "merge_output_format": "mp4" if media_type == "video" else None,
    }

    if media_type == "audio":
        ydl_opts["postprocessors"] = [
            {
                "key": "FFmpegExtractAudio",
                "preferredcodec": "mp3",
                "preferredquality": "192",
            }
        ]

    # Remove None values
    ydl_opts = {k: v for k, v in ydl_opts.items() if v is not None}

    result_info: dict[str, Any] = {}

    def _progress_hook(d: dict) -> None:
        if d["status"] == "downloading":
            total = d.get("total_bytes") or d.get("total_bytes_estimate") or 0
            downloaded = d.get("downloaded_bytes", 0)
            percent = (downloaded / total * 100) if total else 0.0
            speed = d.get("_speed_str", "N/A")
            eta = d.get("_eta_str", "N/A")
            if progress_callback:
                progress_callback(round(percent, 2), speed, eta)

        elif d["status"] == "finished":
            result_info["file_path"] = d.get("filename")
            result_info["file_size"] = d.get("total_bytes") or d.get(
                "downloaded_bytes", 0
            )

    ydl_opts["progress_hooks"] = [_progress_hook]

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            if info:
                result_info.setdefault("title", info.get("title", "Untitled"))
                # After postprocessing the filename may have changed
                if "file_path" not in result_info:
                    result_info["file_path"] = ydl.prepare_filename(info)

        # For audio, the extension changes after postprocessing
        if media_type == "audio" and result_info.get("file_path"):
            fp = Path(result_info["file_path"])
            mp3_path = fp.with_suffix(".mp3")
            if mp3_path.is_file():
                result_info["file_path"] = str(mp3_path)

        # Ensure file_size is set
        if result_info.get("file_path") and Path(result_info["file_path"]).is_file():
            result_info["file_size"] = Path(result_info["file_path"]).stat().st_size

        logger.info(
            f"Download complete: {result_info.get('title')}",
            source="downloader",
        )
        return result_info

    except Exception as exc:
        logger.error(f"Download failed for {url}: {exc}", source="downloader")
        raise


# ── Private helpers ─────────────────────────────────────────────────

def _parse_formats(raw_formats: list[dict]) -> list[dict[str, Any]]:
    """Normalise the formats list from yt-dlp into a cleaner structure."""
    parsed: list[dict[str, Any]] = []
    for f in raw_formats:
        # Skip storyboard / manifest-only formats
        if f.get("vcodec") == "none" and f.get("acodec") == "none":
            continue

        parsed.append(
            {
                "format_id": f.get("format_id"),
                "ext": f.get("ext"),
                "resolution": f.get("resolution") or _build_resolution(f),
                "filesize": f.get("filesize") or f.get("filesize_approx"),
                "vcodec": f.get("vcodec"),
                "acodec": f.get("acodec"),
                "fps": f.get("fps"),
                "tbr": f.get("tbr"),
                "format_note": f.get("format_note"),
            }
        )
    return parsed


def _build_resolution(f: dict) -> str | None:
    w = f.get("width")
    h = f.get("height")
    if w and h:
        return f"{w}x{h}"
    return None
