import fsp from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { ok, withAuth } from "@/lib/api";
import { config, allAllowedDirs } from "@/lib/config";
import { allExtraDirs } from "@/lib/runtime-settings";

interface VolumeInfo {
  path: string;
  totalBytes: number;
  freeBytes: number;
  usedBytes: number;
  usedPercent: number;
}

/**
 * Real filesystem usage of every mounted media volume (statfs), plus a
 * library breakdown from the database. On Synology, the mounted
 * /media/... and /downloads/... volumes report the NAS volume stats.
 */
export const GET = withAuth(async () => {
  const dataDir = path.dirname((process.env.DATABASE_URL || "file:./prisma/dev.db").replace(/^file:/, ""));
  const candidates = [...new Set([...allAllowedDirs(), ...allExtraDirs(), dataDir])];

  const volumes: VolumeInfo[] = [];
  const seen = new Set<string>();

  for (const dir of candidates) {
    try {
      const st = await fsp.statfs(dir);
      const totalBytes = st.blocks * st.bsize;
      const freeBytes = st.bavail * st.bsize;
      // Dedupe mounts that resolve to the same underlying volume.
      const sig = `${st.type}-${st.blocks}-${st.bfree}-${st.files}`;
      if (totalBytes === 0 || seen.has(sig)) continue;
      seen.add(sig);
      volumes.push({
        path: dir,
        totalBytes,
        freeBytes,
        usedBytes: totalBytes - freeBytes,
        usedPercent: Math.round(((totalBytes - freeBytes) / totalBytes) * 100),
      });
    } catch {
      // Folder missing or statfs unsupported — skip.
    }
  }

  const [videoAgg, audioAgg] = await Promise.all([
    prisma.libraryItem.aggregate({ where: { type: "video" }, _sum: { size: true } }),
    prisma.libraryItem.aggregate({ where: { type: "audio" }, _sum: { size: true } }),
  ]);

  const totalBytes = volumes.reduce((s, v) => s + v.totalBytes, 0);
  const freeBytes = volumes.reduce((s, v) => s + v.freeBytes, 0);
  const usedBytes = totalBytes - freeBytes;

  return ok({
    nasName: config.nasName,
    totalBytes,
    freeBytes,
    usedBytes,
    usedPercent: totalBytes ? Math.round((usedBytes / totalBytes) * 100) : 0,
    volumes,
    library: {
      videoBytes: Number(videoAgg._sum.size || 0),
      audioBytes: Number(audioAgg._sum.size || 0),
    },
  });
});
