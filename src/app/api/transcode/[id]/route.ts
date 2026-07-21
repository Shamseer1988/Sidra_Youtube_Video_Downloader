import { spawn } from "node:child_process";
import { Readable } from "node:stream";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { verifyPath } from "@/lib/media";
import { buildTranscodeArgs, ffmpegBin } from "@/lib/transcode";
import { getAppSettings } from "@/lib/app-settings";

export const dynamic = "force-dynamic";

/**
 * Live-transcode a library item to a browser-friendly stream at a chosen
 * resolution. `?height=720&start=42` transcodes 720p starting at 42s.
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { id } = await ctx.params;
  const url = new URL(req.url);
  const height = Math.min(2160, Math.max(240, Number(url.searchParams.get("height")) || 720));
  const startSec = Math.max(0, Number(url.searchParams.get("start")) || 0);
  const audioParam = url.searchParams.get("audio");
  const audioIndex = audioParam !== null && audioParam !== "" ? Math.max(0, Number(audioParam) || 0) : null;

  const item = await prisma.libraryItem.findUnique({ where: { id } });
  if (!item || item.type !== "video") return new Response("Not found", { status: 404 });

  const filePath = verifyPath(item.path);
  if (!filePath) return new Response("File unavailable", { status: 404 });

  const { hwAccel } = await getAppSettings();
  const args = buildTranscodeArgs({ input: filePath, height, startSec, hwAccel, audioIndex });

  const ff = spawn(ffmpegBin(), args, { stdio: ["ignore", "pipe", "pipe"] });
  ff.stderr.on("data", () => {}); // drain to avoid backpressure stalls

  // Kill ffmpeg if the client goes away (tab closed, seek, quality change).
  const abort = () => {
    if (!ff.killed) ff.kill("SIGKILL");
  };
  req.signal.addEventListener("abort", abort);
  ff.on("close", () => req.signal.removeEventListener("abort", abort));

  const webStream = Readable.toWeb(ff.stdout) as ReadableStream;

  return new Response(webStream, {
    status: 200,
    headers: {
      "Content-Type": "video/mp4",
      "Cache-Control": "no-store, no-cache",
      "Accept-Ranges": "none",
    },
  });
}
