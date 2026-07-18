import { prisma } from "@/lib/prisma";
import { ok, fail, withAuth } from "@/lib/api";
import { detectPlatform, isValidUrl, extractInfo, queue } from "@/lib/downloader";

// List the current user's downloads, merging in live in-memory progress.
export const GET = withAuth(async (req, user) => {
  const url = new URL(req.url);
  const status = url.searchParams.get("status") || undefined;
  const mediaType = url.searchParams.get("mediaType") || undefined;

  const rows = await prisma.download.findMany({
    where: { userId: user.id, status, mediaType },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const merged = rows.map((d) => {
    const live = queue.live.get(d.id);
    if (live && d.status === "downloading") {
      return { ...d, progress: live.progress, speed: live.speed, eta: live.eta };
    }
    return d;
  });

  return ok(merged);
});

// Submit a new download job.
export const POST = withAuth(async (req, user) => {
  const body = await req.json().catch(() => ({}));
  const url = String(body.url || "").trim();
  const mediaType = body.mediaType === "audio" ? "audio" : "video";
  const formatId = body.formatId ? String(body.formatId) : null;
  const quality = body.quality ? String(body.quality) : null;

  if (!isValidUrl(url)) return fail("Please enter a valid http(s) URL.");

  // Best-effort metadata so the card looks good immediately.
  let title = "Fetching…";
  let thumbnail: string | null = null;
  let duration: number | null = null;
  try {
    const info = await extractInfo(url);
    title = info.title;
    thumbnail = info.thumbnail;
    duration = info.duration;
  } catch {
    title = url;
  }

  const dl = await prisma.download.create({
    data: {
      userId: user.id,
      url,
      title,
      thumbnail,
      duration,
      platform: detectPlatform(url),
      mediaType,
      formatId,
      quality,
      status: "queued",
    },
  });

  queue.enqueue(dl.id);
  return ok(dl, { status: 201 });
});
