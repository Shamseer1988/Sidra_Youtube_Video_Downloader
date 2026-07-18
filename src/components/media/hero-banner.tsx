"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Play, Info, Music2, RotateCcw } from "lucide-react";
import { formatDuration } from "@/lib/utils";
import type { LibraryItem } from "@/lib/types";

// Netflix/Prime-style hero: full-bleed backdrop with gradient shade,
// title and actions bottom-left.
export function HeroBanner({ item, label }: { item: LibraryItem; label?: string }) {
  const resume = item.state.position > 3 && !item.state.finished;
  const progressPct =
    item.duration && item.state.position > 0
      ? Math.min(100, (item.state.position / item.duration) * 100)
      : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="relative rounded-2xl overflow-hidden border border-slate-700/20 min-h-[300px] sm:min-h-[380px] lg:min-h-[440px] flex items-end"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-navy-800">
        {item.type === "video" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/thumbnail/${item.id}`}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-accent-purple/25 via-navy-800 to-accent-blue/20 flex items-center justify-center">
            <Music2 className="h-28 w-28 text-slate-700" />
          </div>
        )}
      </div>
      <div className="absolute inset-0 hero-shade" />

      {/* Content */}
      <div className="relative p-5 sm:p-8 lg:p-10 max-w-2xl">
        {label && (
          <span className="inline-block text-[11px] font-bold uppercase tracking-widest text-accent-blue mb-2">
            {label}
          </span>
        )}
        <h1 className="text-2xl sm:text-4xl font-extrabold text-white leading-tight drop-shadow-lg line-clamp-2">
          {item.title}
        </h1>
        <div className="flex items-center gap-3 mt-2.5 text-sm text-slate-300">
          {item.duration ? <span>{formatDuration(item.duration)}</span> : null}
          {item.height ? (
            <span className="px-1.5 py-0.5 rounded border border-slate-500/50 text-[11px] font-semibold">
              {item.height >= 2000 ? "4K" : `${item.height}p`}
            </span>
          ) : null}
          <span className="capitalize text-slate-400">
            {item.source === "download" ? "Downloaded" : "Library"}
          </span>
        </div>

        <div className="flex items-center gap-3 mt-5">
          <Link
            href={`/watch/${item.id}`}
            className="flex items-center gap-2 h-11 px-6 rounded-lg bg-white text-navy-950 text-sm font-bold transition-transform hover:scale-[1.03] active:scale-[0.98]"
          >
            {resume ? <RotateCcw className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
            {resume ? "Resume" : "Play"}
          </Link>
          <Link
            href={`/watch/${item.id}`}
            className="flex items-center gap-2 h-11 px-5 rounded-lg bg-slate-500/30 backdrop-blur text-white text-sm font-semibold transition-colors hover:bg-slate-500/45"
          >
            <Info className="h-4 w-4" />
            Details
          </Link>
        </div>

        {progressPct > 0 && (
          <div className="mt-4 h-1 w-full max-w-xs rounded-full bg-slate-600/40 overflow-hidden">
            <div className="h-full bg-accent-red" style={{ width: `${progressPct}%` }} />
          </div>
        )}
      </div>
    </motion.div>
  );
}
