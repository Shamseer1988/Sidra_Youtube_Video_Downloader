"""
File-system utilities — media scanning, metadata extraction,
and thumbnail generation.
"""

from __future__ import annotations

import json
import os
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

# Media file extensions understood by the application
VIDEO_EXTENSIONS = {
    ".mp4", ".mkv", ".webm", ".avi", ".mov", ".flv", ".wmv", ".m4v", ".ts",
}
AUDIO_EXTENSIONS = {
    ".mp3", ".m4a", ".opus", ".ogg", ".flac", ".wav", ".aac", ".wma",
}


def scan_directory(
    path: str,
    extensions: set[str] | None = None,
    recursive: bool = True,
) -> list[dict[str, Any]]:
    """
    Recursively (or flat) scan *path* for files matching *extensions*.

    Returns a list of dicts with keys: ``name``, ``path``, ``size``,
    ``modified``, ``extension``.
    """
    results: list[dict[str, Any]] = []
    target = Path(path)

    if not target.is_dir():
        return results

    pattern = "**/*" if recursive else "*"
    for entry in target.glob(pattern):
        if not entry.is_file():
            continue
        if extensions and entry.suffix.lower() not in extensions:
            continue
        try:
            stat = entry.stat()
            results.append(
                {
                    "name": entry.name,
                    "path": str(entry),
                    "size": stat.st_size,
                    "modified": datetime.fromtimestamp(
                        stat.st_mtime, tz=timezone.utc
                    ).isoformat(),
                    "extension": entry.suffix.lower(),
                }
            )
        except OSError:
            continue

    return results


def get_file_info(path: str) -> dict[str, Any] | None:
    """Return basic file metadata or ``None`` if the file doesn't exist."""
    p = Path(path)
    if not p.is_file():
        return None
    stat = p.stat()
    info: dict[str, Any] = {
        "name": p.name,
        "path": str(p),
        "size": stat.st_size,
        "modified": datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat(),
        "extension": p.suffix.lower(),
    }
    # Attempt to read duration for media files
    if p.suffix.lower() in VIDEO_EXTENSIONS | AUDIO_EXTENSIONS:
        meta = get_media_metadata(str(p))
        if meta:
            info.update(meta)
    return info


def get_media_metadata(path: str) -> dict[str, Any] | None:
    """
    Use ``ffprobe`` to extract duration, resolution, and codec
    information for a media file.

    Returns ``None`` when ffprobe is unavailable or the file is not
    a valid media file.
    """
    try:
        result = subprocess.run(
            [
                "ffprobe",
                "-v", "quiet",
                "-print_format", "json",
                "-show_format",
                "-show_streams",
                path,
            ],
            capture_output=True,
            text=True,
            timeout=30,
        )
        if result.returncode != 0:
            return None

        data = json.loads(result.stdout)
        fmt = data.get("format", {})
        streams = data.get("streams", [])

        metadata: dict[str, Any] = {
            "duration": float(fmt.get("duration", 0)),
        }

        # Pick the first video stream for resolution
        for stream in streams:
            if stream.get("codec_type") == "video":
                w = stream.get("width", 0)
                h = stream.get("height", 0)
                metadata["resolution"] = f"{w}x{h}" if w and h else None
                metadata["video_codec"] = stream.get("codec_name")
                metadata["fps"] = _parse_fps(stream.get("r_frame_rate", "0/1"))
                break

        # Pick the first audio stream for codec info
        for stream in streams:
            if stream.get("codec_type") == "audio":
                metadata["audio_codec"] = stream.get("codec_name")
                metadata["sample_rate"] = stream.get("sample_rate")
                break

        return metadata
    except (FileNotFoundError, subprocess.TimeoutExpired, json.JSONDecodeError):
        return None


def generate_thumbnail(
    video_path: str,
    output_path: Optional[str] = None,
    timestamp: str = "00:00:03",
) -> str | None:
    """
    Generate a JPEG thumbnail from *video_path* at *timestamp* using
    ``ffmpeg``.

    Returns the absolute path to the generated thumbnail, or ``None``
    on failure.
    """
    if output_path is None:
        base = Path(video_path).stem
        output_path = str(Path(video_path).parent / f"{base}_thumb.jpg")

    try:
        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-i", video_path,
                "-ss", timestamp,
                "-vframes", "1",
                "-q:v", "3",
                output_path,
            ],
            capture_output=True,
            timeout=30,
        )
        if Path(output_path).is_file():
            return output_path
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pass
    return None


def _parse_fps(r_frame_rate: str) -> float | None:
    """Parse ffprobe's ``r_frame_rate`` fraction string like ``30/1``."""
    try:
        num, den = r_frame_rate.split("/")
        return round(int(num) / int(den), 2) if int(den) else None
    except (ValueError, ZeroDivisionError):
        return None
