"use client";

import { memo } from "react";
import { Heart } from "lucide-react";
import type { PhotoItem } from "@/lib/types";

/** Pinterest-style masonry using CSS multi-columns; preserves aspect ratio. */
export const PhotoMasonry = memo(function PhotoMasonry({
  photos,
  onOpen,
}: {
  photos: PhotoItem[];
  onOpen: (index: number) => void;
}) {
  return (
    <div className="columns-2 gap-1.5 sm:columns-3 md:columns-4 lg:columns-5 xl:columns-6">
      {photos.map((p, i) => (
        <button
          key={p.id}
          onClick={() => onOpen(i)}
          className="group relative mb-1.5 block w-full break-inside-avoid overflow-hidden rounded-lg bg-surface-2"
          style={p.width && p.height ? { aspectRatio: `${p.width} / ${p.height}` } : undefined}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/photos/${p.id}/thumbnail?size=400`}
            alt={p.filename}
            loading="lazy"
            decoding="async"
            className="w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            onError={(e) => ((e.target as HTMLImageElement).style.visibility = "hidden")}
          />
          {p.favorite && (
            <span className="absolute right-1.5 top-1.5 text-white drop-shadow">
              <Heart className="h-4 w-4 fill-current" />
            </span>
          )}
        </button>
      ))}
    </div>
  );
});
