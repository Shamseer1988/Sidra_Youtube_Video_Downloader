"use client";

import { memo, useState } from "react";
import { Heart, ImageOff } from "lucide-react";
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
        <MasonryTile key={p.id} photo={p} onClick={() => onOpen(i)} />
      ))}
    </div>
  );
});

function MasonryTile({ photo, onClick }: { photo: PhotoItem; onClick: () => void }) {
  const [failed, setFailed] = useState(false);
  // Fall back to a square when EXIF gave no dimensions, so cells never collapse.
  const ratio = photo.width && photo.height ? `${photo.width} / ${photo.height}` : "1 / 1";
  return (
    <button
      onClick={onClick}
      className="group relative mb-1.5 block w-full break-inside-avoid overflow-hidden rounded-lg bg-surface-2"
      style={{ aspectRatio: ratio }}
    >
      {failed ? (
        <span className="flex h-full w-full items-center justify-center text-muted-2">
          <ImageOff className="h-5 w-5" />
        </span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/photos/${photo.id}/thumbnail?size=400`}
          alt={photo.filename}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          onError={() => setFailed(true)}
        />
      )}
      {photo.favorite && (
        <span className="absolute right-1.5 top-1.5 text-white drop-shadow">
          <Heart className="h-4 w-4 fill-current" />
        </span>
      )}
    </button>
  );
}
