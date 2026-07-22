import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, fail, withAuth } from "@/lib/api";
import { isUnlocked } from "@/lib/albums";
import { photoDTO } from "@/lib/photos";

// List photos in an album (cursor-paginated). Protected albums require the
// correct password via ?pw= (soft gate).
export const GET = withAuth(async (req, user, ctx) => {
  const { id } = await ctx.params;
  const url = new URL(req.url);
  const album = await prisma.album.findUnique({ where: { id } });
  if (!album) return fail("Not found.", 404);
  if (album.isPrivate && album.ownerId !== user.id) return fail("Not found.", 404);

  if (!(await isUnlocked(id, url.searchParams.get("pw")))) {
    return fail("This album is locked.", 401);
  }

  const limit = Math.min(Number(url.searchParams.get("limit") || 120), 500);
  const cursor = url.searchParams.get("cursor") || undefined;

  const links = await prisma.albumPhoto.findMany({
    where: { albumId: id },
    orderBy: [{ addedAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: { photo: true },
  });

  const hasMore = links.length > limit;
  const page = hasMore ? links.slice(0, limit) : links;
  return ok({
    photos: page.map((l) => photoDTO(l.photo)),
    nextCursor: hasMore ? page[page.length - 1].id : null,
  });
});

const bodySchema = z.object({ photoIds: z.array(z.string()).min(1).max(1000) });

// Add photos to an album (owner only).
export const POST = withAuth(async (req, user, ctx) => {
  const { id } = await ctx.params;
  const album = await prisma.album.findUnique({ where: { id } });
  if (!album) return fail("Not found.", 404);
  if (album.ownerId !== user.id) return fail("Forbidden — not your album", 403);

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Invalid request");

  // SQLite's createMany has no skipDuplicates — filter what's already linked.
  const existing = await prisma.albumPhoto.findMany({
    where: { albumId: id, photoId: { in: parsed.data.photoIds } },
    select: { photoId: true },
  });
  const have = new Set(existing.map((e) => e.photoId));
  const toAdd = parsed.data.photoIds.filter((pid) => !have.has(pid));
  if (toAdd.length) {
    await prisma.albumPhoto.createMany({ data: toAdd.map((photoId) => ({ albumId: id, photoId })) });
  }
  const count = await prisma.albumPhoto.count({ where: { albumId: id } });
  return ok({ added: toAdd.length, count });
});

// Remove photos from an album (owner only).
export const DELETE = withAuth(async (req, user, ctx) => {
  const { id } = await ctx.params;
  const album = await prisma.album.findUnique({ where: { id } });
  if (!album) return fail("Not found.", 404);
  if (album.ownerId !== user.id) return fail("Forbidden — not your album", 403);

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Invalid request");

  await prisma.albumPhoto.deleteMany({ where: { albumId: id, photoId: { in: parsed.data.photoIds } } });
  const count = await prisma.albumPhoto.count({ where: { albumId: id } });
  return ok({ removed: parsed.data.photoIds.length, count });
});
