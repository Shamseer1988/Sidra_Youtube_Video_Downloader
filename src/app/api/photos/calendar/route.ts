import { prisma } from "@/lib/prisma";
import { ok, withAuth } from "@/lib/api";

// Calendar facets: the list of years that have photos, and per-day counts
// for a chosen year (defaults to the most recent).
export const GET = withAuth(async (req) => {
  const url = new URL(req.url);
  const base = { archived: false, hidden: false, NOT: { takenYear: null } } as const;

  const years = await prisma.photo.groupBy({
    by: ["takenYear"],
    where: base,
    _count: { _all: true },
    orderBy: { takenYear: "desc" },
  });
  const yearList = years.map((y) => y.takenYear!).filter((y): y is number => y != null);

  const year = Number(url.searchParams.get("year")) || yearList[0] || new Date().getFullYear();

  const dayGroups = await prisma.photo.groupBy({
    by: ["takenMonth", "takenDay"],
    where: { ...base, takenYear: year },
    _count: { _all: true },
  });

  return ok({
    years: yearList,
    year,
    days: dayGroups
      .filter((d) => d.takenMonth != null && d.takenDay != null)
      .map((d) => ({ month: d.takenMonth!, day: d.takenDay!, count: d._count._all })),
  });
});
