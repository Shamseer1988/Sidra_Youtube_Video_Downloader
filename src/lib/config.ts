import path from "node:path";
import os from "node:os";

/**
 * Central runtime configuration, derived from environment variables.
 * All media folders are resolved to absolute paths so path-safety
 * checks (see media.ts) are reliable.
 */

function abs(p: string): string {
  if (!p) return "";
  const expanded = p.startsWith("~") ? path.join(os.homedir(), p.slice(1)) : p;
  return path.resolve(expanded);
}

function list(envVal: string | undefined, fallback: string): string[] {
  const raw = (envVal ?? fallback) || "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map(abs);
}

export const config = {
  // Where the app writes new downloads
  downloadVideoPath: abs(process.env.DOWNLOAD_VIDEO_PATH || "./media/downloads/videos"),
  downloadAudioPath: abs(process.env.DOWNLOAD_AUDIO_PATH || "./media/downloads/audio"),

  // Existing libraries to browse/stream (NAS media folders)
  mediaVideoPaths: list(process.env.MEDIA_VIDEO_PATH, "./media/library/videos"),
  mediaAudioPaths: list(process.env.MEDIA_AUDIO_PATH, "./media/library/music"),

  // Photo browse roots (mounted NAS photo shares)
  photoPaths: list(process.env.MEDIA_PHOTO_PATH, "./media/library/photos"),

  thumbnailDir: abs(process.env.THUMBNAIL_CACHE_DIR || "./media/.thumbnails"),
  photoThumbnailDir: abs(process.env.PHOTO_THUMBNAIL_CACHE_DIR || "./media/.photo-thumbnails"),
  // Writable store for non-destructive photo edits (originals are read-only).
  photoEditsDir: abs(process.env.PHOTO_EDITS_DIR || "./media/.photo-edits"),

  ytdlpPath: process.env.YTDLP_PATH || "yt-dlp",
  ffmpegPath: process.env.FFMPEG_PATH || "ffmpeg",
  ffprobePath: process.env.FFPROBE_PATH || "ffprobe",

  authSecret: process.env.AUTH_SECRET || "insecure-dev-secret-change-me",

  // Display name for the storage host (sidebar ring / storage overview).
  nasName: process.env.NAS_NAME || os.hostname(),
} as const;

/** All directories the app is allowed to read/stream from. */
export function allowedVideoDirs(): string[] {
  return [config.downloadVideoPath, ...config.mediaVideoPaths].filter(Boolean);
}
export function allowedAudioDirs(): string[] {
  return [config.downloadAudioPath, ...config.mediaAudioPaths].filter(Boolean);
}
export function allAllowedDirs(): string[] {
  return [...allowedVideoDirs(), ...allowedAudioDirs()];
}

export const VIDEO_EXTS = new Set([
  ".mp4", ".mkv", ".webm", ".avi", ".mov", ".m4v", ".flv", ".wmv",
  ".mpg", ".mpeg", ".ts", ".m2ts", ".mts", ".vob",
]);

// Containers a browser can play natively (H.264/VP9/AV1 in these shells).
// Everything else in VIDEO_EXTS must be transcoded on the fly by ffmpeg.
export const DIRECT_PLAY_EXTS = new Set([".mp4", ".m4v", ".webm"]);
export const AUDIO_EXTS = new Set([
  ".mp3", ".m4a", ".flac", ".wav", ".ogg", ".opus", ".aac", ".wma",
]);
export const PHOTO_EXTS = new Set([
  ".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".tif", ".tiff", ".heic", ".heif", ".avif",
]);
