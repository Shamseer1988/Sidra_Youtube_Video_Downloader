import { prisma } from "@/lib/prisma";
import { ok, withAuth } from "@/lib/api";

// Geotagged photos for the map view (minimal payload; capped).
export const GET = withAuth(async () => {
  const rows = await prisma.photo.findMany({
    where: { archived: false, hidden: false, gpsLat: { not: null }, gpsLng: { not: null } },
    select: { id: true, gpsLat: true, gpsLng: true, filename: true, takenAt: true },
    orderBy: { takenAt: "desc" },
    take: 5000,
  });
  return ok(
    rows
      .filter((r) => r.gpsLat != null && r.gpsLng != null)
      .map((r) => ({ id: r.id, lat: r.gpsLat!, lng: r.gpsLng!, filename: r.filename })),
  );
});
