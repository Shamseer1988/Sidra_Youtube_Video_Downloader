import { spawn } from "node:child_process";
import { Readable } from "node:stream";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { verifyPath, listTracks } from "@/lib/media";
import { ffmpegBin } from "@/lib/transcode";

export const dynamic = "force-dynamic";

/**
 * Serve a subtitle track as WebVTT for the <track> element. `?track=<n>`
 * selects the Nth entry from listTracks (embedded stream or external
 * sidecar). `?offset=<sec>` rebases cue timestamps to match a transcode that
 * started at that offset, keeping subtitles in sync after a seek.
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { id } = await ctx.params;
  const url = new URL(req.url);
  const track = Math.max(0, Number(url.searchParams.get("track")) || 0);
  const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);

  const item = await prisma.libraryItem.findUnique({ where: { id } });
  if (!item || item.type !== "video") return new Response("Not found", { status: 404 });

  const filePath = verifyPath(item.path);
  if (!filePath) return new Response("File unavailable", { status: 404 });

  const { subtitles } = await listTracks(filePath);
  const sub = subtitles[track];
  if (!sub) return new Response("No such subtitle track", { status: 404 });

  const input = sub.source === "external" && sub.path ? sub.path : filePath;
  const args = ["-hide_banner", "-loglevel", "error"];
  if (offset > 0) args.push("-ss", String(offset));
  args.push("-i", input);
  if (sub.source === "embedded" && typeof sub.streamIndex === "number") {
    args.push("-map", `0:s:${sub.streamIndex}`);
  }
  args.push("-f", "webvtt", "pipe:1");

  const ff = spawn(ffmpegBin(), args, { stdio: ["ignore", "pipe", "pipe"] });
  ff.stderr.on("data", () => {});
  const abort = () => {
    if (!ff.killed) ff.kill("SIGKILL");
  };
  req.signal.addEventListener("abort", abort);
  ff.on("close", () => req.signal.removeEventListener("abort", abort));

  const webStream = Readable.toWeb(ff.stdout) as ReadableStream;
  return new Response(webStream, {
    status: 200,
    headers: {
      "Content-Type": "text/vtt; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
