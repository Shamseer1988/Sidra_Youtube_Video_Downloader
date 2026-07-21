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
}

function runProbe(file: string): Promise<ProbeResult> {
  return new Promise((resolve) => {
    const args = [
      "-v", "error",
      "-select_streams", "v:0",
      "-show_entries", "format=duration:stream=width,height",
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
        const stream = parsed.streams?.[0] || {};
        resolve({
          duration: Number.isFinite(dur) ? dur : undefined,
          width: stream.width,
          height: stream.height,
        });
      } catch {
        resolve({});
      }
    });
  });
}

// ── Thumbnail generation ────────────────────────────────────────────

function thumbCacheFile(itemId: string): string {
  return path.join(config.thumbnailDir, `${itemId}.jpg`);
}

/** Generate (once) and return the cached thumbnail file path for a video. */
export async function ensureThumbnail(itemId: string, filePath: string): Promise<string | null> {
  const out = thumbCacheFile(itemId);
  try {
    if (fs.existsSync(out) && fs.statSync(out).size > 0) return out;
  } catch { /* regenerate */ }

  await fsp.mkdir(config.thumbnailDir, { recursive: true });

  return new Promise((resolve) => {
    const args = [
      "-ss", "00:00:05",
      "-i", filePath,
      "-frames:v", "1",
      "-vf", "scale=480:-1",
      "-y", out,
    ];
    const child = spawn(config.ffmpegPath, args, { stdio: "ignore" });
    child.on("error", () => resolve(null));
    child.on("close", (code) => {
      if (code === 0 && fs.existsSync(out)) resolve(out);
      else resolve(null);
    });
  });
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

async function* walk(dir: string): AsyncGenerator<string> {
  let entries: fs.Dirent[];
  try {
    entries = await fsp.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full);
    } else if (entry.isFile()) {
      yield full;
    }
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
    for (const target of await scanTargets()) {
      for await (const file of walk(target.dir)) {
        const ext = path.extname(file).toLowerCase();
        const valid = target.type === "video" ? VIDEO_EXTS.has(ext) : AUDIO_EXTS.has(ext);
        if (!valid) continue;
        scanned++;
        seen.add(file);

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
        await prisma.libraryItem.create({
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
            ext: ext.replace(".", ""),
            mtime,
          },
        });
        added++;
      }
    }

    // Prune DB rows whose files no longer exist on disk.
    const all = await prisma.libraryItem.findMany({ select: { id: true, path: true } });
    const gone = all.filter((row) => !seen.has(row.path) && !fs.existsSync(row.path));
    if (gone.length) {
      await prisma.libraryItem.deleteMany({ where: { id: { in: gone.map((g) => g.id) } } });
    }

    // Remove orphaned NAS items that belong to no registered library.
    // (Cleans up rows left by the pre-libraries auto-scan on upgrade.)
    const orphaned = await prisma.libraryItem.deleteMany({
      where: { source: "nas", libraryId: null },
    });

    return { scanned, added, removed: gone.length + orphaned.count };
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
    ".flv": "video/x-flv",
    ".mp3": "audio/mpeg", ".m4a": "audio/mp4", ".flac": "audio/flac",
    ".wav": "audio/wav", ".ogg": "audio/ogg", ".opus": "audio/opus",
    ".aac": "audio/aac", ".wma": "audio/x-ms-wma",
  };
  return map[ext] || "application/octet-stream";
}

export function hashId(input: string): string {
  return crypto.createHash("sha1").update(input).digest("hex");
}
