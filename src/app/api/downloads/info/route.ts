import { ok, fail, withAuth } from "@/lib/api";
import { extractInfo, isValidUrl } from "@/lib/downloader";

// Extract video/playlist metadata + available formats without downloading.
export const POST = withAuth(async (req) => {
  const body = await req.json().catch(() => ({}));
  const url = String(body.url || "").trim();
  if (!isValidUrl(url)) return fail("Please enter a valid http(s) URL.");
  try {
    const info = await extractInfo(url);
    return ok(info);
  } catch (e: any) {
    return fail(e?.message || "Could not fetch info for this URL.", 502);
  }
});
