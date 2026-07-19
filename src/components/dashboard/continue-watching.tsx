"use client";

import { memo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Heart, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { continueWatching, type ContinueWatchingItem } from "@/lib/mock-data";
import { PosterArt } from "@/components/media/poster-art";
import { Badge } from "@/components/ui/badge";

function WatchCard({ item, index }: { item: ContinueWatchingItem; index: number }) {
  const [favorite, setFavorite] = useState(false);

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.06, duration: 0.4 }}
      className="group relative w-[172px] shrink-0 snap-start sm:w-[196px]"
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-2xl border border-stroke shadow-lg shadow-black/30 transition-all duration-300 group-hover:border-primary/40 group-hover:shadow-2xl group-hover:shadow-primary/15">
        {/* Poster with hover zoom */}
        <div className="absolute inset-0 transition-transform duration-500 ease-out group-hover:scale-110">
          <PosterArt title={item.title} colors={item.art} kind={item.kind} showTitle={false} />
        </div>

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

        {/* Badges */}
        <div className="absolute left-2.5 top-2.5 flex gap-1.5">
          <Badge className="border-white/15 bg-black/50 text-[10px] text-white backdrop-blur">
            {item.resolution}
          </Badge>
          {item.hdr && (
            <Badge className="border-warning/40 bg-warning/20 text-[10px] text-warning backdrop-blur">
              HDR
            </Badge>
          )}
        </div>

        {/* Favorite */}
        <button
          onClick={() => setFavorite((f) => !f)}
          aria-label={favorite ? "Remove from favorites" : "Add to favorites"}
          aria-pressed={favorite}
          className={cn(
            "absolute right-2.5 top-2.5 rounded-full bg-black/50 p-2 backdrop-blur transition-all",
            "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
            favorite ? "text-danger opacity-100" : "text-white hover:text-danger"
          )}
        >
          <Heart className={cn("h-3.5 w-3.5", favorite && "fill-danger")} />
        </button>

        {/* Play button */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.span
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="flex h-12 w-12 scale-75 items-center justify-center rounded-full bg-white/15 text-white opacity-0 shadow-xl backdrop-blur-md ring-1 ring-white/30 transition-all duration-300 group-hover:scale-100 group-hover:opacity-100"
          >
            <Play className="ml-0.5 h-5 w-5 fill-white" />
          </motion.span>
        </div>

        {/* Bottom info */}
        <div className="absolute inset-x-0 bottom-0 p-3">
          <p className="truncate text-[13px] font-semibold text-white">{item.title}</p>
          <p className="mt-0.5 text-[11px] text-white/60">
            {item.episode ? `${item.episode} · ` : ""}
            {item.remaining}
          </p>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/20">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${item.progress}%` }}
              transition={{ delay: 0.4 + index * 0.06, duration: 0.9, ease: "easeOut" }}
              className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
            />
          </div>
        </div>
      </div>
    </motion.article>
  );
}

/** Netflix-style "Continue Watching" shelf. */
export const ContinueWatching = memo(function ContinueWatching() {
  return (
    <section aria-label="Continue watching" className="glass-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">Continue Watching</h2>
        <Link
          href="/watch-later"
          className="rounded-lg border border-stroke px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-primary/40 hover:text-foreground"
        >
          View All
        </Link>
      </div>

      <div className="no-scrollbar -mx-1 flex snap-x gap-4 overflow-x-auto px-1 pb-1">
        {continueWatching.map((item, i) => (
          <WatchCard key={item.id} item={item} index={i} />
        ))}
      </div>
    </section>
  );
});
