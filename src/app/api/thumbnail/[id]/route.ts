import fs from "node:fs";
import { Readable } from "node:stream";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { verifyPath, ensureThumbnail } from "@/lib/media";

// Return a generated JPEG thumbnail for a video library item.
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { id } = await ctx.params;
  const item = await prisma.libraryItem.findUnique({ where: { id } });
  if (!item || item.type !== "video") return new Response("Not found", { status: 404 });

  const filePath = await verifyPath(item.path);
  if (!filePath) return new Response("File unavailable", { status: 404 });

  const thumb = await ensureThumbnail(id, filePath);
  if (!thumb || !fs.existsSync(thumb)) return new Response("No thumbnail", { status: 404 });

  const nodeStream = fs.createReadStream(thumb);
  const webStream = Readable.toWeb(nodeStream) as ReadableStream;
  return new Response(webStream, {
    status: 200,
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "private, max-age=86400",
    },
  });
}
