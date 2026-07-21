import "server-only";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { config } from "./config";
import { prisma } from "./prisma";
import { CATEGORIES, categoryMeta, type LibraryCategory, type LibraryKind } from "./categories";

/**
 * Jellyfin-style libraries. The mounted volumes (config.mediaVideoPaths /
 * mediaAudioPaths) are only *browse roots* — nothing is scanned until the
 * user assigns a subfolder as a library and gives it a category.
 */

export { CATEGORIES, categoryMeta };
export type { LibraryCategory, LibraryKind };

/* ------------------------------------------------------------------ */
/*  Browse roots (mounted volumes)                                     */
/* ------------------------------------------------------------------ */

export interface BrowseRoot {
  path: string;
  kind: LibraryKind;
}

export function browseRoots(): BrowseRoot[] {
  const roots: BrowseRoot[] = [];
  for (const p of config.mediaVideoPaths) roots.push({ path: p, kind: "video" });
  for (const p of config.mediaAudioPaths) roots.push({ path: p, kind: "audio" });
  return roots;
}

/** True if `target` is within one of the mounted browse roots. */
export function isInsideRoots(target: string): boolean {
  const resolved = path.resolve(target);
  return browseRoots().some(({ path: root }) => {
    const base = path.resolve(root);
    return resolved === base || resolved.startsWith(base + path.sep);
  });
}

/* ------------------------------------------------------------------ */
/*  Sync path cache (used by streaming path-safety, which is sync)     */
/* ------------------------------------------------------------------ */

let cachedLibraryDirs: string[] = [];
let loaded = false;

export async function loadLibraries(): Promise<void> {
  try {
    const libs = await prisma.mediaLibrary.findMany({ select: { path: true } });
    cachedLibraryDirs = libs.map((l) => l.path);
    loaded = true;
  } catch {
    // DB not ready on first boot — keep whatever we have.
  }
}

/** Synchronous read of every registered library path. */
export function registeredLibraryDirs(): string[] {
  if (!loaded) void loadLibraries();
  return cachedLibraryDirs;
}

/* ------------------------------------------------------------------ */
/*  CRUD                                                               */
/* ------------------------------------------------------------------ */

export interface LibraryDTO {
  id: string;
  name: string;
  path: string;
  category: LibraryCategory;
  kind: LibraryKind;
  itemCount: number;
}

export async function listLibraries(category?: string): Promise<LibraryDTO[]> {
  const libs = await prisma.mediaLibrary.findMany({
    where: category ? { category } : undefined,
    orderBy: { name: "asc" },
    include: { _count: { select: { items: true } } },
  });
  return libs.map((l) => ({
    id: l.id,
    name: l.name,
    path: l.path,
    category: l.category as LibraryCategory,
    kind: l.kind as LibraryKind,
    itemCount: l._count.items,
  }));
}

export interface AddResult {
  ok: boolean;
  message?: string;
  library?: LibraryDTO;
}

export async function addLibrary(input: {
  name: string;
  folderPath: string;
  category: string;
}): Promise<AddResult> {
  const meta = categoryMeta(input.category);
  if (!meta) return { ok: false, message: "Unknown category" };

  const resolved = path.resolve(input.folderPath.trim());
  if (!input.folderPath.trim() || !path.isAbsolute(input.folderPath.trim())) {
    return { ok: false, message: "Choose a folder to add" };
  }
  if (!isInsideRoots(resolved)) {
    return {
      ok: false,
      message: "Folder must be inside a mounted media volume. Mount it as a Docker volume first.",
    };
  }
  try {
    if (!fs.statSync(resolved).isDirectory()) {
      return { ok: false, message: "Path is not a directory" };
    }
  } catch {
    return { ok: false, message: "Folder not found inside the container" };
  }

  const name = input.name.trim() || path.basename(resolved);
  try {
    const lib = await prisma.mediaLibrary.create({
      data: { name, path: resolved, category: meta.id, kind: meta.kind },
    });
    await loadLibraries();
    return {
      ok: true,
      library: {
        id: lib.id,
        name: lib.name,
        path: lib.path,
        category: lib.category as LibraryCategory,
        kind: lib.kind as LibraryKind,
        itemCount: 0,
      },
    };
  } catch {
    return { ok: false, message: "That folder is already a library" };
  }
}

export async function removeLibrary(id: string): Promise<{ ok: boolean; message?: string }> {
  try {
    await prisma.mediaLibrary.delete({ where: { id } });
    await loadLibraries();
    return { ok: true };
  } catch {
    return { ok: false, message: "Library not found" };
  }
}

/* ------------------------------------------------------------------ */
/*  Folder browser (for the "add library" picker)                      */
/* ------------------------------------------------------------------ */

export interface BrowseEntry {
  name: string;
  path: string;
}

export interface BrowseResult {
  ok: boolean;
  message?: string;
  cwd: string | null;
  parent: string | null;
  atRoot: boolean;
  dirs: BrowseEntry[];
}

/**
 * List immediate subdirectories. With no path, returns the mounted roots.
 * Otherwise lists folders inside `dir` (must be within a root).
 */
export async function browse(dir?: string): Promise<BrowseResult> {
  const roots = browseRoots();

  if (!dir) {
    return {
      ok: true,
      cwd: null,
      parent: null,
      atRoot: true,
      dirs: roots.map((r) => ({ name: r.path, path: r.path })),
    };
  }

  const resolved = path.resolve(dir);
  if (!isInsideRoots(resolved)) {
    return { ok: false, message: "Outside allowed roots", cwd: null, parent: null, atRoot: true, dirs: [] };
  }

  let entries: fs.Dirent[];
  try {
    entries = await fsp.readdir(resolved, { withFileTypes: true });
  } catch {
    return { ok: false, message: "Cannot read folder", cwd: null, parent: null, atRoot: true, dirs: [] };
  }

  const isRoot = roots.some((r) => path.resolve(r.path) === resolved);
  const dirs = entries
    .filter((e) => e.isDirectory() && !e.name.startsWith("."))
    .map((e) => ({ name: e.name, path: path.join(resolved, e.name) }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    ok: true,
    cwd: resolved,
    parent: isRoot ? null : path.dirname(resolved),
    atRoot: isRoot,
    dirs,
  };
}
