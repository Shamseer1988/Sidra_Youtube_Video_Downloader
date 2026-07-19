"use client";

import { memo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronUp, DownloadCloud, Pause, Play, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { downloads, type DownloadItem } from "@/lib/mock-data";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

function FloatingRow({
  item,
  onToggle,
  onDismiss,
}: {
  item: DownloadItem;
  onToggle: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  const paused = item.status === "paused";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 40 }}
      className="rounded-xl border border-stroke bg-surface-2/70 p-3"
    >
      <div className="flex items-center gap-2.5">
        <p className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">{item.title}</p>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => onToggle(item.id)}
              aria-label={paused ? "Resume" : "Pause"}
              className="rounded-md p-1 text-muted-2 hover:bg-surface-3 hover:text-foreground"
            >
              {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            </button>
          </TooltipTrigger>
          <TooltipContent>{paused ? "Resume" : "Pause"}</TooltipContent>
        </Tooltip>
        <button
          onClick={() => onDismiss(item.id)}
          aria-label="Dismiss"
          className="rounded-md p-1 text-muted-2 hover:bg-surface-3 hover:text-danger"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="mt-2 flex items-center gap-2.5">
        <Progress value={item.progress} active={!paused} aria-label={`${item.title} progress`} />
        <span className="w-8 shrink-0 text-right text-[10px] tabular-nums text-muted">
          {item.progress}%
        </span>
      </div>
      <p className="mt-1 text-[10px] text-muted-2">
        {paused ? "Paused" : `${item.speed} · ${item.eta}`}
      </p>
    </motion.div>
  );
}

/** Bottom-right floating download manager with expand/collapse. */
export const FloatingDownloads = memo(function FloatingDownloads() {
  const [items, setItems] = useState(
    downloads.filter((d) => d.status === "downloading" || d.status === "paused")
  );
  const [expanded, setExpanded] = useState(false);

  const toggle = (id: string) =>
    setItems((prev) =>
      prev.map((d) =>
        d.id === id
          ? { ...d, status: d.status === "paused" ? ("downloading" as const) : ("paused" as const) }
          : d
      )
    );

  const dismiss = (id: string) => setItems((prev) => prev.filter((d) => d.id !== id));

  if (items.length === 0) return null;

  const active = items.filter((d) => d.status === "downloading").length;

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
              <Link
                href="/downloads"
                className="text-[11px] text-primary transition-opacity hover:opacity-80"
              >
                Open queue
              </Link>
            </div>
            <AnimatePresence mode="popLayout">
              {items.map((item) => (
                <FloatingRow key={item.id} item={item} onToggle={toggle} onDismiss={dismiss} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        aria-label={`Download manager — ${active} active`}
        className="ml-auto flex items-center gap-3 rounded-2xl border border-stroke bg-surface/95 py-2.5 pl-3 pr-4 shadow-2xl shadow-black/50 backdrop-blur-xl transition-colors hover:border-primary/40"
      >
        <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary text-white shadow-lg shadow-primary/30">
          <DownloadCloud className="h-4 w-4" />
          {active > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-surface px-1 text-[9px] font-bold text-primary ring-1 ring-primary/50">
              {active}
            </span>
          )}
        </span>
        <span className="text-left">
          <span className="block text-xs font-semibold text-foreground">
            {active > 0 ? `${active} downloading` : "Downloads paused"}
          </span>
          <span className="block text-[10px] text-muted-2">
            {active > 0 ? downloads[0].speed : "click to manage"}
          </span>
        </span>
        <ChevronUp
          className={cn(
            "h-4 w-4 text-muted-2 transition-transform duration-300",
            expanded && "rotate-180"
          )}
        />
      </motion.button>
    </div>
  );
});
