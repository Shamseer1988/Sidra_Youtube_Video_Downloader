import { ok, fail, withAuth } from "@/lib/api";
import { scanPhotos } from "@/lib/photos";

export const dynamic = "force-dynamic";

// Trigger a photo library scan (index new/changed/removed photos).
export const POST = withAuth(async (_req, user) => {
  if (user.role !== "admin") return fail("Admin only", 403);
  const result = await scanPhotos();
  return ok(result);
});
