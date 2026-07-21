import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, fail, withAuth } from "@/lib/api";
import { refreshMetadata, editMetadata } from "@/lib/metadata";

// Refresh metadata for an item from TMDB/OMDb.
export const POST = withAuth(async (_req, _user, ctx) => {
  const { id } = await ctx.params;
  const item = await prisma.libraryItem.findUnique({ where: { id } });
  if (!item) return fail("Not found.", 404);

  try {
    const meta = await refreshMetadata(id);
    if (!meta) return fail("No metadata match found for this title.", 404);
    return ok(meta);
  } catch (e) {
    return fail(String((e as Error)?.message || "Metadata lookup failed."), 400);
  }
});

const editSchema = z.object({
  title: z.string().max(500).optional(),
  overview: z.string().max(5000).optional(),
  tagline: z.string().max(500).optional(),
  year: z.number().int().nullable().optional(),
  runtime: z.number().int().nullable().optional(),
  rating: z.number().nullable().optional(),
  genres: z.array(z.string().max(60)).max(30).optional(),
  director: z.string().max(300).optional(),
  studio: z.string().max(300).optional(),
  poster: z.string().url().max(1000).optional(),
  collection: z.string().max(300).optional(),
});

// Manually edit metadata fields.
export const PATCH = withAuth(async (req, _user, ctx) => {
  const { id } = await ctx.params;
  const item = await prisma.libraryItem.findUnique({ where: { id } });
  if (!item) return fail("Not found.", 404);

  const parsed = editSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Invalid metadata edit.");

  const meta = await editMetadata(id, parsed.data);
  return ok(meta);
});
