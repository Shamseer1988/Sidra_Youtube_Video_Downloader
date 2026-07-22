import { ok, withAdmin } from "@/lib/api";
import { browsePhotos } from "@/lib/photos";

// Browse folders within the mounted photo roots (for the library picker).
export const GET = withAdmin(async (req) => {
  const dir = new URL(req.url).searchParams.get("dir") || undefined;
  return ok(await browsePhotos(dir));
});
