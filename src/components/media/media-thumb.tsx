"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { PosterArt } from "@/components/media/poster-art";
import type { MediaKind } from "@/lib/mock-data";

/**
 * Thumbnail for a library item. For videos it always attempts the server's
 * generated WebP (the endpoint generates on demand and caches), fading it in
 * over a deterministic gradient placeholder and falling back to generated art
 * only if generation genuinely fails. Optionally shows a mid-video frame on
 * hover.
 */
export function MediaThumb({
  id,
  title,
  type,
  size = 400,
  previewAt,
}: {
  id: string;
  title: string;
  type: "video" | "audio";
  /** Deprecated gate — kept for call-site compatibility, no longer used. */
  hasThumbnail?: boolean;
  size?: 200 | 400 | 800;
  /** Seconds into the video to show as a hover preview frame. */
  previewAt?: number;
}) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [hover, setHover] = useState(false);
  const kind: MediaKind = type === "audio" ? "music" : "movie";

  // Deterministic gradient from the title so the placeholder is stable.
  const hue = [...title].reduce((a, c) => a + c.charCodeAt(0), 0);
  const art: [string, string] = [`hsl(${hue % 360} 55% 22%)`, `hsl(${(hue * 3) % 360} 45% 12%)`];

  if (type !== "video" || failed) {
    return <PosterArt title={title} colors={art} kind={kind} showTitle={false} />;
  }

  const base = `/api/thumbnail/${id}?size=${size}`;
  const previewSrc = previewAt && previewAt > 0 ? `${base}&t=${Math.floor(previewAt)}` : null;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Blur/gradient placeholder shown until the image decodes. */}
      <div
        aria-hidden
        className={cn(
          "absolute inset-0 transition-opacity duration-500",
          loaded ? "opacity-0" : "opacity-100",
        )}
        style={{ background: `linear-gradient(135deg, ${art[0]}, ${art[1]})` }}
      />

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={base}
        alt=""
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        className={cn(
          "h-full w-full object-cover transition-opacity duration-500",
          loaded ? "opacity-100" : "opacity-0",
        )}
      />

      {previewSrc && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={hover ? previewSrc : undefined}
          alt=""
          aria-hidden
          decoding="async"
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-opacity duration-500",
            hover ? "opacity-100" : "opacity-0",
          )}
        />
      )}
    </div>
  );
}
