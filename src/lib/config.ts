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

  thumbnailDir: abs(process.env.THUMBNAIL_CACHE_DIR || "./media/.thumbnails"),

  ytdlpPath: process.env.YTDLP_PATH || "yt-dlp",
  ffmpegPath: process.env.FFMPEG_PATH || "ffmpeg",
  ffprobePath: process.env.FFPROBE_PATH || "ffprobe",

  authSecret: process.env.AUTH_SECRET || "insecure-dev-secret-change-me",
} as const;

// NOTE: media folders are managed in the database (MediaFolder model,
// Settings UI). The env-derived paths above act only as first-run
// defaults — see lib/folders.ts.

export const VIDEO_EXTS = new Set([
  ".mp4", ".mkv", ".webm", ".avi", ".mov", ".m4v", ".flv", ".wmv", ".mpg", ".mpeg", ".ts",
]);
export const AUDIO_EXTS = new Set([
  ".mp3", ".m4a", ".flac", ".wav", ".ogg", ".opus", ".aac", ".wma",
]);
