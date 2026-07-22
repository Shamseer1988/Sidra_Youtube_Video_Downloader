import { prisma } from "@/lib/prisma";
import { ok, withAuth } from "@/lib/api";
import { photoDTO } from "@/lib/photos";
import { buildPhotoWhere } from "@/lib/photo-search";

// List/search photos newest-first (by capture time) with cursor pagination.
// Supports natural-language ?q= plus structured filters. Excludes
// archived/hidden unless requested via ?scope=archive|all.
export const GET = withAuth(async (req) => {
  const url = new URL(req.url);
  const p = url.searchParams;
  const limit = Math.min(Number(p.get("limit") || 120), 500);
  const cursor = p.get("cursor") || undefined;

  const where = buildPhotoWhere({
    q: p.get("q") || undefined,
    libraryId: p.get("libraryId") || undefined,
    favorite: p.get("favorite") === "1",
    scope: p.get("scope") || undefined,
    year: p.get("year") ? Number(p.get("year")) : undefined,
    month: p.get("month") ? Number(p.get("month")) : undefined,
    day: p.get("day") ? Number(p.get("day")) : undefined,
    camera: p.get("camera") || undefined,
    ext: p.get("ext") || undefined,
    folder: p.has("folder") ? p.get("folder") ?? "" : undefined,
  });

  const rows = await prisma.photo.findMany({
    where,
    orderBy: [{ takenAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  return ok({
    photos: page.map(photoDTO),
    nextCursor: hasMore ? page[page.length - 1].id : null,
  });
});
