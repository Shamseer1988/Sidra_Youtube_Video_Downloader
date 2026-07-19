"use client";

import { memo, useRef } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Flame, Star } from "lucide-react";
import { trending, type MediaItem } from "@/lib/mock-data";
import { PosterArt } from "@/components/media/poster-art";
import { Badge } from "@/components/ui/badge";

function TrendingCard({ item, rank }: { item: MediaItem; rank: number }) {
  return (
    <motion.article
      initial={{ opacity: 0, x: 20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "0px 40px" }}
      transition={{ duration: 0.4 }}
      className="group relative w-[150px] shrink-0 snap-start sm:w-[168px]"
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-2xl border border-stroke shadow-lg shadow-black/30 transition-all duration-300 group-hover:-translate-y-1.5 group-hover:border-primary/40 group-hover:shadow-2xl group-hover:shadow-primary/15">
        <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-108">
          <PosterArt title={item.title} colors={item.art} kind={item.kind} showTitle={false} />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent" />

        {/* Rank */}
        <span className="absolute left-2.5 top-2 text-3xl font-black italic text-white/25 transition-colors group-hover:text-primary/60">
          {rank}
        </span>

        <div className="absolute inset-x-0 bottom-0 translate-y-8 p-3 transition-transform duration-300 group-hover:translate-y-0">
          <p className="truncate text-[13px] font-semibold text-white">{item.title}</p>
          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-white/60">
            <Star className="h-3 w-3 fill-warning text-warning" />
            {item.rating.toFixed(1)}
            <span className="mx-0.5">·</span>
            {item.year}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <Badge size="sm" className="border-white/15 bg-white/10 text-[9px] text-white/85">
              {item.genre}
            </Badge>
            <Badge size="sm" className="border-white/15 bg-white/10 text-[9px] text-white/85">
              {item.runtime}
            </Badge>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

/** Horizontal trending shelf with scroll buttons. */
export const Trending = memo(function Trending() {
  const scroller = useRef<HTMLDivElement>(null);

  const scrollBy = (dir: 1 | -1) =>
    scroller.current?.scrollBy({ left: dir * 360, behavior: "smooth" });

  return (
    <section aria-label="Trending media" className="glass-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Flame className="h-4 w-4 text-warning" /> Trending Now
        </h2>
        <div className="flex gap-1.5">
          <button
            onClick={() => scrollBy(-1)}
            aria-label="Scroll left"
            className="rounded-lg border border-stroke p-1.5 text-muted transition-colors hover:border-primary/40 hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => scrollBy(1)}
            aria-label="Scroll right"
            className="rounded-lg border border-stroke p-1.5 text-muted transition-colors hover:border-primary/40 hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        ref={scroller}
        className="no-scrollbar -mx-1 flex snap-x gap-4 overflow-x-auto px-1 pb-1 pt-2"
      >
        {trending.map((item, i) => (
          <TrendingCard key={item.id} item={item} rank={i + 1} />
        ))}
      </div>
    </section>
  );
});
