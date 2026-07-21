"use client";

import { memo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Play } from "lucide-react";
import { formatDuration } from "@/lib/utils";
import { useDashboard } from "@/hooks/use-dashboard";
import { MediaThumb } from "@/components/media/media-thumb";
import type { LibraryItem } from "@/lib/types";

function WatchCard({ item, index }: { item: LibraryItem; index: number }) {
  const progress =
    item.duration && item.state?.position
      ? Math.min(100, (item.state.position / item.duration) * 100)
      : 0;
  const remaining =
    item.duration && item.state?.position
      ? `${formatDuration(Math.max(0, item.duration - item.state.position))} left`
      : "";

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.06, duration: 0.4 }}
      className="group relative w-[220px] shrink-0 snap-start"
    >
      <Link href={`/watch/${item.id}`}>
        <div className="relative aspect-video overflow-hidden rounded-2xl border border-stroke shadow-lg shadow-black/30 transition-all duration-300 group-hover:border-primary/40 group-hover:shadow-2xl group-hover:shadow-primary/15">
          <div className="absolute inset-0 transition-transform duration-500 ease-out group-hover:scale-105">
            <MediaThumb id={item.id} title={item.title} type={item.type} hasThumbnail={!!item.thumbnail} />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

          <div className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-12 w-12 scale-75 items-center justify-center rounded-full bg-white/15 text-white opacity-0 shadow-xl backdrop-blur-md ring-1 ring-white/30 transition-all duration-300 group-hover:scale-100 group-hover:opacity-100">
              <Play className="ml-0.5 h-5 w-5 fill-white" />
            </span>
          </div>

          <div className="absolute inset-x-0 bottom-0 p-3">
            <p className="truncate text-[13px] font-semibold text-white">{item.title}</p>
            {remaining && <p className="mt-0.5 text-[11px] text-white/60">{remaining}</p>}
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/20">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ delay: 0.4 + index * 0.06, duration: 0.9, ease: "easeOut" }}
                className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
              />
            </div>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}

/** "Continue Watching" shelf — real resume points from user state. */
export const ContinueWatching = memo(function ContinueWatching() {
  const { data } = useDashboard();
  const items = data?.continueWatching ?? [];

  if (items.length === 0) return null;

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
        {items.map((item, i) => (
          <WatchCard key={item.id} item={item} index={i} />
        ))}
      </div>
    </section>
  );
});
