import { ok, withAdmin } from "@/lib/api";
import { browse } from "@/lib/libraries";

// Admin folder picker: list subdirectories within the mounted browse roots.
export const GET = withAdmin(async (req) => {
  const dir = new URL(req.url).searchParams.get("path") || undefined;
  return ok(await browse(dir));
});
