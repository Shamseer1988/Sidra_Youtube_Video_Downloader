"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { MediaCard } from "./media-card";
import type { LibraryItem } from "@/lib/types";

export function MediaSection({
  title,
  items,
  href,
}: {
  title: string;
  items: LibraryItem[];
  href?: string;
}) {
  if (!items.length) return null;
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
        {href && (
          <Link
            href={href}
            className="text-xs text-slate-400 hover:text-accent-blue flex items-center gap-1"
          >
            See all <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
        {items.map((item) => (
          <div key={item.id} className="w-[220px] flex-shrink-0 snap-start">
            <MediaCard item={item} />
          </div>
        ))}
      </div>
    </section>
  );
}
