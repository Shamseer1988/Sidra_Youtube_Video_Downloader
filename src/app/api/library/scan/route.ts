import { ok, withAuth } from "@/lib/api";
import { scanLibrary } from "@/lib/media";

// Trigger a rescan of all configured media folders.
export const POST = withAuth(async () => {
  const result = await scanLibrary();
  return ok(result);
});
