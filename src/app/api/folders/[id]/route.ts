import { ok, fail, withAdmin } from "@/lib/api";
import { removeFolder } from "@/lib/folders";

// Unregister a media folder (admin only). Files on disk are never touched;
// indexed items under it disappear after the next scan prune.
export const DELETE = withAdmin(async (_req, _user, ctx) => {
  const { id } = await ctx.params;
  try {
    await removeFolder(id);
    return ok(null);
  } catch {
    return fail("Folder not found.", 404);
  }
});
