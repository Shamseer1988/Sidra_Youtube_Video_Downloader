import { prisma } from "@/lib/prisma";
import { ok, fail, withAuth } from "@/lib/api";

// Update per-user state for a library item: favorite / watchLater / liked
// toggles, and playback position ("continue watching").
export const PATCH = withAuth(async (req, user, ctx) => {
  const { id } = await ctx.params;
  const item = await prisma.libraryItem.findUnique({ where: { id } });
  if (!item) return fail("Not found.", 404);

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (typeof body.favorite === "boolean") data.favorite = body.favorite;
  if (typeof body.watchLater === "boolean") data.watchLater = body.watchLater;
  if (typeof body.liked === "boolean") data.liked = body.liked;
  if (typeof body.position === "number") {
    data.position = Math.max(0, body.position);
    data.playedAt = new Date();
    if (item.duration && body.position >= item.duration * 0.95) data.finished = true;
    else if (body.position > 0) data.finished = false;
  }
  if (typeof body.finished === "boolean") data.finished = body.finished;

  const state = await prisma.userMediaState.upsert({
    where: { userId_itemId: { userId: user.id, itemId: id } },
    update: data,
    create: { userId: user.id, itemId: id, ...data },
  });

  return ok({
    favorite: state.favorite,
    watchLater: state.watchLater,
    liked: state.liked,
    position: state.position,
    finished: state.finished,
  });
});
