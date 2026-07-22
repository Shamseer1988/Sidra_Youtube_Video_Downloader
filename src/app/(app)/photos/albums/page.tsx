"use client";

import { useState } from "react";
import Link from "next/link";
import { Clock, FolderPlus, Images, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { AlbumCard } from "@/components/photos/album-card";
import { CreateAlbumModal } from "@/components/photos/album-modals";
import { useAlbums } from "@/hooks/use-photos";

export default function AlbumsPage() {
  const { data: albums = [], isLoading } = useAlbums(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="mx-auto max-w-[1600px] space-y-5">
      <PageHeader
        title="Albums"
        subtitle={albums.length ? `${albums.length} album${albums.length === 1 ? "" : "s"}` : "Organize your photos"}
        actions={
          <>
            <Link
              href="/photos"
              className="flex h-9 items-center gap-1.5 rounded-lg border border-stroke bg-surface-2/60 px-3 text-sm text-muted hover:text-foreground"
            >
              <Clock className="h-4 w-4" /> Timeline
            </Link>
            <button
              onClick={() => setCreating(true)}
              className="flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-white hover:bg-primary/90"
            >
              <FolderPlus className="h-4 w-4" /> New Album
            </button>
          </>
        }
      />

      {isLoading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : albums.length === 0 ? (
        <div className="glass-card flex flex-col items-center py-20 text-center">
          <Images className="mb-3 h-9 w-9 text-muted-2" />
          <p className="text-base font-semibold text-foreground">No albums yet</p>
          <p className="mt-1 max-w-sm text-sm text-muted">
            Create an album to group photos — you can nest albums, keep them private, or protect them with a password.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {albums.map((album, i) => (
            <AlbumCard key={album.id} album={album} index={i} />
          ))}
        </div>
      )}

      {creating && <CreateAlbumModal onClose={() => setCreating(false)} />}
    </div>
  );
}
