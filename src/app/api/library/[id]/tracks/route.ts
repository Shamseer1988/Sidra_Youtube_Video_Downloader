import { prisma } from "@/lib/prisma";
import { ok, fail, withAuth } from "@/lib/api";
import { verifyPath, listTracks } from "@/lib/media";

// List selectable audio + subtitle tracks for a video item. Absolute sidecar
// paths are stripped — the client references tracks by id only.
export const GET = withAuth(async (_req, _user, ctx) => {
  const { id } = await ctx.params;
  const item = await prisma.libraryItem.findUnique({ where: { id } });
  if (!item || item.type !== "video") return fail("Not found.", 404);

  const filePath = verifyPath(item.path);
  if (!filePath) return fail("File unavailable.", 404);

  const { audio, subtitles } = await listTracks(filePath);
  return ok({
    audio,
    subtitles: subtitles.map(({ id: sid, label, language, source }) => ({
      id: sid,
      label,
      language,
      source,
    })),
  });
});
