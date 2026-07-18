"use client";

import { useRef } from "react";
import Link from "next/link";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { MediaCard } from "./media-card";
import type { LibraryItem } from "@/lib/types";

// Horizontal media row, Netflix-style, with scroll arrows on desktop.
export function MediaSection({
  title,
  items,
  href,
}: {
  title: string;
  items: LibraryItem[];
  href?: string;
}) {
  const scroller = useRef<HTMLDivElement>(null);

  if (!items.length) return null;

  const scrollBy = (dir: 1 | -1) => {
    scroller.current?.scrollBy({ left: dir * scroller.current.clientWidth * 0.85, behavior: "smooth" });
  };

  return (
    <section className="group/row">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base sm:text-lg font-bold text-slate-100">{title}</h3>
        <div className="flex items-center gap-1">
          {href && (
            <Link
              href={href}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-0.5 mr-2"
            >
              See all <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          )}
          <button
            onClick={() => scrollBy(-1)}
            className="hidden md:flex opacity-0 group-hover/row:opacity-100 transition-opacity w-7 h-7 items-center justify-center rounded-full bg-navy-700/70 text-slate-300 hover:bg-navy-600 hover:text-white"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => scrollBy(1)}
            className="hidden md:flex opacity-0 group-hover/row:opacity-100 transition-opacity w-7 h-7 items-center justify-center rounded-full bg-navy-700/70 text-slate-300 hover:bg-navy-600 hover:text-white"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div
        ref={scroller}
        className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 -mx-4 px-4 sm:-mx-1 sm:px-1 snap-x no-scrollbar"
      >
        {items.map((item) => (
          <div
            key={item.id}
            className="w-[46vw] sm:w-[220px] lg:w-[248px] flex-shrink-0 snap-start"
          >
            <MediaCard item={item} />
          </div>
        ))}
      </div>
    </section>
  );
}
