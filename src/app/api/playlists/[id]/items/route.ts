import { prisma } from "@/lib/prisma";
import { ok, fail, withAuth } from "@/lib/api";

async function owned(id: string, userId: string) {
  const pl = await prisma.playlist.findUnique({ where: { id } });
  return pl && pl.userId === userId ? pl : null;
}

// Add an item to a playlist (appended to the end).
export const POST = withAuth(async (req, user, ctx) => {
  const { id } = await ctx.params;
  if (!(await owned(id, user.id))) return fail("Not found.", 404);

  const body = await req.json().catch(() => ({}));
  const itemId = String(body.itemId || "");
  const item = await prisma.libraryItem.findUnique({ where: { id: itemId } });
  if (!item) return fail("Media item not found.", 404);

  const last = await prisma.playlistItem.findFirst({
    where: { playlistId: id },
    orderBy: { order: "desc" },
  });

  try {
    const pi = await prisma.playlistItem.create({
      data: { playlistId: id, itemId, order: (last?.order ?? -1) + 1 },
    });
    await prisma.playlist.update({ where: { id }, data: { updatedAt: new Date() } });
    return ok(pi, { status: 201 });
  } catch {
    return fail("Item is already in this playlist.", 409);
  }
});

// Remove an item from a playlist.
export const DELETE = withAuth(async (req, user, ctx) => {
  const { id } = await ctx.params;
  if (!(await owned(id, user.id))) return fail("Not found.", 404);
  const body = await req.json().catch(() => ({}));
  const itemId = String(body.itemId || "");
  await prisma.playlistItem.deleteMany({ where: { playlistId: id, itemId } });
  return ok(null);
});
