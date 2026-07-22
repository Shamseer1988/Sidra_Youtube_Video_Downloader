"use client";

import { memo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { Play, X } from "lucide-react";
import { formatDuration } from "@/lib/utils";
import { apiSend } from "@/lib/client-api";
import { useDashboard } from "@/hooks/use-dashboard";
import { MediaThumb } from "@/components/media/media-thumb";
import type { LibraryItem } from "@/lib/types";

function WatchCard({ item, index }: { item: LibraryItem; index: number }) {
  const qc = useQueryClient();

  // Dismiss from the shelf: mark finished so it drops out of the
  // position>0 && !finished query, without deleting the item itself.
  async function dismiss(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    qc.setQueryData(["stats"], (prev: unknown) => {
      const d = prev as { continueWatching?: LibraryItem[] } | undefined;
      if (!d?.continueWatching) return prev;
      return { ...d, continueWatching: d.continueWatching.filter((x) => x.id !== item.id) };
    });
    try {
      await apiSend("PATCH", `/api/library/${item.id}/state`, { finished: true });
    } catch {
      /* optimistic; refetch will reconcile */
    }
    qc.invalidateQueries({ queryKey: ["stats"] });
  }

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
            <MediaThumb
              id={item.id}
              title={item.title}
              type={item.type}
              previewAt={item.duration ? item.duration / 2 : undefined}
            />
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

      <button
        onClick={dismiss}
        aria-label="Remove from Continue Watching"
        title="Remove from Continue Watching"
        className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white/80 opacity-0 backdrop-blur-md ring-1 ring-white/20 transition-all hover:bg-black/80 hover:text-white group-hover:opacity-100"
      >
        <X className="h-4 w-4" />
      </button>
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
          href="/continue-watching"
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
