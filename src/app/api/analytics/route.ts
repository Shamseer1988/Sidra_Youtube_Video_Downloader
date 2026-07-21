import { prisma } from "@/lib/prisma";
import { ok, withAuth } from "@/lib/api";

const DAY = 864e5;

/** Real analytics derived from the download & library tables. */
export const GET = withAuth(async (_req, user) => {
  const now = Date.now();

  const [downloads7, byCategory, byPlatform, libItems, recentPlayed, totalItems, completedTotal] =
    await Promise.all([
      prisma.download.findMany({
        where: { userId: user.id, createdAt: { gte: new Date(now - 7 * DAY) } },
        select: { createdAt: true, status: true },
      }),
      prisma.libraryItem.groupBy({
        by: ["category"],
        _count: { _all: true },
        _sum: { size: true },
      }),
      prisma.download.groupBy({
        by: ["platform"],
        where: { userId: user.id },
        _count: { _all: true },
      }),
      prisma.libraryItem.findMany({
        where: { source: "nas" },
        select: { createdAt: true, size: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.userMediaState.findMany({
        where: { userId: user.id, position: { gt: 0 } },
        orderBy: { playedAt: "desc" },
        take: 6,
        include: { item: { select: { id: true, title: true, type: true, thumbnail: true, duration: true } } },
      }),
      prisma.libraryItem.count(),
      prisma.download.count({ where: { userId: user.id, status: "completed" } }),
    ]);

  // Downloads per day (last 7 days).
  const days: { day: string; downloads: number; completed: number }[] = [];
  const dayKey = new Map<string, number>();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now - i * DAY);
    const label = d.toLocaleDateString("en-US", { weekday: "short" });
    dayKey.set(d.toISOString().slice(0, 10), days.length);
    days.push({ day: label, downloads: 0, completed: 0 });
  }
  for (const row of downloads7) {
    const idx = dayKey.get(row.createdAt.toISOString().slice(0, 10));
    if (idx === undefined) continue;
    days[idx].downloads++;
    if (row.status === "completed") days[idx].completed++;
  }

  // Category breakdown (counts + GB).
  const categoryColors: Record<string, string> = {
    movies: "#7c3aed",
    tv: "#3b82f6",
    videos: "#10b981",
    music: "#f59e0b",
    downloads: "#64748b",
  };
  const categories = byCategory.map((c) => ({
    name: c.category,
    value: c._count._all,
    gb: +(Number(c._sum.size || 0) / 1e9).toFixed(1),
    color: categoryColors[c.category] ?? "#64748b",
  }));

  // Top download sources by platform.
  const platformColors: Record<string, string> = {
    youtube: "#ef4444",
    vimeo: "#3b82f6",
    other: "#7c3aed",
    direct: "#10b981",
  };
  const sources = byPlatform
    .map((p) => ({
      name: p.platform,
      value: p._count._all,
      color: platformColors[p.platform] ?? "#64748b",
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  // Storage growth: cumulative library size by month (last 6 months).
  const months: { month: string; gb: number }[] = [];
  const monthIdx = new Map<string, number>();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now - i * 30 * DAY);
    const label = d.toLocaleDateString("en-US", { month: "short" });
    monthIdx.set(`${d.getFullYear()}-${d.getMonth()}`, months.length);
    months.push({ month: label, gb: 0 });
  }
  let cumulative = 0;
  const monthlyTotals = new Array(months.length).fill(0);
  for (const it of libItems) {
    const d = it.createdAt;
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const idx = monthIdx.get(key);
    if (idx !== undefined) monthlyTotals[idx] += Number(it.size);
  }
  for (let i = 0; i < months.length; i++) {
    cumulative += monthlyTotals[i];
    months[i].gb = +(cumulative / 1e9).toFixed(1);
  }

  const recentlyWatched = recentPlayed.map((s) => ({
    id: s.item.id,
    title: s.item.title,
    type: s.item.type,
    thumbnail: s.item.thumbnail,
    progress:
      s.item.duration && s.position ? Math.min(100, Math.round((s.position / s.item.duration) * 100)) : 0,
  }));

  return ok({
    downloadsPerDay: days,
    categories,
    sources,
    storageGrowth: months,
    recentlyWatched,
    totals: {
      libraryItems: totalItems,
      completedDownloads: completedTotal,
      weekDownloads: downloads7.length,
    },
  });
});
