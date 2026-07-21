import { ok, fail, withAdmin } from "@/lib/api";
import { removeLibrary } from "@/lib/libraries";

// Admin: remove a library. Its indexed items are cascade-deleted.
export const DELETE = withAdmin(async (_req, _user, ctx) => {
  const { id } = await ctx.params;
  const result = await removeLibrary(id);
  if (!result.ok) return fail(result.message || "Library not found", 404);
  return ok({ id });
});
