import { prisma } from "@/lib/prisma";
import { ok, fail, withAuth } from "@/lib/api";
import { queue } from "@/lib/downloader";

// Cancel (if running) and delete a download record.
export const DELETE = withAuth(async (_req, user, ctx) => {
  const { id } = await ctx.params;
  const dl = await prisma.download.findUnique({ where: { id } });
  if (!dl || dl.userId !== user.id) return fail("Download not found.", 404);

  queue.cancel(id);
  await prisma.download.delete({ where: { id } });
  return ok(null);
});

// Retry a failed/canceled download.
export const POST = withAuth(async (_req, user, ctx) => {
  const { id } = await ctx.params;
  const dl = await prisma.download.findUnique({ where: { id } });
  if (!dl || dl.userId !== user.id) return fail("Download not found.", 404);

  await prisma.download.update({
    where: { id },
    data: { status: "queued", progress: 0, error: null },
  });
  queue.enqueue(id);
  return ok(null);
});
