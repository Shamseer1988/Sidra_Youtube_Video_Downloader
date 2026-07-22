import { prisma } from "@/lib/prisma";
import { ok, fail, withAuth } from "@/lib/api";
import { saveEditedPhoto } from "@/lib/photos";

export const dynamic = "force-dynamic";

// Save an edited copy of a photo (non-destructive). Body is multipart/form-data
// with `file` (the rendered image) plus optional width/height.
export const POST = withAuth(async (req, _user, ctx) => {
  const { id } = await ctx.params;
  const original = await prisma.photo.findUnique({ where: { id } });
  if (!original) return fail("Not found.", 404);

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return fail("Missing edited image");
  if (file.size > 50 * 1024 * 1024) return fail("Edited image too large");

  const type = file.type || "image/jpeg";
  const ext = type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg";
  const width = Number(form?.get("width")) || undefined;
  const height = Number(form?.get("height")) || undefined;

  const buffer = Buffer.from(await file.arrayBuffer());
  const created = await saveEditedPhoto(id, buffer, { ext, width, height });
  if (!created) return fail("Could not save edit", 500);

  return ok(created, { status: 201 });
});
