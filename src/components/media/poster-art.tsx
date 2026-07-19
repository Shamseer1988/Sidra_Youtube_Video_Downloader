"use client";

import { memo } from "react";
import { Clapperboard, Music2, Tv } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MediaKind } from "@/lib/mock-data";

interface PosterArtProps {
  title: string;
  colors: [string, string];
  kind?: MediaKind;
  className?: string;
  /** Render the title inside the artwork (default true) */
  showTitle?: boolean;
}

const kindIcon = {
  movie: Clapperboard,
  tv: Tv,
  music: Music2,
} as const;

/**
 * Deterministic generated poster artwork — layered gradients + typography.
 * Keeps the demo fully self-hosted (no remote images) while looking designed.
 */
export const PosterArt = memo(function PosterArt({
  title,
  colors,
  kind = "movie",
  className,
  showTitle = true,
}: PosterArtProps) {
  const [a, b] = colors;
  const Icon = kindIcon[kind];

  return (
    <div
      aria-hidden
      className={cn("relative h-full w-full select-none overflow-hidden", className)}
      style={{
        background: `radial-gradient(120% 90% at 20% 0%, ${a} 0%, transparent 60%),
          radial-gradient(120% 100% at 90% 100%, ${b} 0%, transparent 65%),
          linear-gradient(160deg, ${a}, #0a0b10 85%)`,
      }}
    >
      {/* light streak */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background:
            "linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.08) 45%, transparent 60%)",
        }}
      />
      {/* vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(90%_80%_at_50%_30%,transparent_40%,rgba(0,0,0,0.55)_100%)]" />

      <Icon className="absolute right-2.5 top-2.5 h-4 w-4 text-white/35" />

      {showTitle && (
        <div className="absolute inset-x-0 bottom-0 p-3">
          <p className="line-clamp-3 text-sm font-extrabold uppercase leading-tight tracking-wide text-white/90 drop-shadow-md">
            {title}
          </p>
        </div>
      )}
    </div>
  );
});
