import { prisma } from "@/lib/prisma";
import { ok, withAuth } from "@/lib/api";

// Distinct photo folders with counts — the client builds the folder tree
// from these (cheap: folder strings only, not photos).
export const GET = withAuth(async () => {
  const groups = await prisma.photo.groupBy({
    by: ["folder"],
    where: { archived: false, hidden: false },
    _count: { _all: true },
  });
  return ok(groups.map((g) => ({ folder: g.folder, count: g._count._all })));
});
