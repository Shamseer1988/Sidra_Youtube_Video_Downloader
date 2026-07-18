import { prisma } from "@/lib/prisma";
import { ok, fail, withAuth } from "@/lib/api";

async function owned(id: string, userId: string) {
  const pl = await prisma.playlist.findUnique({ where: { id } });
  return pl && pl.userId === userId ? pl : null;
}

// Get a playlist with its items (in order) and each item's state.
export const GET = withAuth(async (_req, user, ctx) => {
  const { id } = await ctx.params;
  if (!(await owned(id, user.id))) return fail("Not found.", 404);

  const pl = await prisma.playlist.findUnique({
    where: { id },
    include: {
      items: {
        orderBy: { order: "asc" },
        include: { item: { include: { states: { where: { userId: user.id } } } } },
      },
    },
  });
  if (!pl) return fail("Not found.", 404);

  return ok({
    id: pl.id,
    name: pl.name,
    items: pl.items.map((pi) => {
      const { path: _p, states, ...rest } = pi.item;
      const st = states[0];
      return {
        playlistItemId: pi.id,
        order: pi.order,
        ...rest,
        state: {
          favorite: st?.favorite ?? false,
          watchLater: st?.watchLater ?? false,
          liked: st?.liked ?? false,
          position: st?.position ?? 0,
          finished: st?.finished ?? false,
        },
      };
    }),
  });
});

// Rename a playlist.
export const PATCH = withAuth(async (req, user, ctx) => {
  const { id } = await ctx.params;
  if (!(await owned(id, user.id))) return fail("Not found.", 404);
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  if (!name) return fail("Name is required.");
  const pl = await prisma.playlist.update({ where: { id }, data: { name } });
  return ok(pl);
});

// Delete a playlist.
export const DELETE = withAuth(async (_req, user, ctx) => {
  const { id } = await ctx.params;
  if (!(await owned(id, user.id))) return fail("Not found.", 404);
  await prisma.playlist.delete({ where: { id } });
  return ok(null);
});
