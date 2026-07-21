"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Clock, Play, Sparkles } from "lucide-react";
import { formatDuration, formatBytes } from "@/lib/utils";
import { useLibraryItems } from "@/hooks/use-library";
import { PageHeader } from "@/components/layout/page-header";
import { MediaThumb } from "@/components/media/media-thumb";
import { Skeleton } from "@/components/ui/skeleton";

export default function RecentlyAddedPage() {
  const { data: items = [], isLoading } = useLibraryItems({ sort: "added", limit: 60 });

  return (
    <div className="mx-auto max-w-[1600px] space-y-5">
      <PageHeader title="Recently Added" subtitle="The newest media indexed across your libraries" />

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="aspect-video rounded-2xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="glass-card flex flex-col items-center py-20 text-center">
          <Sparkles className="mb-3 h-9 w-9 text-muted-2" />
          <p className="text-base font-semibold text-foreground">Nothing here yet</p>
          <p className="mt-1 max-w-sm text-sm text-muted">
            Add libraries in <Link href="/settings" className="text-primary hover:underline">Settings</Link>{" "}
            or download something, then run a scan.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {items.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.4) }}
              className="group"
            >
              <Link href={`/watch/${item.id}`}>
                <div className="relative aspect-video overflow-hidden rounded-2xl border border-stroke shadow-lg shadow-black/25 transition-all duration-300 group-hover:border-primary/40 group-hover:shadow-2xl group-hover:shadow-primary/15">
                  <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-105">
                    <MediaThumb id={item.id} title={item.title} type={item.type} hasThumbnail={!!item.thumbnail} />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="flex h-10 w-10 scale-75 items-center justify-center rounded-full bg-white/15 text-white opacity-0 backdrop-blur-md ring-1 ring-white/30 transition-all duration-300 group-hover:scale-100 group-hover:opacity-100">
                      <Play className="ml-0.5 h-4 w-4 fill-white" />
                    </span>
                  </div>
                  <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/50 px-1.5 py-0.5 text-[10px] text-white/80 backdrop-blur">
                    <Clock className="h-2.5 w-2.5" /> {item.category}
                  </span>
                </div>
                <p className="mt-2 truncate text-[13px] font-medium text-foreground">{item.title}</p>
                <p className="text-[11px] text-muted-2">
                  {item.duration ? formatDuration(item.duration) : formatBytes(item.size)}
                </p>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
