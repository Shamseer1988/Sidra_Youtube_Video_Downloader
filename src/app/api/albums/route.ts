import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, fail, withAuth } from "@/lib/api";
import { listAlbums, toAlbumDTO, hashAlbumPassword } from "@/lib/albums";

// List albums under a parent (top-level when parentId is absent).
export const GET = withAuth(async (req, user) => {
  const parent = new URL(req.url).searchParams.get("parentId");
  const albums = await listAlbums(user.id, parent && parent !== "root" ? parent : null);
  return ok(albums);
});

const createSchema = z.object({
  name: z.string().min(1).max(200),
  parentId: z.string().nullable().optional(),
  isPrivate: z.boolean().optional(),
  password: z.string().min(1).max(200).optional(),
});

export const POST = withAuth(async (req, user) => {
  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Invalid request");
  const { name, parentId, isPrivate, password } = parsed.data;

  // A nested album must sit under an album the user owns.
  if (parentId) {
    const parent = await prisma.album.findUnique({ where: { id: parentId } });
    if (!parent || parent.ownerId !== user.id) return fail("Invalid parent album");
  }

  const created = await prisma.album.create({
    data: {
      ownerId: user.id,
      name: name.trim(),
      parentId: parentId ?? null,
      isPrivate: isPrivate ?? false,
      passwordHash: password ? await hashAlbumPassword(password) : null,
    },
    include: { _count: { select: { photos: true, children: true } } },
  });
  return ok(await toAlbumDTO(created, user.id), { status: 201 });
});
