"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Play, Search, SlidersHorizontal, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MediaItem } from "@/lib/mock-data";
import { PosterArt } from "@/components/media/poster-art";
import { Badge } from "@/components/ui/badge";

function LibraryCard({ item, index }: { item: MediaItem; index: number }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.4), duration: 0.35 }}
      className="group"
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-2xl border border-stroke shadow-lg shadow-black/25 transition-all duration-300 group-hover:-translate-y-1.5 group-hover:border-primary/40 group-hover:shadow-2xl group-hover:shadow-primary/15">
        <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-110">
          <PosterArt title={item.title} colors={item.art} kind={item.kind} showTitle={false} />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/15 to-transparent" />

        <div className="absolute left-2.5 top-2.5 flex gap-1.5">
          <Badge size="sm" className="border-white/15 bg-black/50 text-[9px] text-white backdrop-blur">
            {item.resolution}
          </Badge>
          {item.hdr && (
            <Badge size="sm" className="border-warning/40 bg-warning/20 text-[9px] text-warning backdrop-blur">
              HDR
            </Badge>
          )}
        </div>

        <div className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-11 w-11 scale-75 items-center justify-center rounded-full bg-white/15 text-white opacity-0 shadow-xl backdrop-blur-md ring-1 ring-white/30 transition-all duration-300 group-hover:scale-100 group-hover:opacity-100">
            <Play className="ml-0.5 h-4 w-4 fill-white" />
          </span>
        </div>

        <div className="absolute inset-x-0 bottom-0 p-3">
          <p className="truncate text-[13px] font-semibold text-white">{item.title}</p>
          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-white/60">
            <Star className="h-3 w-3 fill-warning text-warning" />
            {item.rating.toFixed(1)} · {item.year} · {item.genre}
          </p>
        </div>
      </div>
    </motion.article>
  );
}

interface MediaLibraryProps {
  items: MediaItem[];
  searchPlaceholder?: string;
}

/** Filterable poster grid — powers the Movies / TV Shows / Recently Added pages. */
export function MediaLibrary({ items, searchPlaceholder = "Search titles…" }: MediaLibraryProps) {
  const params = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [genre, setGenre] = useState<string>("All");

  const genres = useMemo(
    () => ["All", ...Array.from(new Set(items.map((i) => i.genre))).sort()],
    [items]
  );

  const filtered = useMemo(
    () =>
      items.filter(
        (i) =>
          (genre === "All" || i.genre === genre) &&
          i.title.toLowerCase().includes(query.trim().toLowerCase())
      ),
    [items, genre, query]
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="glass-card flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="h-10 w-full rounded-xl border border-stroke bg-surface-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-2 focus:border-primary/50"
          />
        </div>
        <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto">
          <SlidersHorizontal className="mr-1 h-4 w-4 shrink-0 text-muted-2" />
          {genres.map((g) => (
            <button
              key={g}
              onClick={() => setGenre(g)}
              aria-pressed={genre === g}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                genre === g
                  ? "border-primary/50 bg-primary/15 text-foreground"
                  : "border-stroke text-muted hover:border-stroke-strong hover:text-foreground"
              )}
            >
              {g}
            </button>
          ))}
        </div>
        <p className="ml-auto hidden shrink-0 text-xs text-muted-2 lg:block">
          {filtered.length} title{filtered.length === 1 ? "" : "s"}
        </p>
      </div>

      {/* Grid / empty state */}
      {filtered.length === 0 ? (
        <div className="glass-card flex flex-col items-center py-20 text-center">
          <Search className="mb-3 h-8 w-8 text-muted-2" />
          <p className="text-sm font-medium text-foreground">No titles found</p>
          <p className="mt-1 text-xs text-muted">
            Try a different search or clear the genre filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6">
          {filtered.map((item, i) => (
            <LibraryCard key={item.id} item={item} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
