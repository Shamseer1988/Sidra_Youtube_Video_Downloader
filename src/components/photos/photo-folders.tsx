"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ChevronRight, Folder, Home, Images, Loader2 } from "lucide-react";
import { usePhotoFolders, usePhotos } from "@/hooks/use-photos";
import { PhotoGrid } from "@/components/photos/photo-grid";
import { PhotoLightbox } from "@/components/photos/photo-lightbox";
import { SlideshowPlayer } from "@/components/photos/slideshow-player";
import { PhotoEditor } from "@/components/photos/photo-editor";
import { AddToAlbumModal } from "@/components/photos/album-modals";
import { cn } from "@/lib/utils";
import type { PhotoItem } from "@/lib/types";

export function PhotoFolders() {
  const [prefix, setPrefix] = useState("");
  const { data: folders = [], isLoading } = usePhotoFolders();

  const [lightbox, setLightbox] = useState<number | null>(null);
  const [slideshow, setSlideshow] = useState<number | null>(null);
  const [editing, setEditing] = useState<PhotoItem | null>(null);
  const [addToAlbum, setAddToAlbum] = useState<string | null>(null);

  // Subfolders + direct-file count at the current prefix.
  const { subfolders } = useMemo(() => {
    const map = new Map<string, number>();
    let direct = 0;
    for (const { folder, count } of folders) {
      if (folder === prefix) { direct += count; continue; }
      let rest: string | null;
      if (prefix === "") rest = folder;
      else if (folder.startsWith(prefix + "/")) rest = folder.slice(prefix.length + 1);
      else rest = null;
      if (!rest) continue;
      const seg = rest.split("/")[0];
      map.set(seg, (map.get(seg) ?? 0) + count);
    }
    return {
      directCount: direct,
      subfolders: [...map.entries()]
        .map(([name, count]) => ({ name, path: prefix ? `${prefix}/${name}` : name, count }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    };
  }, [folders, prefix]);

  // Photos directly inside the current folder.
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading: photosLoading } = usePhotos({ folder: prefix });
  const photos: PhotoItem[] = useMemo(() => (data?.pages ?? []).flatMap((p) => p.photos), [data]);

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

  const crumbs = prefix ? prefix.split("/") : [];

  if (isLoading) {
    return <div className="flex justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  if (folders.length === 0) {
    return <div className="glass-card py-20 text-center text-sm text-muted">No folders indexed yet.</div>;
  }

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <nav className="flex flex-wrap items-center gap-1 text-sm">
        <button
          onClick={() => setPrefix("")}
          className={cn("flex items-center gap-1.5 rounded-lg px-2 py-1 hover:bg-surface-3", prefix ? "text-muted hover:text-foreground" : "text-foreground")}
        >
          <Home className="h-4 w-4" /> All folders
        </button>
        {crumbs.map((seg, i) => {
          const target = crumbs.slice(0, i + 1).join("/");
          const last = i === crumbs.length - 1;
          return (
            <span key={target} className="flex min-w-0 items-center gap-1">
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-2" />
              <button
                onClick={() => setPrefix(target)}
                className={cn("truncate rounded-lg px-2 py-1 hover:bg-surface-3", last ? "text-foreground" : "text-muted hover:text-foreground")}
              >
                {seg}
              </button>
            </span>
          );
        })}
      </nav>

      {/* Subfolders */}
      {subfolders.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {subfolders.map((sf) => (
            <motion.button
              key={sf.path}
              whileHover={{ y: -3 }}
              onClick={() => setPrefix(sf.path)}
              className="group flex flex-col items-center gap-3 rounded-2xl border border-stroke bg-surface-2/60 p-5 text-center transition-colors hover:border-primary/40 hover:bg-surface-2"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/12 text-primary transition-transform group-hover:scale-110">
                <Folder className="h-7 w-7" />
              </span>
              <span className="w-full min-w-0">
                <span title={sf.name} className="block break-words text-sm font-semibold leading-snug text-foreground line-clamp-2">{sf.name}</span>
                <span className="mt-0.5 block text-[11px] text-muted-2">{sf.count} photo{sf.count === 1 ? "" : "s"}</span>
              </span>
            </motion.button>
          ))}
        </div>
      )}

      {/* Photos directly in this folder */}
      {photosLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : photos.length > 0 ? (
        <>
          <PhotoGrid photos={photos} onOpen={setLightbox} />
          <div ref={sentinel} className="h-12" />
          {isFetchingNextPage && <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>}
        </>
      ) : subfolders.length === 0 ? (
        <div className="glass-card flex flex-col items-center py-16 text-center">
          <Images className="mb-3 h-8 w-8 text-muted-2" />
          <p className="text-sm font-medium text-foreground">This folder is empty</p>
        </div>
      ) : null}

      {lightbox !== null && (
        <PhotoLightbox
          photos={photos}
          index={lightbox}
          onClose={() => setLightbox(null)}
          onIndexChange={setLightbox}
          onAddToAlbum={(pid) => setAddToAlbum(pid)}
          onSlideshow={(i) => { setLightbox(null); setSlideshow(i); }}
          onEdit={(p) => { setLightbox(null); setEditing(p); }}
        />
      )}
      {slideshow !== null && photos.length > 0 && (
        <SlideshowPlayer photos={photos} startIndex={slideshow} onClose={() => setSlideshow(null)} />
      )}
      {editing && <PhotoEditor photo={editing} onClose={() => setEditing(null)} />}
      {addToAlbum && <AddToAlbumModal photoIds={[addToAlbum]} onClose={() => setAddToAlbum(null)} />}
    </div>
  );
}
