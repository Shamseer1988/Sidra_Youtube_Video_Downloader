import "server-only";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { prisma } from "./prisma";
import { config } from "./config";

/**
 * Media folders live in the database and are managed from the Settings UI.
 * On first run (empty table) the env-configured defaults are registered so
 * Docker volume mappings keep working with zero clicks.
 */

export type FolderKind = "video" | "audio";
export type FolderRole = "library" | "download";

let seeded = false;

export async function ensureDefaultFolders(): Promise<void> {
  if (seeded) return;
  const count = await prisma.mediaFolder.count();
  if (count === 0) {
    const defaults: { path: string; kind: FolderKind; role: FolderRole }[] = [
      { path: config.downloadVideoPath, kind: "video", role: "download" },
      { path: config.downloadAudioPath, kind: "audio", role: "download" },
      ...config.mediaVideoPaths.map((p) => ({ path: p, kind: "video" as const, role: "library" as const })),
      ...config.mediaAudioPaths.map((p) => ({ path: p, kind: "audio" as const, role: "library" as const })),
    ];
    for (const d of defaults) {
      if (!d.path) continue;
      await prisma.mediaFolder
        .upsert({
          where: { path_kind_role: { path: d.path, kind: d.kind, role: d.role } },
          update: {},
          create: d,
        })
        .catch(() => {});
    }
  }
  seeded = true;
}

export async function listFolders() {
  await ensureDefaultFolders();
  const rows = await prisma.mediaFolder.findMany({ orderBy: [{ role: "desc" }, { kind: "asc" }, { createdAt: "asc" }] });
  return rows.map((r) => ({
    ...r,
    exists: fs.existsSync(r.path) && fs.statSync(r.path).isDirectory(),
  }));
}

/** Every directory the app may read/stream/scan. */
export async function allowedDirs(): Promise<string[]> {
  await ensureDefaultFolders();
  const rows = await prisma.mediaFolder.findMany({ select: { path: true } });
  return rows.map((r) => path.resolve(r.path));
}

/** Scan targets for the library indexer. Download folders are indexed too. */
export async function scanTargets(): Promise<{ dir: string; kind: FolderKind; role: FolderRole }[]> {
  await ensureDefaultFolders();
  const rows = await prisma.mediaFolder.findMany();
  return rows.map((r) => ({ dir: path.resolve(r.path), kind: r.kind as FolderKind, role: r.role as FolderRole }));
}

/** Where new downloads of `kind` should be written. */
export async function downloadDir(kind: FolderKind): Promise<string> {
  await ensureDefaultFolders();
  const row = await prisma.mediaFolder.findFirst({
    where: { kind, role: "download" },
    orderBy: { createdAt: "asc" },
  });
  const dir = row?.path || (kind === "audio" ? config.downloadAudioPath : config.downloadVideoPath);
  await fsp.mkdir(dir, { recursive: true }).catch(() => {});
  return path.resolve(dir);
}

export async function addFolder(p: string, kind: FolderKind, role: FolderRole) {
  const resolved = path.resolve(p.trim());
  let stat: fs.Stats;
  try {
    stat = await fsp.stat(resolved);
  } catch {
    throw new Error("Folder does not exist on the server.");
  }
  if (!stat.isDirectory()) throw new Error("Path is not a directory.");
  if (role === "download") {
    try {
      await fsp.access(resolved, fs.constants.W_OK);
    } catch {
      throw new Error("Download folder is not writable.");
    }
  }
  return prisma.mediaFolder.upsert({
    where: { path_kind_role: { path: resolved, kind, role } },
    update: {},
    create: { path: resolved, kind, role },
  });
}

export async function removeFolder(id: string) {
  return prisma.mediaFolder.delete({ where: { id } });
}
