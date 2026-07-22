import fs from "node:fs";
import { Readable } from "node:stream";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { verifyPhotoPath, photoContentType } from "@/lib/photos";

// Serve the full-resolution original image (with range support), or force a
// download with ?download=1.
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { id } = await ctx.params;
  const photo = await prisma.photo.findUnique({ where: { id } });
  if (!photo) return new Response("Not found", { status: 404 });

  const filePath = verifyPhotoPath(photo.path);
  if (!filePath) return new Response("File unavailable", { status: 404 });

  const size = fs.statSync(filePath).size;
  const contentType = photoContentType(filePath);
  const download = new URL(req.url).searchParams.get("download") === "1";
  const disposition = download
    ? `attachment; filename="${encodeURIComponent(photo.filename)}"`
    : "inline";

  const range = req.headers.get("range");
  if (range) {
    const match = /bytes=(\d*)-(\d*)/.exec(range);
    if (match) {
      let start = match[1] ? parseInt(match[1], 10) : 0;
      let end = match[2] ? parseInt(match[2], 10) : size - 1;
      if (Number.isNaN(start)) start = 0;
      if (Number.isNaN(end) || end >= size) end = size - 1;
      if (start <= end && start < size) {
        const stream = Readable.toWeb(fs.createReadStream(filePath, { start, end })) as ReadableStream;
        return new Response(stream, {
          status: 206,
          headers: {
            "Content-Type": contentType,
            "Content-Range": `bytes ${start}-${end}/${size}`,
            "Accept-Ranges": "bytes",
            "Content-Length": String(end - start + 1),
            "Content-Disposition": disposition,
          },
        });
      }
    }
  }

  const webStream = Readable.toWeb(fs.createReadStream(filePath)) as ReadableStream;
  return new Response(webStream, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(size),
      "Accept-Ranges": "bytes",
      "Content-Disposition": disposition,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
