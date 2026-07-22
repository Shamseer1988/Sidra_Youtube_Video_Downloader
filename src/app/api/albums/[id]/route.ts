import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, fail, withAuth } from "@/lib/api";
import { toAlbumDTO, hashAlbumPassword } from "@/lib/albums";

// Album details + ancestor breadcrumb. Private albums are owner-only.
export const GET = withAuth(async (_req, user, ctx) => {
  const { id } = await ctx.params;
  const album = await prisma.album.findUnique({
    where: { id },
    include: { _count: { select: { photos: true, children: true } } },
  });
  if (!album) return fail("Not found.", 404);
  if (album.isPrivate && album.ownerId !== user.id) return fail("Not found.", 404);

  // Build the breadcrumb up the parent chain.
  const crumbs: { id: string; name: string }[] = [];
  let cursor = album.parentId;
  while (cursor) {
    const p = await prisma.album.findUnique({ where: { id: cursor }, select: { id: true, name: true, parentId: true } });
    if (!p) break;
    crumbs.unshift({ id: p.id, name: p.name });
    cursor = p.parentId;
  }

  return ok({ ...(await toAlbumDTO(album, user.id)), breadcrumb: crumbs });
});

const patchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  coverPhotoId: z.string().nullable().optional(),
  favorite: z.boolean().optional(),
  pinned: z.boolean().optional(),
  isPrivate: z.boolean().optional(),
  parentId: z.string().nullable().optional(),
  password: z.string().max(200).nullable().optional(), // "" or null clears
});

// Owner-only updates: rename, cover, flags, move, password.
export const PATCH = withAuth(async (req, user, ctx) => {
  const { id } = await ctx.params;
  const album = await prisma.album.findUnique({ where: { id } });
  if (!album) return fail("Not found.", 404);
  if (album.ownerId !== user.id) return fail("Forbidden — not your album", 403);

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Invalid request");
  const d = parsed.data;

  if (d.parentId) {
    if (d.parentId === id) return fail("An album cannot contain itself");
    const parent = await prisma.album.findUnique({ where: { id: d.parentId } });
    if (!parent || parent.ownerId !== user.id) return fail("Invalid parent album");
  }

  const data: Record<string, unknown> = {};
  if (d.name !== undefined) data.name = d.name.trim();
  if (d.coverPhotoId !== undefined) data.coverPhotoId = d.coverPhotoId;
  if (d.favorite !== undefined) data.favorite = d.favorite;
  if (d.pinned !== undefined) data.pinned = d.pinned;
  if (d.isPrivate !== undefined) data.isPrivate = d.isPrivate;
  if (d.parentId !== undefined) data.parentId = d.parentId;
  if (d.password !== undefined) data.passwordHash = d.password ? await hashAlbumPassword(d.password) : null;

  const updated = await prisma.album.update({
    where: { id },
    data,
    include: { _count: { select: { photos: true, children: true } } },
  });
  return ok(await toAlbumDTO(updated, user.id));
});

export const DELETE = withAuth(async (_req, user, ctx) => {
  const { id } = await ctx.params;
  const album = await prisma.album.findUnique({ where: { id } });
  if (!album) return fail("Not found.", 404);
  if (album.ownerId !== user.id) return fail("Forbidden — not your album", 403);
  await prisma.album.delete({ where: { id } });
  return ok({ removed: true });
});
