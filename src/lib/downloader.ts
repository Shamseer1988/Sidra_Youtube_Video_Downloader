import "server-only";
import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { config } from "./config";
import { prisma } from "./prisma";
import { registerDownloadedFile, ensureThumbnail } from "./media";

// ── Platform detection ──────────────────────────────────────────────

export function detectPlatform(url: string): string {
  const u = url.toLowerCase();
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube";
  if (u.includes("vimeo.com")) return "vimeo";
  if (u.includes("instagram.com")) return "instagram";
  if (u.includes("facebook.com") || u.includes("fb.watch")) return "facebook";
  if (u.includes("twitter.com") || u.includes("x.com")) return "twitter";
  if (u.includes("tiktok.com")) return "tiktok";
  if (u.includes("soundcloud.com")) return "soundcloud";
  if (u.includes("dailymotion.com")) return "dailymotion";
  return "other";
}

export function isValidUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

// ── Info extraction (no download) ───────────────────────────────────

export interface VideoFormat {
  formatId: string;
  ext: string;
  resolution: string | null;
  fps: number | null;
  filesize: number | null;
  vcodec: string | null;
  acodec: string | null;
  note: string | null;
}

export interface VideoInfo {
  title: string;
  thumbnail: string | null;
  description: string | null;
  duration: number | null;
  uploader: string | null;
  platform: string;
  isPlaylist: boolean;
  playlistCount: number;
  formats: VideoFormat[];
}

function runJson(args: string[]): Promise<any> {
  return new Promise((resolve, reject) => {
    let out = "";
    let err = "";
    const child = spawn(config.ytdlpPath, args, { stdio: ["ignore", "pipe", "pipe"] });
    child.stdout.on("data", (d) => (out += d.toString()));
    child.stderr.on("data", (d) => (err += d.toString()));
    child.on("error", (e) => reject(e));
    child.on("close", (code) => {
      if (code !== 0) return reject(new Error(err.trim() || `yt-dlp exited ${code}`));
      try {
        resolve(JSON.parse(out.trim().split("\n")[0]));
      } catch (e) {
        reject(new Error("Could not parse video info"));
      }
    });
  });
}

export async function extractInfo(url: string): Promise<VideoInfo> {
  const raw = await runJson([
    "--dump-single-json",
    "--no-warnings",
    "--flat-playlist",
    url,
  ]);

  const isPlaylist = raw._type === "playlist" || Array.isArray(raw.entries);

  // For a single video we want real formats; the flat call above returns
  // limited data, so re-probe a single video for its formats.
  let formats: VideoFormat[] = [];
  if (!isPlaylist) {
    const full = await runJson(["--dump-single-json", "--no-warnings", "--no-playlist", url]);
    formats = parseFormats(full.formats || []);
    return {
      title: full.title || "Untitled",
      thumbnail: full.thumbnail || null,
      description: full.description || null,
      duration: full.duration ?? null,
      uploader: full.uploader || null,
      platform: detectPlatform(url),
      isPlaylist: false,
      playlistCount: 1,
      formats,
    };
  }

  return {
    title: raw.title || "Untitled Playlist",
    thumbnail: raw.thumbnails?.[0]?.url || null,
    description: raw.description || null,
    duration: null,
    uploader: raw.uploader || null,
    platform: detectPlatform(url),
    isPlaylist: true,
    playlistCount: (raw.entries || []).length,
    formats: [],
  };
}

function parseFormats(raw: any[]): VideoFormat[] {
  return raw
    .filter((f) => !(f.vcodec === "none" && f.acodec === "none"))
    .map((f) => ({
      formatId: f.format_id,
      ext: f.ext,
      resolution: f.resolution || (f.width && f.height ? `${f.width}x${f.height}` : null),
      fps: f.fps ?? null,
      filesize: f.filesize ?? f.filesize_approx ?? null,
      vcodec: f.vcodec ?? null,
      acodec: f.acodec ?? null,
      note: f.format_note ?? null,
    }));
}

// ── Download queue (in-process, replaces Celery) ────────────────────

interface LiveProgress {
  progress: number;
  speed: string | null;
  eta: string | null;
}

class DownloadQueue {
  private waiting: string[] = [];
  private active = new Set<string>();
  private procs = new Map<string, ChildProcess>();
  live = new Map<string, LiveProgress>();
  concurrency = Number(process.env.MAX_CONCURRENT_DOWNLOADS || 2);

  enqueue(id: string) {
    if (this.active.has(id) || this.waiting.includes(id)) return;
    this.waiting.push(id);
    this.pump();
  }

  cancel(id: string): boolean {
    this.waiting = this.waiting.filter((x) => x !== id);
    const proc = this.procs.get(id);
    if (proc) {
      proc.kill("SIGKILL");
      this.procs.delete(id);
      return true;
    }
    return false;
  }

  private pump() {
    while (this.active.size < this.concurrency && this.waiting.length > 0) {
      const id = this.waiting.shift()!;
      void this.run(id);
    }
  }

  private async run(id: string) {
    this.active.add(id);
    try {
      await this.execute(id);
    } catch (e: any) {
      await prisma.download
        .update({ where: { id }, data: { status: "failed", error: String(e?.message || e).slice(0, 1000) } })
        .catch(() => {});
    } finally {
      this.active.delete(id);
      this.live.delete(id);
      this.procs.delete(id);
      this.pump();
    }
  }

  private async execute(id: string) {
    const dl = await prisma.download.findUnique({ where: { id } });
    if (!dl) return;

    const outDir = dl.mediaType === "audio" ? config.downloadAudioPath : config.downloadVideoPath;
    await fsp.mkdir(outDir, { recursive: true });

    const outtmpl = path.join(outDir, "%(title).200B [%(id)s].%(ext)s");

    const args: string[] = [
      dl.url,
      "-o", outtmpl,
      "--no-playlist",
      "--newline",
      "--no-color",
      "--no-warnings",
      "--progress-template", "PROG %(progress._percent_str)s|%(progress._speed_str)s|%(progress._eta_str)s",
      "--print", "after_move:FINAL:%(filepath)s",
      "--no-simulate",
    ];

    if (dl.mediaType === "audio") {
      args.push("-x", "--audio-format", "mp3", "--audio-quality", "0", "--embed-metadata");
    } else {
      const fmt = dl.formatId && dl.formatId !== "best" ? dl.formatId : "bv*+ba/b";
      args.push("-f", fmt, "--merge-output-format", "mp4");
    }

    await prisma.download.update({ where: { id }, data: { status: "downloading", progress: 0, error: null } });
    this.live.set(id, { progress: 0, speed: null, eta: null });

    const finalPaths: string[] = [];
    let lastWrite = 0;
    let stderr = "";

    await new Promise<void>((resolve, reject) => {
      const child = spawn(config.ytdlpPath, args, { stdio: ["ignore", "pipe", "pipe"] });
      this.procs.set(id, child);

      let buffer = "";
      const handleLine = (line: string) => {
        line = line.trim();
        if (line.startsWith("PROG ")) {
          const body = line.slice(5);
          const [pctRaw, speed, eta] = body.split("|");
          const pct = parseFloat((pctRaw || "").replace("%", "").trim());
          const progress = Number.isFinite(pct) ? pct : 0;
          this.live.set(id, {
            progress,
            speed: speed?.trim() || null,
            eta: eta?.trim() || null,
          });
          const now = Date.now();
          if (now - lastWrite > 900) {
            lastWrite = now;
            prisma.download
              .update({ where: { id }, data: { progress, speed: speed?.trim() || null, eta: eta?.trim() || null } })
              .catch(() => {});
          }
        } else if (line.startsWith("FINAL:")) {
          finalPaths.push(line.slice(6).trim());
        }
      };

      child.stdout.on("data", (d) => {
        buffer += d.toString();
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const l of lines) handleLine(l);
      });
      child.stderr.on("data", (d) => {
        stderr += d.toString();
      });
      child.on("error", (e) => reject(e));
      child.on("close", (code) => {
        if (buffer) handleLine(buffer);
        if (code === 0) resolve();
        else reject(new Error(stderr.trim().split("\n").slice(-3).join(" ") || `yt-dlp exited ${code}`));
      });
    });

    // Resolve the produced file.
    let filePath = finalPaths[finalPaths.length - 1] || null;
    if (filePath && !fs.existsSync(filePath) && dl.mediaType === "audio") {
      const mp3 = filePath.replace(/\.[^.]+$/, ".mp3");
      if (fs.existsSync(mp3)) filePath = mp3;
    }
    if (!filePath || !fs.existsSync(filePath)) {
      throw new Error("Download finished but output file was not found");
    }

    const size = fs.statSync(filePath).size;
    const libraryId = await registerDownloadedFile(filePath, dl.mediaType as "video" | "audio", dl.userId);
    if (libraryId && dl.mediaType === "video") {
      ensureThumbnail(libraryId, filePath).catch(() => {});
    }

    await prisma.download.update({
      where: { id },
      data: {
        status: "completed",
        progress: 100,
        speed: null,
        eta: null,
        filePath,
        fileSize: BigInt(size),
        libraryId,
        completedAt: new Date(),
      },
    });
  }
}

// Singleton across HMR / route invocations.
const globalForQueue = globalThis as unknown as { downloadQueue?: DownloadQueue };
export const queue = globalForQueue.downloadQueue ?? new DownloadQueue();
if (!globalForQueue.downloadQueue) globalForQueue.downloadQueue = queue;
