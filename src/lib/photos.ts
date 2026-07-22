import "server-only";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import exifr from "exifr";
import { config, PHOTO_EXTS } from "./config";
import { prisma } from "./prisma";

/**
 * Photos module: register mounted photo folders, index them (EXIF + geo),
 * and generate cached WebP thumbnails. Mirrors the media library patterns.
 */

// ── Browse roots & path safety ──────────────────────────────────────

export function photoRoots(): string[] {
  return config.photoPaths.filter(Boolean);
}

export function isInsidePhotoRoots(target: string): boolean {
  const resolved = path.resolve(target);
  return photoRoots().some((root) => {
    const base = path.resolve(root);
    return resolved === base || resolved.startsWith(base + path.sep);
  });
}

let cachedPhotoDirs: string[] = [];
let loaded = false;

export async function loadPhotoLibraries(): Promise<void> {
  try {
    const libs = await prisma.photoLibrary.findMany({ select: { path: true } });
    cachedPhotoDirs = libs.map((l) => l.path);
    loaded = true;
  } catch {
    /* DB not ready yet */
  }
}

/** Every directory the app may read photos from: roots + registered libs. */
function allowedPhotoDirs(): string[] {
  if (!loaded) void loadPhotoLibraries();
  return [...photoRoots(), ...cachedPhotoDirs];
}

/** Resolve a photo path, verifying it is still allowed and exists. */
export function verifyPhotoPath(p: string): string | null {
  if (!p) return null;
  const resolved = path.resolve(p);
  const allowed = allowedPhotoDirs().some((dir) => {
    const base = path.resolve(dir);
    return resolved === base || resolved.startsWith(base + path.sep);
  });
  if (!allowed) return null;
  try {
    if (!fs.statSync(resolved).isFile()) return null;
  } catch {
    return null;
  }
  return resolved;
}

// ── Library CRUD ────────────────────────────────────────────────────

export interface PhotoLibraryDTO {
  id: string;
  name: string;
  path: string;
  photoCount: number;
}

export async function listPhotoLibraries(): Promise<PhotoLibraryDTO[]> {
  const libs = await prisma.photoLibrary.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { photos: true } } },
  });
  return libs.map((l) => ({ id: l.id, name: l.name, path: l.path, photoCount: l._count.photos }));
}

export async function addPhotoLibrary(input: { name: string; folderPath: string }): Promise<{
  ok: boolean;
  message?: string;
  library?: PhotoLibraryDTO;
}> {
  const folder = input.folderPath?.trim();
  if (!folder || !path.isAbsolute(folder)) return { ok: false, message: "Choose a folder to add" };
  const resolved = path.resolve(folder);
  if (!isInsidePhotoRoots(resolved)) {
    return { ok: false, message: "Folder must be inside a mounted photo volume (MEDIA_PHOTO_PATH)." };
  }
  try {
    if (!fs.statSync(resolved).isDirectory()) return { ok: false, message: "Path is not a directory" };
    await fsp.readdir(resolved); // ensure the container user can actually list it
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code === "EACCES" || code === "EPERM") {
      return {
        ok: false,
        message: "Permission denied — the container user can't read this folder. Grant it read access to the share on your NAS (Synology's 'photo' share is restricted by default).",
      };
    }
    return { ok: false, message: "Folder not found inside the container — is it mounted?" };
  }
  const name = input.name?.trim() || path.basename(resolved);
  try {
    const lib = await prisma.photoLibrary.create({ data: { name, path: resolved } });
    await loadPhotoLibraries();
    return { ok: true, library: { id: lib.id, name: lib.name, path: lib.path, photoCount: 0 } };
  } catch {
    return { ok: false, message: "That folder is already a photo library" };
  }
}

export async function removePhotoLibrary(id: string): Promise<{ ok: boolean; message?: string }> {
  try {
    await prisma.photoLibrary.delete({ where: { id } });
    await loadPhotoLibraries();
    return { ok: true };
  } catch {
    return { ok: false, message: "Library not found" };
  }
}

export interface PhotoBrowseEntry {
  name: string;
  path: string;
  readable?: boolean;
}

export interface PhotoBrowseResult {
  ok: boolean;
  message?: string;
  cwd: string | null;
  parent: string | null;
  atRoot: boolean;
  dirs: PhotoBrowseEntry[];
}

/** List subdirectories for the photo-library picker (within photo roots). */
export async function browsePhotos(dir?: string): Promise<PhotoBrowseResult> {
  const roots = photoRoots();
  if (!dir) {
    if (roots.length === 0) {
      return {
        ok: false,
        message: "No photo volume is mounted. Set MEDIA_PHOTO_PATH and mount a folder to it.",
        cwd: null,
        parent: null,
        atRoot: true,
        dirs: [],
      };
    }
    // Flag which roots are actually readable so the picker can warn early.
    const dirs: PhotoBrowseEntry[] = [];
    for (const p of roots) dirs.push({ name: p, path: p, readable: await isReadableDir(p) });
    return { ok: true, cwd: null, parent: null, atRoot: true, dirs };
  }
  const resolved = path.resolve(dir);
  if (!isInsidePhotoRoots(resolved)) {
    return { ok: false, message: "That folder is outside the mounted photo volume.", cwd: null, parent: null, atRoot: true, dirs: [] };
  }
  let entries: fs.Dirent[];
  try {
    entries = await fsp.readdir(resolved, { withFileTypes: true });
  } catch {
    return {
      ok: false,
      message:
        "Permission denied reading this folder. The container user (PUID/PGID) can't list it — grant that user read access to the share on your NAS (Synology's 'photo' share is locked down by default).",
      cwd: null,
      parent: null,
      atRoot: true,
      dirs: [],
    };
  }
  const isRoot = roots.some((r) => path.resolve(r) === resolved);
  return {
    ok: true,
    cwd: resolved,
    parent: isRoot ? null : path.dirname(resolved),
    atRoot: isRoot,
    dirs: entries
      .filter((e) => e.isDirectory() && !e.name.startsWith("."))
      .map((e) => ({ name: e.name, path: path.join(resolved, e.name) }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
}

// ── EXIF extraction ─────────────────────────────────────────────────

interface PhotoMeta {
  width?: number;
  height?: number;
  takenAt?: Date;
  camera?: string;
  lens?: string;
  iso?: number;
  fNumber?: number;
  focalLength?: number;
  exposure?: string;
  gpsLat?: number;
  gpsLng?: number;
}

async function readExif(file: string): Promise<PhotoMeta> {
  try {
    const d = await exifr.parse(file, {
      tiff: true,
      exif: true,
      gps: true,
      pick: [
        "DateTimeOriginal", "CreateDate", "ModifyDate",
        "Make", "Model", "LensModel",
        "ISO", "FNumber", "FocalLength", "ExposureTime",
        "ExifImageWidth", "ExifImageHeight", "ImageWidth", "ImageHeight",
        "latitude", "longitude",
      ],
    });
    if (!d) return {};
    const make = [d.Make, d.Model].filter(Boolean).join(" ").trim();
    const exposure =
      typeof d.ExposureTime === "number" && d.ExposureTime > 0
        ? d.ExposureTime >= 1
          ? `${d.ExposureTime}s`
          : `1/${Math.round(1 / d.ExposureTime)}s`
        : undefined;
    return {
      width: d.ExifImageWidth || d.ImageWidth || undefined,
      height: d.ExifImageHeight || d.ImageHeight || undefined,
      takenAt: d.DateTimeOriginal || d.CreateDate || d.ModifyDate || undefined,
      camera: make || undefined,
      lens: d.LensModel || undefined,
      iso: d.ISO || undefined,
      fNumber: typeof d.FNumber === "number" ? d.FNumber : undefined,
      focalLength: typeof d.FocalLength === "number" ? d.FocalLength : undefined,
      exposure,
      gpsLat: typeof d.latitude === "number" ? d.latitude : undefined,
      gpsLng: typeof d.longitude === "number" ? d.longitude : undefined,
    };
  } catch {
    return {};
  }
}

// ── Thumbnails ──────────────────────────────────────────────────────

export const PHOTO_THUMB_SIZES = [200, 400, 1200] as const;
export type PhotoThumbSize = (typeof PHOTO_THUMB_SIZES)[number];
export const DEFAULT_PHOTO_THUMB: PhotoThumbSize = 400;

export function clampPhotoThumb(n: number): PhotoThumbSize {
  return (PHOTO_THUMB_SIZES.find((s) => s === n) ?? DEFAULT_PHOTO_THUMB) as PhotoThumbSize;
}

function photoThumbFile(id: string, size: number): string {
  return path.join(config.photoThumbnailDir, `${id}_${size}.webp`);
}

/** Generate (once, then cache) a WebP thumbnail for a photo. */
export async function ensurePhotoThumbnail(id: string, filePath: string, size = DEFAULT_PHOTO_THUMB): Promise<string | null> {
  const out = photoThumbFile(id, clampPhotoThumb(size));
  try {
    if (fs.existsSync(out) && fs.statSync(out).size > 0) return out;
  } catch { /* regenerate */ }
  await fsp.mkdir(config.photoThumbnailDir, { recursive: true });

  return new Promise((resolve) => {
    // -noautorotate off (default applies EXIF orientation via autorotate).
    const args = ["-i", filePath, "-vf", `scale=${size}:-1`, "-c:v", "libwebp", "-quality", "82", "-y", out];
    const child = spawn(config.ffmpegPath, args, { stdio: "ignore" });
    child.on("error", () => resolve(null));
    child.on("close", (code) => {
      try {
        resolve(code === 0 && fs.existsSync(out) && fs.statSync(out).size > 0 ? out : null);
      } catch {
        resolve(null);
      }
    });
  });
}

// Bounded background thumbnail queue.
const thumbJobs: (() => Promise<void>)[] = [];
let thumbActive = 0;
const THUMB_CONCURRENCY = Number(process.env.PHOTO_THUMBNAIL_CONCURRENCY || 2);

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

function queuePhotoThumbnail(id: string, filePath: string) {
  thumbJobs.push(async () => {
    const out = await ensurePhotoThumbnail(id, filePath, DEFAULT_PHOTO_THUMB);
    if (out) {
      await prisma.photo.update({ where: { id }, data: { thumbnail: path.basename(out) } }).catch(() => {});
    }
  });
  pumpThumbs();
}

// ── Scanning / indexing ─────────────────────────────────────────────

// Synology (and similar NAS) metadata/recycle folders that must never be
// indexed as photos.
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
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.isFile()) yield full;
  }
}

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

export async function scanPhotos(): Promise<{ scanned: number; added: number; removed: number }> {
  if (scanning) return { scanned: 0, added: 0, removed: 0 };
  scanning = true;
  let scanned = 0;
  let added = 0;

  try {
    // Backfill derived date parts for photos indexed before these columns
    // existed (bounded per pass so a huge library catches up gradually).
    const stale = await prisma.photo.findMany({
      where: { takenYear: null, NOT: { takenAt: null } },
      select: { id: true, takenAt: true },
      take: 5000,
    });
    for (const p of stale) {
      if (!p.takenAt) continue;
      const d = p.takenAt;
      await prisma.photo
        .update({ where: { id: p.id }, data: { takenYear: d.getFullYear(), takenMonth: d.getMonth() + 1, takenDay: d.getDate() } })
        .catch(() => {});
    }

    const libraries = await prisma.photoLibrary.findMany();
    const seen = new Set<string>();
    const healthyRoots: string[] = [];

    for (const lib of libraries) {
      const rootReadable = await isReadableDir(lib.path);
      let filesInLib = 0;

      for await (const file of walk(lib.path)) {
        const ext = path.extname(file).toLowerCase();
        if (!PHOTO_EXTS.has(ext)) continue;
        scanned++;
        seen.add(file);
        filesInLib++;

        const folder = path.relative(lib.path, path.dirname(file));
        let stat: fs.Stats;
        try {
          stat = await fsp.stat(file);
        } catch {
          continue;
        }
        const mtime = stat.mtime;

        const existing = await prisma.photo.findUnique({ where: { path: file } });
        if (existing) {
          if (existing.mtime.getTime() !== mtime.getTime() || existing.libraryId !== lib.id || existing.folder !== folder) {
            await prisma.photo.update({
              where: { id: existing.id },
              data: { size: BigInt(stat.size), mtime, libraryId: lib.id, folder },
            });
          }
          continue;
        }

        const meta = await readExif(file);
        const taken = meta.takenAt ?? mtime;
        const created = await prisma.photo.create({
          data: {
            path: file,
            libraryId: lib.id,
            folder,
            filename: path.basename(file),
            ext: ext.replace(".", ""),
            size: BigInt(stat.size),
            width: meta.width ?? null,
            height: meta.height ?? null,
            takenAt: taken,
            takenYear: taken.getFullYear(),
            takenMonth: taken.getMonth() + 1,
            takenDay: taken.getDate(),
            mtime,
            camera: meta.camera ?? null,
            lens: meta.lens ?? null,
            iso: meta.iso ?? null,
            fNumber: meta.fNumber ?? null,
            focalLength: meta.focalLength ?? null,
            exposure: meta.exposure ?? null,
            gpsLat: meta.gpsLat ?? null,
            gpsLng: meta.gpsLng ?? null,
          },
        });
        queuePhotoThumbnail(created.id, file);
        added++;
      }

      if (rootReadable && filesInLib > 0) healthyRoots.push(path.resolve(lib.path));
    }

    // Prune only under roots proven healthy this pass (mount-safe).
    const all = await prisma.photo.findMany({ select: { id: true, path: true } });
    const gone = all.filter((row) => {
      if (seen.has(row.path)) return false;
      const resolved = path.resolve(row.path);
      const underHealthy = healthyRoots.some((r) => resolved === r || resolved.startsWith(r + path.sep));
      return underHealthy && !fs.existsSync(row.path);
    });
    if (gone.length) {
      await prisma.photo.deleteMany({ where: { id: { in: gone.map((g) => g.id) } } });
    }

    return { scanned, added, removed: gone.length };
  } finally {
    scanning = false;
  }
}

// Shape a Photo row for the client (drops the absolute path, exposes a
// boolean thumbnail flag; ok()/jsonSafe converts BigInt + Date fields).
type PhotoRow = { path: string; thumbnail: string | null; size: bigint } & Record<string, unknown>;
export function photoDTO(p: PhotoRow) {
  const { path: _path, thumbnail, ...rest } = p;
  return { ...rest, size: Number(p.size), hasThumbnail: !!thumbnail };
}

export function photoContentType(file: string): string {
  const ext = path.extname(file).toLowerCase();
  const map: Record<string, string> = {
    ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp",
    ".gif": "image/gif", ".bmp": "image/bmp", ".tif": "image/tiff", ".tiff": "image/tiff",
    ".heic": "image/heic", ".heif": "image/heif", ".avif": "image/avif",
  };
  return map[ext] || "application/octet-stream";
}
