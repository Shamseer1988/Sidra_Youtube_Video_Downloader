"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Heart, Images, LayoutGrid, Loader2, Map as MapIcon, Play, RefreshCw, Search, Sparkles, X } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { PhotoGrid } from "@/components/photos/photo-grid";
import { PhotoMasonry } from "@/components/photos/photo-masonry";
import { PhotoCalendar } from "@/components/photos/photo-calendar";
import { PhotoMap } from "@/components/photos/photo-map";
import { PhotoLightbox } from "@/components/photos/photo-lightbox";
import { SlideshowPlayer } from "@/components/photos/slideshow-player";
import { AddToAlbumModal } from "@/components/photos/album-modals";
import { usePhotos, usePhotoLibraries } from "@/hooks/use-photos";
import { apiSend } from "@/lib/client-api";
import { useUser } from "@/components/providers/user-provider";
import { useToast } from "@/components/providers/toast-provider";
import { cn } from "@/lib/utils";
import type { PhotoItem } from "@/lib/types";

export default function PhotosPage() {
  const user = useUser();
  const toast = useToast();
  const qc = useQueryClient();
  const [view, setView] = useState<"timeline" | "masonry" | "calendar" | "map">("timeline");
  const [favOnly, setFavOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [slideshow, setSlideshow] = useState<number | null>(null);
  const [addToAlbum, setAddToAlbum] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  // Honor a ?view= param (e.g. linked from the dashboard's map stat).
  useEffect(() => {
    const v = new URLSearchParams(window.location.search).get("view");
    if (v === "masonry" || v === "calendar" || v === "map" || v === "timeline") setView(v);
  }, []);

  // Debounce the search input so we don't refetch on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: libraries = [] } = usePhotoLibraries();
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = usePhotos({ favorite: favOnly || undefined, q: debounced || undefined });

  const photos: PhotoItem[] = useMemo(
    () => (data?.pages ?? []).flatMap((p) => p.photos),
    [data],
  );

  // Infinite scroll sentinel.
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage();
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  async function scan() {
    setScanning(true);
    try {
      const res = await apiSend<{ added: number; removed: number }>("POST", "/api/photos/scan");
      toast(`Scan complete — ${res.added} added, ${res.removed} removed`, "success");
      qc.invalidateQueries({ queryKey: ["photos"] });
      qc.invalidateQueries({ queryKey: ["photo-libraries"] });
    } catch (e) {
      toast((e as Error).message || "Scan failed", "error");
    } finally {
      setScanning(false);
    }
  }

  const patchFavorite = (id: string, favorite: boolean) => {
    qc.setQueriesData<typeof data>({ queryKey: ["photos"] }, (prev) =>
      prev
        ? {
            ...prev,
            pages: prev.pages.map((pg) => ({
              ...pg,
              photos: pg.photos.map((p) => (p.id === id ? { ...p, favorite } : p)),
            })),
          }
        : prev,
    );
  };

  const noLibraries = libraries.length === 0;

  return (
    <div className="mx-auto max-w-[1600px] space-y-5">
      <PageHeader
        title="Photos"
        subtitle={photos.length ? `${photos.length.toLocaleString()} loaded` : "Your photo library"}
        actions={
          <>
            <Link
              href="/photos/dashboard"
              className="flex h-9 items-center gap-1.5 rounded-lg border border-stroke bg-surface-2/60 px-3 text-sm text-muted hover:text-foreground"
            >
              <Sparkles className="h-4 w-4" /> Overview
            </Link>
            <Link
              href="/photos/albums"
              className="flex h-9 items-center gap-1.5 rounded-lg border border-stroke bg-surface-2/60 px-3 text-sm text-muted hover:text-foreground"
            >
              <Images className="h-4 w-4" /> Albums
            </Link>
            {(view === "timeline" || view === "masonry") && (
              <button
                onClick={() => setSlideshow(0)}
                className="flex h-9 items-center gap-1.5 rounded-lg border border-stroke bg-surface-2/60 px-3 text-sm text-muted hover:text-foreground"
              >
                <Play className="h-4 w-4" /> Slideshow
              </button>
            )}
            <button
              onClick={() => setFavOnly((f) => !f)}
              className={cn(
                "flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm transition-colors",
                favOnly
                  ? "border-primary/40 bg-primary/15 text-primary"
                  : "border-stroke bg-surface-2/60 text-muted hover:text-foreground",
              )}
            >
              <Heart className={cn("h-4 w-4", favOnly && "fill-current")} /> Favorites
            </button>
            {user.role === "admin" && (
              <button
                onClick={scan}
                disabled={scanning}
                className="flex h-9 items-center gap-1.5 rounded-lg border border-stroke bg-surface-2/60 px-3 text-sm text-muted hover:text-foreground disabled:opacity-50"
              >
                <RefreshCw className={cn("h-4 w-4", scanning && "animate-spin")} /> Scan
              </button>
            )}
          </>
        }
      />

      {/* View selector */}
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-0.5">
        {([
          { v: "timeline", label: "Timeline", icon: Images },
          { v: "masonry", label: "Masonry", icon: LayoutGrid },
          { v: "calendar", label: "Calendar", icon: CalendarDays },
          { v: "map", label: "Map", icon: MapIcon },
        ] as const).map((opt) => {
          const Icon = opt.icon;
          return (
            <button
              key={opt.v}
              onClick={() => setView(opt.v)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                view === opt.v
                  ? "border-primary/40 bg-primary/15 text-primary"
                  : "border-stroke bg-surface-2/60 text-muted hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" /> {opt.label}
            </button>
          );
        })}
      </div>

      {view === "calendar" ? (
        <PhotoCalendar />
      ) : view === "map" ? (
        <PhotoMap />
      ) : (
        <>
          {/* Search bar (timeline / masonry) */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search — try “beach 2024”, “favorites”, “Canon”, “june geotagged”…"
              className="h-11 w-full rounded-xl border border-stroke bg-surface-2/60 pl-10 pr-10 text-sm text-foreground placeholder:text-muted-2 focus:border-primary/50 focus:outline-none"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-2 hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="flex justify-center py-24">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : photos.length === 0 ? (
            debounced ? (
              <div className="glass-card flex flex-col items-center py-20 text-center">
                <Search className="mb-3 h-9 w-9 text-muted-2" />
                <p className="text-base font-semibold text-foreground">No matches for “{debounced}”</p>
                <p className="mt-1 text-sm text-muted">Try a year, camera, file type, or a word from the filename.</p>
              </div>
            ) : (
              <EmptyState noLibraries={noLibraries} isAdmin={user.role === "admin"} />
            )
          ) : (
            <>
              {view === "masonry" ? (
                <PhotoMasonry photos={photos} onOpen={setLightbox} />
              ) : (
                <PhotoGrid photos={photos} onOpen={setLightbox} />
              )}
              <div ref={sentinel} className="h-12" />
              {isFetchingNextPage && (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              )}
            </>
          )}
        </>
      )}

      {lightbox !== null && (
        <PhotoLightbox
          photos={photos}
          index={lightbox}
          onClose={() => setLightbox(null)}
          onIndexChange={setLightbox}
          onFavoriteChange={patchFavorite}
          onAddToAlbum={(photoId) => setAddToAlbum(photoId)}
          onSlideshow={(i) => { setLightbox(null); setSlideshow(i); }}
        />
      )}

      {slideshow !== null && photos.length > 0 && (
        <SlideshowPlayer photos={photos} startIndex={slideshow} onClose={() => setSlideshow(null)} />
      )}

      {addToAlbum && <AddToAlbumModal photoIds={[addToAlbum]} onClose={() => setAddToAlbum(null)} />}
    </div>
  );
}

function EmptyState({ noLibraries, isAdmin }: { noLibraries: boolean; isAdmin: boolean }) {
  return (
    <div className="glass-card flex flex-col items-center py-20 text-center">
      <Images className="mb-3 h-9 w-9 text-muted-2" />
      <p className="text-base font-semibold text-foreground">
        {noLibraries ? "No photo library yet" : "No photos indexed"}
      </p>
      <p className="mt-1 max-w-sm text-sm text-muted">
        {noLibraries ? (
          <>
            {isAdmin ? (
              <>
                Add a mounted photo folder in{" "}
                <Link href="/settings" className="text-primary hover:underline">Settings → Photos</Link>, then run a scan.
              </>
            ) : (
              "Ask an admin to add a photo folder in Settings."
            )}
          </>
        ) : (
          "Run a scan to index photos from your library folders."
        )}
      </p>
    </div>
  );
}
