import "server-only";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "./prisma";

/**
 * Admin-managed media folders stored in the Setting table, so libraries can
 * be added from the UI without editing env vars. Values are cached in memory
 * because path-safety checks (verifyPath) must stay synchronous.
 */

const KEYS = {
  video: "extraVideoDirs",
  audio: "extraAudioDirs",
} as const;

export type MediaKindDir = keyof typeof KEYS;

let cache: Record<MediaKindDir, string[]> = { video: [], audio: [] };
let loaded = false;

function parseDirs(raw: string | undefined | null): string[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((p) => typeof p === "string") : [];
  } catch {
    return [];
  }
}

/** Load (or reload) the extra-folder cache from the database. */
export async function loadExtraDirs(): Promise<void> {
  try {
    const rows = await prisma.setting.findMany({
      where: { key: { in: Object.values(KEYS) } },
    });
    const byKey = new Map(rows.map((r) => [r.key, r.value]));
    cache = {
      video: parseDirs(byKey.get(KEYS.video)),
      audio: parseDirs(byKey.get(KEYS.audio)),
    };
    loaded = true;
  } catch {
    // DB may not exist yet on first boot; keep whatever we have.
  }
}

/** Synchronous read for path-safety checks and scanning. */
export function extraDirs(kind: MediaKindDir): string[] {
  if (!loaded) void loadExtraDirs();
  return cache[kind];
}

export function allExtraDirs(): string[] {
  return [...extraDirs("video"), ...extraDirs("audio")];
}

export interface FolderChangeResult {
  ok: boolean;
  message?: string;
  dirs?: string[];
}

/** Add a folder (validated: absolute path, exists, is a directory). */
export async function addExtraDir(kind: MediaKindDir, dir: string): Promise<FolderChangeResult> {
  const resolved = path.resolve(dir.trim());
  if (!dir.trim() || !path.isAbsolute(dir.trim())) {
    return { ok: false, message: "Enter an absolute path (e.g. /media/videos/Movies)" };
  }
  let stat: fs.Stats;
  try {
    stat = fs.statSync(resolved);
  } catch {
    return {
      ok: false,
      message: `Path not found inside the container. Mount it as a Docker volume first, then add it here.`,
    };
  }
  if (!stat.isDirectory()) return { ok: false, message: "Path is not a directory" };

  await loadExtraDirs();
  const current = cache[kind];
  if (current.includes(resolved)) return { ok: false, message: "Folder already added" };

  const next = [...current, resolved];
  await prisma.setting.upsert({
    where: { key: KEYS[kind] },
    update: { value: JSON.stringify(next) },
    create: { key: KEYS[kind], value: JSON.stringify(next) },
  });
  cache = { ...cache, [kind]: next };
  return { ok: true, dirs: next };
}

/** Remove a folder from the extra list (library items are pruned on next scan). */
export async function removeExtraDir(kind: MediaKindDir, dir: string): Promise<FolderChangeResult> {
  await loadExtraDirs();
  const resolved = path.resolve(dir);
  const next = cache[kind].filter((d) => d !== resolved);
  if (next.length === cache[kind].length) return { ok: false, message: "Folder not in list" };

  await prisma.setting.upsert({
    where: { key: KEYS[kind] },
    update: { value: JSON.stringify(next) },
    create: { key: KEYS[kind], value: JSON.stringify(next) },
  });
  cache = { ...cache, [kind]: next };
  return { ok: true, dirs: next };
}
