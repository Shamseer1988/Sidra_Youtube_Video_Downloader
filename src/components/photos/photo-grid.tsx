"use client";

import { memo } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PhotoItem } from "@/lib/types";

function dayKey(iso: string | null): string {
  if (!iso) return "Undated";
  return new Date(iso).toISOString().slice(0, 10);
}

function dayLabel(iso: string | null): string {
  if (!iso) return "Undated";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

/** Timeline grid: photos grouped by capture day, newest first. */
export const PhotoGrid = memo(function PhotoGrid({
  photos,
  onOpen,
}: {
  photos: PhotoItem[];
  onOpen: (index: number) => void;
}) {
  // Build day groups while preserving the flat index for the lightbox.
  const groups: { key: string; label: string; items: { photo: PhotoItem; index: number }[] }[] = [];
  photos.forEach((photo, index) => {
    const key = dayKey(photo.takenAt);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push({ photo, index });
    else groups.push({ key, label: dayLabel(photo.takenAt), items: [{ photo, index }] });
  });

  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <section key={group.key}>
          <h2 className="sticky top-0 z-[1] mb-3 bg-surface-1/80 py-1 text-sm font-semibold text-foreground backdrop-blur">
            {group.label}
            <span className="ml-2 text-xs font-normal text-muted-2">{group.items.length}</span>
          </h2>
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
            {group.items.map(({ photo, index }) => (
              <Thumb key={photo.id} photo={photo} onClick={() => onOpen(index)} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
});

function Thumb({ photo, onClick }: { photo: PhotoItem; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group relative aspect-square overflow-hidden rounded-lg bg-surface-2"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/photos/${photo.id}/thumbnail?size=400`}
        alt={photo.filename}
        loading="lazy"
        decoding="async"
        className={cn(
          "h-full w-full object-cover transition-transform duration-300 group-hover:scale-105",
        )}
        onError={(e) => ((e.target as HTMLImageElement).style.visibility = "hidden")}
      />
      {photo.favorite && (
        <span className="absolute right-1.5 top-1.5 text-white drop-shadow">
          <Heart className="h-4 w-4 fill-current" />
        </span>
      )}
      <span className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />
    </button>
  );
}
