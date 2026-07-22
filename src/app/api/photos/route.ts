import { prisma } from "@/lib/prisma";
import { ok, withAuth } from "@/lib/api";
import { photoDTO } from "@/lib/photos";
import type { Prisma } from "@prisma/client";

// List photos newest-first (by capture time) with cursor pagination for
// infinite scrolling. Excludes archived/hidden unless explicitly requested.
export const GET = withAuth(async (req) => {
  const url = new URL(req.url);
  const libraryId = url.searchParams.get("libraryId") || undefined;
  const folder = url.searchParams.get("folder") ?? undefined;
  const favorite = url.searchParams.get("favorite") === "1";
  const scope = url.searchParams.get("scope"); // "archive" | "all"
  const limit = Math.min(Number(url.searchParams.get("limit") || 120), 500);
  const cursor = url.searchParams.get("cursor") || undefined;

  const where: Prisma.PhotoWhereInput = {};
  if (libraryId) where.libraryId = libraryId;
  if (folder !== undefined) where.folder = folder;
  if (favorite) where.favorite = true;
  if (scope === "archive") where.archived = true;
  else if (scope !== "all") where.archived = false;
  if (scope !== "all") where.hidden = false;

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
