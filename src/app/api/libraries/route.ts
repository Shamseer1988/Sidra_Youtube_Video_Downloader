import { z } from "zod";
import { ok, fail, withAuth, withAdmin } from "@/lib/api";
import { addLibrary, listLibraries } from "@/lib/libraries";

// List registered libraries (optionally filtered by category).
export const GET = withAuth(async (req) => {
  const category = new URL(req.url).searchParams.get("category") || undefined;
  return ok(await listLibraries(category));
});

const addSchema = z.object({
  name: z.string().default(""),
  folderPath: z.string().min(1),
  category: z.enum(["movies", "tv", "videos", "music"]),
});

// Admin: register a NAS subfolder as a categorized library.
export const POST = withAdmin(async (req) => {
  const body = addSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return fail("Choose a folder and category");
  const result = await addLibrary(body.data);
  if (!result.ok) return fail(result.message || "Could not add library");
  return ok(result.library);
});
