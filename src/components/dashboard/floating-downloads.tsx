"use client";

import { memo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronUp, DownloadCloud } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDownloads } from "@/hooks/use-dashboard";
import { Progress } from "@/components/ui/progress";

/** Bottom-right floating download manager — real active jobs only. */
export const FloatingDownloads = memo(function FloatingDownloads() {
  const { data: downloads = [] } = useDownloads();
  const active = downloads.filter((d) => d.status === "downloading" || d.status === "queued");
  const [expanded, setExpanded] = useState(false);

  if (active.length === 0) return null;

  const downloading = active.filter((d) => d.status === "downloading");
  const topSpeed = downloading[0]?.speed || "queued";

  return (
    <div className="fixed bottom-5 right-5 z-40 w-[300px] max-w-[calc(100vw-2.5rem)]">
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 340, damping: 30 }}
            className="glass-card mb-3 space-y-2 p-3"
          >
            <div className="flex items-center justify-between px-1 pb-1">
              <p className="text-xs font-semibold text-foreground">Download Manager</p>
              <Link href="/downloads" className="text-[11px] text-primary hover:opacity-80">
                Open queue
              </Link>
            </div>
            {active.map((d) => (
              <div key={d.id} className="rounded-xl border border-stroke bg-surface-2/70 p-3">
                <p className="truncate text-xs font-medium text-foreground">{d.title}</p>
                <div className="mt-2 flex items-center gap-2.5">
                  <Progress value={d.progress} active={d.status === "downloading"} />
                  <span className="w-8 shrink-0 text-right text-[10px] tabular-nums text-muted">
                    {d.progress.toFixed(0)}%
                  </span>
                </div>
                <p className="mt-1 text-[10px] text-muted-2">
                  {d.status === "queued" ? "Queued" : `${d.speed ?? ""} ${d.eta ? `· ${d.eta}` : ""}`}
                </p>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        aria-label={`Download manager — ${downloading.length} active`}
        className="ml-auto flex items-center gap-3 rounded-2xl border border-stroke bg-surface/95 py-2.5 pl-3 pr-4 shadow-2xl shadow-black/50 backdrop-blur-xl transition-colors hover:border-primary/40"
      >
        <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary text-white shadow-lg shadow-primary/30">
          <DownloadCloud className="h-4 w-4" />
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-surface px-1 text-[9px] font-bold text-primary ring-1 ring-primary/50">
            {active.length}
          </span>
        </span>
        <span className="text-left">
          <span className="block text-xs font-semibold text-foreground">
            {downloading.length > 0 ? `${downloading.length} downloading` : `${active.length} queued`}
          </span>
          <span className="block text-[10px] text-muted-2">{topSpeed}</span>
        </span>
        <ChevronUp className={cn("h-4 w-4 text-muted-2 transition-transform duration-300", expanded && "rotate-180")} />
      </motion.button>
    </div>
  );
});
