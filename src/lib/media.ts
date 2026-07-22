import "server-only";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import crypto from "node:crypto";
import {
  config,
  allAllowedDirs,
  VIDEO_EXTS,
  AUDIO_EXTS,
} from "./config";
import { registeredLibraryDirs } from "./libraries";
import { prisma } from "./prisma";

// ── Path safety ─────────────────────────────────────────────────────

/** True if `target` is inside one of `dirs` (prevents path traversal). */
export function isInsideAllowed(target: string, dirs: string[]): boolean {
  const resolved = path.resolve(target);
  return dirs.some((dir) => {
    const base = path.resolve(dir);
    return resolved === base || resolved.startsWith(base + path.sep);
  });
}

/** Every directory the app may read: downloads + registered libraries. */
export function allowedDirsRuntime(): string[] {
  return [...allAllowedDirs(), ...registeredLibraryDirs()];
}

/** Resolve a library item's path, verifying it is still allowed & exists. */
export function verifyPath(p: string): string | null {
  if (!p) return null;
  if (!isInsideAllowed(p, allowedDirsRuntime())) return null;
  try {
    if (!fs.statSync(p).isFile()) return null;
  } catch {
    return null;
  }
  return path.resolve(p);
}

// ── ffprobe metadata ────────────────────────────────────────────────

interface ProbeResult {
  duration?: number;
  width?: number;
  height?: number;
  vcodec?: string;
  acodec?: string;
}

function runProbe(file: string): Promise<ProbeResult> {
  return new Promise((resolve) => {
    const args = [
      "-v", "error",
      "-show_entries", "format=duration:stream=index,codec_type,codec_name,width,height",
      "-of", "json",
      file,
    ];
    let out = "";
    const child = spawn(config.ffprobePath, args, { stdio: ["ignore", "pipe", "ignore"] });
    child.stdout.on("data", (d) => (out += d.toString()));
    child.on("error", () => resolve({}));
    child.on("close", () => {
      try {
        const parsed = JSON.parse(out || "{}");
        const dur = parsed.format?.duration ? parseFloat(parsed.format.duration) : undefined;
        const streams: FfprobeStream[] = parsed.streams || [];
        const v = streams.find((s) => s.codec_type === "video");
        const a = streams.find((s) => s.codec_type === "audio");
        resolve({
          duration: Number.isFinite(dur) ? dur : undefined,
          width: v?.width,
          height: v?.height,
          vcodec: v?.codec_name,
          acodec: a?.codec_name,
        });
      } catch {
        resolve({});
      }
    });
  });
}

// ── Audio & subtitle track probing ──────────────────────────────────

export interface AudioTrackInfo {
  id: number; // ordinal among audio streams → ffmpeg 0:a:<id>
  label: string;
  language: string | null;
  channels: number | null;
  isDefault: boolean;
}

export interface SubtitleTrackInfo {
  id: number; // position in the combined list → /subtitle?track=<id>
  label: string;
  language: string | null;
  source: "embedded" | "external";
  streamIndex?: number; // ffmpeg 0:s:<streamIndex> for embedded
  path?: string; // absolute sidecar path for external (server-only)
}

// Text-based subtitle codecs that ffmpeg can convert to WebVTT. Bitmap
// subs (PGS/VobSub) are images and cannot become WebVTT, so we skip them.
const TEXT_SUB_CODECS = new Set([
  "subrip", "srt", "ass", "ssa", "mov_text", "webvtt", "text", "stl",
]);
const SUBTITLE_SIDECAR_EXTS = [".srt", ".vtt", ".ass", ".ssa", ".sub"];

interface FfprobeStream {
  codec_type?: string;
  codec_name?: string;
  channels?: number;
  width?: number;
  height?: number;
  disposition?: { default?: number };
  tags?: { language?: string; title?: string };
}

function probeStreams(file: string): Promise<FfprobeStream[]> {
  return new Promise((resolve) => {
    const args = ["-v", "error", "-show_streams", "-of", "json", file];
    let out = "";
    const child = spawn(config.ffprobePath, args, { stdio: ["ignore", "pipe", "ignore"] });
    child.stdout.on("data", (d) => (out += d.toString()));
    child.on("error", () => resolve([]));
    child.on("close", () => {
      try {
        resolve((JSON.parse(out || "{}").streams as FfprobeStream[]) || []);
      } catch {
        resolve([]);
      }
    });
  });
}

function langLabel(language: string | null, title: string | null, fallback: string): string {
  const parts = [title, language ? language.toUpperCase() : null].filter(Boolean);
  return parts.length ? parts.join(" · ") : fallback;
}

/**
 * List selectable audio and subtitle tracks for a media file: embedded
 * streams (via ffprobe) plus external subtitle sidecars sharing the video's
 * base name. Ordering is stable so the /subtitle route can reference a track
 * by index.
 */
export async function listTracks(
  file: string,
): Promise<{ audio: AudioTrackInfo[]; subtitles: SubtitleTrackInfo[] }> {
  const streams = await probeStreams(file);
  const audio: AudioTrackInfo[] = [];
  const subtitles: SubtitleTrackInfo[] = [];

  let audioOrdinal = 0;
  let subStreamOrdinal = 0;
  for (const s of streams) {
    const tags = s.tags || {};
    if (s.codec_type === "audio") {
      audio.push({
        id: audioOrdinal,
        label: langLabel(tags.language ?? null, tags.title ?? null, `Track ${audioOrdinal + 1}`),
        language: tags.language ?? null,
        channels: typeof s.channels === "number" ? s.channels : null,
        isDefault: !!s.disposition?.default,
      });
      audioOrdinal++;
    } else if (s.codec_type === "subtitle") {
      const ordinal = subStreamOrdinal++;
      if (!TEXT_SUB_CODECS.has(String(s.codec_name))) continue; // skip bitmap subs
      subtitles.push({
        id: subtitles.length,
        label: langLabel(tags.language ?? null, tags.title ?? null, `Subtitle ${ordinal + 1}`),
        language: tags.language ?? null,
        source: "embedded",
        streamIndex: ordinal,
      });
    }
  }

  // External sidecar subtitles next to the file (movie.en.srt, movie.srt…).
  try {
    const dir = path.dirname(file);
    const base = path.basename(file, path.extname(file));
    const entries = await fsp.readdir(dir);
    for (const name of entries.sort()) {
      const ext = path.extname(name).toLowerCase();
      if (!SUBTITLE_SIDECAR_EXTS.includes(ext)) continue;
      if (!name.startsWith(base)) continue;
      // Infer a language tag from the middle segment, e.g. movie.en.srt → en.
      const middle = path.basename(name, ext).slice(base.length).replace(/^[.\-_]/, "");
      subtitles.push({
        id: subtitles.length,
        label: langLabel(middle || null, null, `File ${ext.slice(1).toUpperCase()}`),
        language: middle || null,
        source: "external",
        path: path.join(dir, name),
      });
    }
  } catch {
    /* directory unreadable — embedded tracks still returned */
  }

  return { audio, subtitles };
}

// ── Thumbnail generation ────────────────────────────────────────────

// Multiple cached widths so grids request small images and viewers larger
// ones. WebP is ~30% smaller than JPEG at equal quality.
export const THUMB_SIZES = [200, 400, 800] as const;
export type ThumbSize = (typeof THUMB_SIZES)[number];
export const DEFAULT_THUMB_SIZE: ThumbSize = 400;

export function clampThumbSize(n: number): ThumbSize {
  return (THUMB_SIZES.find((s) => s === n) ?? DEFAULT_THUMB_SIZE) as ThumbSize;
}

function thumbCacheFile(itemId: string, size: number, atSec?: number): string {
  const suffix = atSec && atSec > 0 ? `_t${Math.floor(atSec)}` : "";
  return path.join(config.thumbnailDir, `${itemId}_${size}${suffix}.webp`);
}

function runThumbnail(filePath: string, out: string, size: number, seek: string): Promise<boolean> {
  return new Promise((resolve) => {
    const args = [
      "-ss", seek,
      "-i", filePath,
      "-frames:v", "1",
      "-vf", `scale=${size}:-2`,
      "-c:v", "libwebp",
      "-quality", "80",
      "-y", out,
    ];
    const child = spawn(config.ffmpegPath, args, { stdio: "ignore" });
    child.on("error", () => resolve(false));
    child.on("close", (code) => {
      try {
        resolve(code === 0 && fs.existsSync(out) && fs.statSync(out).size > 0);
      } catch {
        resolve(false);
      }
    });
  });
}

/**
 * Generate (once, then cache) a WebP thumbnail for a video and return its
 * path. Seeks are tried from a representative frame down to 0s so short
 * clips (whose 5s mark is past the end) still produce an image instead of
 * silently failing. `atSec` requests a specific frame (hover previews).
 */
export async function ensureThumbnail(
  itemId: string,
  filePath: string,
  opts?: { size?: number; durationSec?: number | null; atSec?: number },
): Promise<string | null> {
  const size = clampThumbSize(opts?.size ?? DEFAULT_THUMB_SIZE);
  const out = thumbCacheFile(itemId, size, opts?.atSec);
  try {
    if (fs.existsSync(out) && fs.statSync(out).size > 0) return out;
  } catch { /* regenerate */ }

  await fsp.mkdir(config.thumbnailDir, { recursive: true });

  // Build an ordered list of seek points to attempt.
  const seeks: string[] = [];
  if (opts?.atSec && opts.atSec > 0) {
    seeks.push(String(Math.floor(opts.atSec)));
  } else if (opts?.durationSec && opts.durationSec > 0) {
    // A frame ~20% in avoids black intros/logos.
    seeks.push(String(Math.max(1, Math.min(Math.floor(opts.durationSec * 0.2), 600))));
  }
  seeks.push("5", "1", "0");

  for (const seek of seeks) {
    if (await runThumbnail(filePath, out, size, seek)) return out;
  }
  return null;
}

// ── Background thumbnail queue ──────────────────────────────────────
// Pre-generate thumbnails off the request path (e.g. after a scan) with
// bounded concurrency so a large library doesn't saturate the CPU.

const thumbJobs: (() => Promise<void>)[] = [];
let thumbActive = 0;
const THUMB_CONCURRENCY = Number(process.env.THUMBNAIL_CONCURRENCY || 2);

function pumpThumbs() {
  while (thumbActive < THUMB_CONCURRENCY && thumbJobs.length > 0) {
    const job = thumbJobs.shift()!;
    thumbActive++;
    job().finally(() => {
      thumbActive--;
      pumpThumbs();
    });
  }
}

/** Queue background generation of the default thumbnail for a video item. */
export function queueThumbnail(itemId: string, filePath: string, durationSec?: number | null) {
  thumbJobs.push(async () => {
    const out = await ensureThumbnail(itemId, filePath, { durationSec });
    if (out) {
      await prisma.libraryItem
        .update({ where: { id: itemId }, data: { thumbnail: path.basename(out) } })
        .catch(() => {});
    }
  });
  pumpThumbs();
}

// ── Library scanning ────────────────────────────────────────────────

interface ScanTarget {
  dir: string;
  type: "video" | "audio";
  source: "download" | "nas";
  category: string;
  libraryId: string | null;
}

/**
 * Scan targets = the app's own download folders + every registered
 * MediaLibrary. Raw mounted volumes are NOT scanned; only assigned,
 * categorized libraries are indexed (Jellyfin-style).
 */
async function scanTargets(): Promise<ScanTarget[]> {
  const t: ScanTarget[] = [];
  if (config.downloadVideoPath)
    t.push({ dir: config.downloadVideoPath, type: "video", source: "download", category: "downloads", libraryId: null });
  if (config.downloadAudioPath)
    t.push({ dir: config.downloadAudioPath, type: "audio", source: "download", category: "downloads", libraryId: null });

  const libraries = await prisma.mediaLibrary.findMany();
  for (const lib of libraries) {
    t.push({
      dir: lib.path,
      type: lib.kind as "video" | "audio",
      source: "nas",
      category: lib.category,
      libraryId: lib.id,
    });
  }
  return t;
}

// NAS metadata/recycle folders that must never be indexed.
const SKIP_DIRS = new Set(["@eaDir", "#recycle", "#snapshot", "@tmp", "@sharebin"]);

async function* walk(dir: string): AsyncGenerator<string> {
  let entries: fs.Dirent[];
  try {
    entries = await fsp.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.name.startsWith(".") || SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full);
    } else if (entry.isFile()) {
      yield full;
    }
  }
}

/** True if `dir` exists, is a directory, and can actually be listed. */
async function isReadableDir(dir: string): Promise<boolean> {
  try {
    const st = await fsp.stat(dir);
    if (!st.isDirectory()) return false;
    await fsp.readdir(dir);
    return true;
  } catch {
    return false;
  }
}

let scanning = false;

/**
 * Walk every configured media folder and upsert LibraryItem rows.
 * New files get ffprobe metadata; removed files are pruned.
 */
export async function scanLibrary(): Promise<{ scanned: number; added: number; removed: number }> {
  if (scanning) return { scanned: 0, added: 0, removed: 0 };
  scanning = true;
  let scanned = 0;
  let added = 0;

  try {
    const seen = new Set<string>();
    const targets = await scanTargets();

    // Track which target roots we could actually read this pass. A NAS share
    // that is momentarily unmounted (common right after a Docker rebuild)
    // reads as missing/empty — we must NOT treat that as "files deleted",
    // or pruning would cascade-delete every favorite / watch-later / playlist
    // entry attached to those items. Only prune under roots proven healthy.
    const healthyRoots: string[] = [];
    for (const target of targets) {
      let filesInTarget = 0;
      const rootReadable = await isReadableDir(target.dir);
      for await (const file of walk(target.dir)) {
        const ext = path.extname(file).toLowerCase();
        const valid = target.type === "video" ? VIDEO_EXTS.has(ext) : AUDIO_EXTS.has(ext);
        if (!valid) continue;
        scanned++;
        seen.add(file);
        filesInTarget++;

        // Relative subfolder within the library (for the folder view).
        const folder = path.relative(target.dir, path.dirname(file));

        let stat: fs.Stats;
        try {
          stat = await fsp.stat(file);
        } catch {
          continue;
        }

        const existing = await prisma.libraryItem.findUnique({ where: { path: file } });
        const mtime = stat.mtime;

        if (existing) {
          // Keep size/mtime and library metadata in sync cheaply.
          if (
            existing.mtime.getTime() !== mtime.getTime() ||
            Number(existing.size) !== stat.size ||
            existing.category !== target.category ||
            existing.libraryId !== target.libraryId ||
            existing.folder !== folder
          ) {
            await prisma.libraryItem.update({
              where: { id: existing.id },
              data: {
                size: BigInt(stat.size),
                mtime,
                category: target.category,
                libraryId: target.libraryId,
                folder,
              },
            });
          }
          continue;
        }

        const probe = target.type === "video" ? await runProbe(file) : {};
        const created = await prisma.libraryItem.create({
          data: {
            path: file,
            title: path.basename(file, ext),
            type: target.type,
            source: target.source,
            category: target.category,
            folder,
            libraryId: target.libraryId,
            size: BigInt(stat.size),
            duration: probe.duration ?? null,
            width: probe.width ?? null,
            height: probe.height ?? null,
            vcodec: probe.vcodec ?? null,
            acodec: probe.acodec ?? null,
            ext: ext.replace(".", ""),
            mtime,
          },
        });
        if (target.type === "video") {
          queueThumbnail(created.id, file, probe.duration ?? null);
        }
        added++;
      }

      // A root is safe to prune under only if we could read it. Local
      // download folders are trustworthy even when empty; NAS shares must
      // have yielded at least one file, otherwise we assume the share is
      // unmounted rather than emptied and leave its rows (and their
      // favorites / watch-later / playlist links) untouched.
      const healthy =
        rootReadable && (target.source === "download" || filesInTarget > 0);
      if (healthy) healthyRoots.push(path.resolve(target.dir));
    }

    // Prune only rows that live under a healthy root AND whose file is truly
    // gone. Rows under an unavailable share are preserved so user state
    // survives transient mount failures across Docker rebuilds.
    const all = await prisma.libraryItem.findMany({ select: { id: true, path: true } });
    const gone = all.filter(
      (row) =>
        !seen.has(row.path) &&
        isInsideAllowed(row.path, healthyRoots) &&
        !fs.existsSync(row.path),
    );
    if (gone.length) {
      await prisma.libraryItem.deleteMany({ where: { id: { in: gone.map((g) => g.id) } } });
    }

    return { scanned, added, removed: gone.length };
  } finally {
    scanning = false;
  }
}

/**
 * Register a single freshly downloaded file as a LibraryItem
 * (called right after a download completes).
 */
export async function registerDownloadedFile(
  filePath: string,
  type: "video" | "audio",
  addedById: string,
  thumbnail?: string | null,
): Promise<string | null> {
  try {
    const stat = await fsp.stat(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const probe = await runProbe(filePath);
    const item = await prisma.libraryItem.upsert({
      where: { path: filePath },
      update: { size: BigInt(stat.size), mtime: stat.mtime },
      create: {
        path: filePath,
        title: path.basename(filePath, ext),
        type,
        source: "download",
        category: "downloads",
        size: BigInt(stat.size),
        duration: probe.duration ?? null,
        width: probe.width ?? null,
        height: probe.height ?? null,
        ext: ext.replace(".", ""),
        thumbnail: thumbnail ?? null,
        addedById,
        mtime: stat.mtime,
      },
    });
    return item.id;
  } catch {
    return null;
  }
}

export function contentTypeFor(file: string): string {
  const ext = path.extname(file).toLowerCase();
  const map: Record<string, string> = {
    ".mp4": "video/mp4", ".webm": "video/webm", ".mkv": "video/x-matroska",
    ".mov": "video/quicktime", ".avi": "video/x-msvideo", ".m4v": "video/mp4",
    ".ts": "video/mp2t", ".mpg": "video/mpeg", ".mpeg": "video/mpeg", ".wmv": "video/x-ms-wmv",
    ".flv": "video/x-flv", ".m2ts": "video/mp2t", ".mts": "video/mp2t", ".vob": "video/mpeg",
    ".mp3": "audio/mpeg", ".m4a": "audio/mp4", ".flac": "audio/flac",
    ".wav": "audio/wav", ".ogg": "audio/ogg", ".opus": "audio/opus",
    ".aac": "audio/aac", ".wma": "audio/x-ms-wma",
  };
  return map[ext] || "application/octet-stream";
}

export function hashId(input: string): string {
  return crypto.createHash("sha1").update(input).digest("hex");
}
