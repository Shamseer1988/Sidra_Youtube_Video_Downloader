import { prisma } from "@/lib/prisma";
import { ok, withAuth } from "@/lib/api";

function shape(item: any) {
  const { path: _p, states, ...rest } = item;
  const st = states?.[0];
  return {
    ...rest,
    state: st
      ? { favorite: st.favorite, watchLater: st.watchLater, liked: st.liked, position: st.position, finished: st.finished }
      : { favorite: false, watchLater: false, liked: false, position: 0, finished: false },
  };
}

// Dashboard payload: counts, storage, recent activity, continue-watching.
export const GET = withAuth(async (_req, user) => {
  const [
    totalDownloads,
    activeDownloads,
    totalVideos,
    totalAudios,
    sizeAgg,
    recentDownloaded,
    recentUploaded,
    continueRaw,
    last7Raw,
  ] = await Promise.all([
    prisma.download.count({ where: { userId: user.id } }),
    prisma.download.count({ where: { userId: user.id, status: { in: ["queued", "downloading"] } } }),
    prisma.libraryItem.count({ where: { type: "video" } }),
    prisma.libraryItem.count({ where: { type: "audio" } }),
    prisma.libraryItem.aggregate({ _sum: { size: true } }),
    prisma.libraryItem.findMany({
      where: { source: "download" },
      orderBy: { createdAt: "desc" },
      take: 12,
      include: { states: { where: { userId: user.id } } },
    }),
    prisma.libraryItem.findMany({
      where: { source: "nas" },
      orderBy: { mtime: "desc" },
      take: 12,
      include: { states: { where: { userId: user.id } } },
    }),
    prisma.userMediaState.findMany({
      where: { userId: user.id, position: { gt: 0 }, finished: false },
      orderBy: { playedAt: "desc" },
      take: 12,
      include: { item: { include: { states: { where: { userId: user.id } } } } },
    }),
    prisma.download.findMany({
      where: { userId: user.id, createdAt: { gte: new Date(Date.now() - 7 * 864e5) } },
      select: { createdAt: true, mediaType: true },
    }),
  ]);

  // Bucket the last 7 days of downloads.
  const days: { date: string; videos: number; audios: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 864e5);
    const key = d.toISOString().slice(0, 10);
    days.push({ date: key, videos: 0, audios: 0 });
  }
  const byKey = new Map(days.map((d) => [d.date, d]));
  for (const row of last7Raw) {
    const key = row.createdAt.toISOString().slice(0, 10);
    const bucket = byKey.get(key);
    if (bucket) {
      if (row.mediaType === "audio") bucket.audios++;
      else bucket.videos++;
    }
  }

  return ok({
    stats: {
      totalDownloads,
      activeDownloads,
      totalVideos,
      totalAudios,
      storageUsed: Number(sizeAgg._sum.size || 0),
    },
    recentDownloaded: recentDownloaded.map(shape),
    recentUploaded: recentUploaded.map(shape),
    continueWatching: continueRaw.map((s) => shape(s.item)),
    activity: days,
  });
});
