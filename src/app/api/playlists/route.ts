import { prisma } from "@/lib/prisma";
import { ok, fail, withAuth } from "@/lib/api";

// List the current user's playlists with item counts.
export const GET = withAuth(async (_req, user) => {
  const playlists = await prisma.playlist.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { items: true } } },
  });
  return ok(
    playlists.map((p) => ({
      id: p.id,
      name: p.name,
      count: p._count.items,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    })),
  );
});

// Create a playlist.
export const POST = withAuth(async (req, user) => {
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  if (!name) return fail("Playlist name is required.");
  const pl = await prisma.playlist.create({ data: { userId: user.id, name } });
  return ok(pl, { status: 201 });
});
