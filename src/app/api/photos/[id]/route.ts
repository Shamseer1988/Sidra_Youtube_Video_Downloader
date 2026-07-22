import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, fail, withAuth } from "@/lib/api";
import { photoDTO } from "@/lib/photos";

// Single photo (with EXIF details for the viewer info sidebar).
export const GET = withAuth(async (_req, _user, ctx) => {
  const { id } = await ctx.params;
  const photo = await prisma.photo.findUnique({ where: { id } });
  if (!photo) return fail("Not found.", 404);
  return ok(photoDTO(photo));
});

const patchSchema = z.object({
  favorite: z.boolean().optional(),
  archived: z.boolean().optional(),
  hidden: z.boolean().optional(),
  rating: z.number().int().min(0).max(5).optional(),
});

// Update organization flags for a photo.
export const PATCH = withAuth(async (req, _user, ctx) => {
  const { id } = await ctx.params;
  const photo = await prisma.photo.findUnique({ where: { id } });
  if (!photo) return fail("Not found.", 404);

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Invalid request");

  const updated = await prisma.photo.update({ where: { id }, data: parsed.data });
  return ok(photoDTO(updated));
});
