import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { verifyPath, ensureThumbnail, clampThumbSize } from "@/lib/media";

// Return a generated WebP thumbnail for a video library item. Supports
// ?size=200|400|800 (cached per size) and ?t=<sec> for a hover-preview frame.
export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { id } = await ctx.params;
  const url = new URL(req.url);
  const size = clampThumbSize(Number(url.searchParams.get("size")) || 400);
  const atParam = Number(url.searchParams.get("t"));
  const atSec = Number.isFinite(atParam) && atParam > 0 ? atParam : undefined;

  const item = await prisma.libraryItem.findUnique({ where: { id } });
  if (!item || item.type !== "video") return new Response("Not found", { status: 404 });

  const filePath = verifyPath(item.path);
  if (!filePath) return new Response("File unavailable", { status: 404 });

  const thumb = await ensureThumbnail(id, filePath, { size, durationSec: item.duration, atSec });
  if (!thumb || !fs.existsSync(thumb)) return new Response("No thumbnail", { status: 404 });

  const contentType = path.extname(thumb).toLowerCase() === ".webp" ? "image/webp" : "image/jpeg";
  const nodeStream = fs.createReadStream(thumb);
  const webStream = Readable.toWeb(nodeStream) as ReadableStream;
  return new Response(webStream, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      // Stable per (id, size, t); cache aggressively in the browser.
      "Cache-Control": "public, max-age=2592000",
    },
  });
}
