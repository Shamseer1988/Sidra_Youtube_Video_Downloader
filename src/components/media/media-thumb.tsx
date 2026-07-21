"use client";

import { useState } from "react";
import { PosterArt } from "@/components/media/poster-art";
import type { MediaKind } from "@/lib/mock-data";

/**
 * Thumbnail for a library item: uses the generated ffmpeg thumbnail when the
 * server has one, otherwise falls back to deterministic generated art.
 */
export function MediaThumb({
  id,
  title,
  type,
  hasThumbnail,
}: {
  id: string;
  title: string;
  type: "video" | "audio";
  hasThumbnail: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const kind: MediaKind = type === "audio" ? "music" : "movie";

  // Deterministic gradient from the title so art is stable across renders.
  const hue = [...title].reduce((a, c) => a + c.charCodeAt(0), 0);
  const art: [string, string] = [`hsl(${hue % 360} 55% 22%)`, `hsl(${(hue * 3) % 360} 45% 12%)`];

  if (type === "video" && hasThumbnail && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/api/thumbnail/${id}`}
        alt=""
        loading="lazy"
        onError={() => setFailed(true)}
        className="h-full w-full object-cover"
      />
    );
  }

  return <PosterArt title={title} colors={art} kind={kind} showTitle={false} />;
}
