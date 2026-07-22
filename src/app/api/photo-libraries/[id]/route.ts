import { ok, fail, withAdmin } from "@/lib/api";
import { removePhotoLibrary } from "@/lib/photos";

export const DELETE = withAdmin(async (_req, _user, ctx) => {
  const { id } = await ctx.params;
  const result = await removePhotoLibrary(id);
  if (!result.ok) return fail(result.message || "Not found", 404);
  return ok({ removed: true });
});
