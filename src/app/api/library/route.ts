import { prisma } from "@/lib/prisma";
import { ok, withAuth } from "@/lib/api";
import type { Prisma } from "@prisma/client";

// List library items (downloaded + NAS) with the current user's state.
export const GET = withAuth(async (req, user) => {
  const url = new URL(req.url);
  const type = url.searchParams.get("type") || undefined; // video | audio
  const source = url.searchParams.get("source") || undefined; // download | nas
  const category = url.searchParams.get("category") || undefined;
  const libraryId = url.searchParams.get("libraryId") || undefined;
  const q = url.searchParams.get("q")?.trim();
  const filter = url.searchParams.get("filter"); // favorites | watchLater | continue
  const sort = url.searchParams.get("sort") || "recent";
  const limit = Math.min(Number(url.searchParams.get("limit") || 200), 2000);

  const where: Prisma.LibraryItemWhereInput = {};
  if (type) where.type = type;
  if (source) where.source = source;
  if (category) where.category = category;
  if (libraryId) where.libraryId = libraryId;
  if (q) where.title = { contains: q };

  if (filter === "favorites") where.states = { some: { userId: user.id, favorite: true } };
  if (filter === "watchLater") where.states = { some: { userId: user.id, watchLater: true } };
  if (filter === "continue")
    where.states = { some: { userId: user.id, position: { gt: 0 }, finished: false } };

  let orderBy: Prisma.LibraryItemOrderByWithRelationInput = { mtime: "desc" };
  if (sort === "title") orderBy = { title: "asc" };
  if (sort === "size") orderBy = { size: "desc" };
  if (sort === "added") orderBy = { createdAt: "desc" };

  const items = await prisma.libraryItem.findMany({
    where,
    orderBy,
    take: limit,
    include: { states: { where: { userId: user.id } } },
  });

  const shaped = items.map((it) => {
    const st = it.states[0];
    const { states, path: _p, ...rest } = it;
    return {
      ...rest,
      state: {
        favorite: st?.favorite ?? false,
        watchLater: st?.watchLater ?? false,
        liked: st?.liked ?? false,
        position: st?.position ?? 0,
        finished: st?.finished ?? false,
      },
    };
  });

  return ok(shaped);
});
