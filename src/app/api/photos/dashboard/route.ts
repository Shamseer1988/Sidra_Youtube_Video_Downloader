import { prisma } from "@/lib/prisma";
import { ok, withAuth } from "@/lib/api";
import { photoDTO } from "@/lib/photos";
import { toAlbumDTO, visibilityWhere } from "@/lib/albums";

// Photos overview: stats, recent uploads, "on this day" memories, albums,
// and a per-year breakdown. People/AI suggestions await the AI slice.
export const GET = withAuth(async (_req, user) => {
  const visible = { archived: false, hidden: false } as const;
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();

  const [
    totalPhotos,
    sizeAgg,
    geotagged,
    cameraGroups,
    yearGroups,
    recentRows,
    memoryRows,
    albumRows,
  ] = await Promise.all([
    prisma.photo.count({ where: visible }),
    prisma.photo.aggregate({ where: visible, _sum: { size: true } }),
    prisma.photo.count({ where: { ...visible, gpsLat: { not: null }, gpsLng: { not: null } } }),
    prisma.photo.groupBy({ by: ["camera"], where: { ...visible, camera: { not: null } } }),
    prisma.photo.groupBy({
      by: ["takenYear"],
      where: { ...visible, takenYear: { not: null } },
      _count: { _all: true },
      orderBy: { takenYear: "desc" },
    }),
    prisma.photo.findMany({ where: visible, orderBy: { createdAt: "desc" }, take: 18 }),
    prisma.photo.findMany({
      where: { ...visible, takenMonth: month, takenDay: day },
      orderBy: { takenYear: "desc" },
      take: 60,
    }),
    prisma.album.findMany({
      where: visibilityWhere(user.id),
      orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
      take: 8,
      include: { _count: { select: { photos: true, children: true } } },
    }),
  ]);

  const albumCount = await prisma.album.count({ where: visibilityWhere(user.id) });

  // Group "on this day" memories by year.
  const byYear = new Map<number, typeof memoryRows>();
  for (const p of memoryRows) {
    const y = p.takenYear;
    if (y == null || y === now.getFullYear()) continue;
    const list = byYear.get(y) ?? [];
    list.push(p);
    byYear.set(y, list);
  }
  const memories = [...byYear.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([year, photos]) => ({ year, photos: photos.map(photoDTO) }));

  return ok({
    stats: {
      totalPhotos,
      totalSize: Number(sizeAgg._sum.size || 0),
      geotagged,
      cameras: cameraGroups.length,
      albums: albumCount,
      years: yearGroups.length,
    },
    recent: recentRows.map(photoDTO),
    memories,
    albums: await Promise.all(albumRows.map((a) => toAlbumDTO(a, user.id))),
    byYear: yearGroups
      .filter((y) => y.takenYear != null)
      .map((y) => ({ year: y.takenYear!, count: y._count._all })),
  });
});
