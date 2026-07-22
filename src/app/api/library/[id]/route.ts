import fs from "node:fs/promises";
import { prisma } from "@/lib/prisma";
import { ok, fail, withAuth } from "@/lib/api";
import { verifyPath } from "@/lib/media";
import { toStored } from "@/lib/metadata";

// Fetch a single library item with the current user's state and metadata.
export const GET = withAuth(async (_req, user, ctx) => {
  const { id } = await ctx.params;
  const it = await prisma.libraryItem.findUnique({
    where: { id },
    include: { states: { where: { userId: user.id } }, metadata: true },
  });
  if (!it) return fail("Not found.", 404);
  const st = it.states[0];
  const { states, metadata, path: _p, ...rest } = it;
  return ok({
    ...rest,
    state: {
      favorite: st?.favorite ?? false,
      watchLater: st?.watchLater ?? false,
      liked: st?.liked ?? false,
      position: st?.position ?? 0,
      finished: st?.finished ?? false,
    },
    metadata: metadata ? toStored(metadata) : null,
  });
});

// Delete a library item. Removes the file from disk only for items the
// app downloaded (never touches original NAS files) — admins may force.
export const DELETE = withAuth(async (_req, user, ctx) => {
  const { id } = await ctx.params;
  const it = await prisma.libraryItem.findUnique({ where: { id } });
  if (!it) return fail("Not found.", 404);

  const canDeleteFile = it.source === "download" && (user.role === "admin" || it.addedById === user.id);
  if (canDeleteFile) {
    const safe = verifyPath(it.path);
    if (safe) await fs.unlink(safe).catch(() => {});
  }
  await prisma.libraryItem.delete({ where: { id } });
  return ok({ removedFile: canDeleteFile });
});
