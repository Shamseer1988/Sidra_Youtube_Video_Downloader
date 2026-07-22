import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { verifyPhotoPath, ensurePhotoThumbnail, clampPhotoThumb } from "@/lib/photos";

// WebP thumbnail for a photo. ?size=200|400|1200 (cached per size).
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { id } = await ctx.params;
  const url = new URL(req.url);
  const size = clampPhotoThumb(Number(url.searchParams.get("size")) || 400);

  const photo = await prisma.photo.findUnique({ where: { id } });
  if (!photo) return new Response("Not found", { status: 404 });

  const filePath = verifyPhotoPath(photo.path);
  if (!filePath) return new Response("File unavailable", { status: 404 });

  const thumb = await ensurePhotoThumbnail(id, filePath, size);
  if (!thumb || !fs.existsSync(thumb)) return new Response("No thumbnail", { status: 404 });

  const contentType = path.extname(thumb).toLowerCase() === ".webp" ? "image/webp" : "image/jpeg";
  const webStream = Readable.toWeb(fs.createReadStream(thumb)) as ReadableStream;
  return new Response(webStream, {
    status: 200,
    headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=2592000" },
  });
}
