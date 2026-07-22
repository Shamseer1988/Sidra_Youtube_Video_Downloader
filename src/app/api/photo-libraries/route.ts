import { z } from "zod";
import { ok, fail, withAuth, withAdmin } from "@/lib/api";
import { listPhotoLibraries, addPhotoLibrary } from "@/lib/photos";

export const GET = withAuth(async () => {
  return ok(await listPhotoLibraries());
});

const addSchema = z.object({
  name: z.string().max(120).optional(),
  folderPath: z.string().min(1),
});

export const POST = withAdmin(async (req) => {
  const parsed = addSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Invalid request");
  const result = await addPhotoLibrary({
    name: parsed.data.name ?? "",
    folderPath: parsed.data.folderPath,
  });
  if (!result.ok) return fail(result.message || "Could not add library");
  return ok(result.library, { status: 201 });
});
