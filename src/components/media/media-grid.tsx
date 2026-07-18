"use client";

import { FolderOpen } from "lucide-react";
import { MediaCard } from "./media-card";
import type { LibraryItem } from "@/lib/types";

export function MediaGrid({
  items,
  loading,
  emptyText = "Nothing here yet.",
  showDelete = false,
}: {
  items: LibraryItem[];
  loading?: boolean;
  emptyText?: string;
  showDelete?: boolean;
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="aspect-video rounded-xl bg-navy-800/60 shimmer" />
            <div className="h-3 w-3/4 rounded bg-navy-800/60 shimmer" />
            <div className="h-2.5 w-1/3 rounded bg-navy-800/60 shimmer" />
          </div>
        ))}
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-navy-800/60 flex items-center justify-center mb-4">
          <FolderOpen className="h-7 w-7 text-slate-600" />
        </div>
        <p className="text-sm text-slate-400">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {items.map((item) => (
        <MediaCard key={item.id} item={item} showDelete={showDelete} />
      ))}
    </div>
  );
}
