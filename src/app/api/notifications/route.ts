import { prisma } from "@/lib/prisma";
import { ok, withAuth } from "@/lib/api";

type Kind = "success" | "info" | "warning" | "error";

function ago(date: Date): string {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

/** Real activity feed derived from recent downloads. */
export const GET = withAuth(async (_req, user) => {
  const recent = await prisma.download.findMany({
    where: { userId: user.id, status: { in: ["completed", "failed"] } },
    orderBy: { completedAt: "desc" },
    take: 12,
  });

  const items = recent.map((d) => {
    const success = d.status === "completed";
    return {
      id: d.id,
      title: success ? "Download complete" : "Download failed",
      body: success ? d.title : `${d.title}: ${d.error || "unknown error"}`,
      time: ago(d.completedAt ?? d.createdAt),
      kind: (success ? "success" : "error") as Kind,
      libraryId: d.libraryId,
    };
  });

  return ok({ items, unread: items.length });
});
