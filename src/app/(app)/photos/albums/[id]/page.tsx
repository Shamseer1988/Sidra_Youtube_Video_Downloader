"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  ChevronRight, FolderPlus, ImagePlus, Loader2, Lock, MoreVertical, Pin, Heart, EyeOff, Trash2, Pencil, KeyRound,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { PhotoGrid } from "@/components/photos/photo-grid";
import { PhotoLightbox } from "@/components/photos/photo-lightbox";
import { AlbumCard } from "@/components/photos/album-card";
import { CreateAlbumModal } from "@/components/photos/album-modals";
import { PhotoPickerModal } from "@/components/photos/photo-picker-modal";
import { useAlbum, useAlbums, useAlbumPhotos } from "@/hooks/use-photos";
import { apiSend } from "@/lib/client-api";
import { useToast } from "@/components/providers/toast-provider";
import { cn } from "@/lib/utils";
import type { PhotoItem } from "@/lib/types";

export default function AlbumDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();

  const { data: album, isLoading } = useAlbum(id);
  const [pw, setPw] = useState<string | null>(null);
  const [pwInput, setPwInput] = useState("");
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [picking, setPicking] = useState(false);
  const [subAlbum, setSubAlbum] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Restore a previous unlock for this session.
  useEffect(() => {
    const saved = sessionStorage.getItem(`album-pw-${id}`);
    if (saved) setPw(saved);
  }, [id]);

  const unlocked = !album?.locked || !!pw;
  const { data: children = [] } = useAlbums(id);
  const {
    data: photoPages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useAlbumPhotos(id, pw, unlocked && !!album);

  const photos: PhotoItem[] = useMemo(
    () => (photoPages?.pages ?? []).flatMap((p) => p.photos),
    [photoPages],
  );

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

  async function unlock() {
    try {
      await apiSend("POST", `/api/albums/${id}/verify`, { password: pwInput });
      sessionStorage.setItem(`album-pw-${id}`, pwInput);
      setPw(pwInput);
      setPwInput("");
    } catch (e) {
      toast((e as Error).message || "Incorrect password", "error");
    }
  }

  async function patch(data: Record<string, unknown>, msg?: string) {
    try {
      await apiSend("PATCH", `/api/albums/${id}`, data);
      qc.invalidateQueries({ queryKey: ["album", id] });
      qc.invalidateQueries({ queryKey: ["albums"] });
      if (msg) toast(msg, "success");
    } catch (e) {
      toast((e as Error).message || "Update failed", "error");
    }
  }

  async function rename() {
    const name = window.prompt("Album name", album?.name ?? "");
    if (name && name.trim()) patch({ name: name.trim() }, "Renamed");
  }

  async function setPassword() {
    const p = window.prompt("Set a password (leave blank to remove)", "");
    if (p === null) return;
    patch({ password: p.trim() || null }, p.trim() ? "Password set" : "Password removed");
  }

  async function del() {
    if (!window.confirm(`Delete album "${album?.name}"? Photos themselves are not deleted.`)) return;
    try {
      await apiSend("DELETE", `/api/albums/${id}`);
      qc.invalidateQueries({ queryKey: ["albums"] });
      toast("Album deleted", "success");
      router.push("/photos/albums");
    } catch {
      toast("Could not delete", "error");
    }
  }

  async function removeFromAlbum(photoId: string) {
    try {
      await apiSend("DELETE", `/api/albums/${id}/photos`, { photoIds: [photoId] });
      setLightbox(null);
      refetch();
      qc.invalidateQueries({ queryKey: ["album", id] });
      toast("Removed from album", "success");
    } catch {
      toast("Could not remove", "error");
    }
  }

  if (isLoading || !album) {
    return (
      <div className="flex justify-center py-32">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-5">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted">
        <Link href="/photos/albums" className="rounded px-1.5 py-0.5 hover:text-foreground">Albums</Link>
        {album.breadcrumb.map((c) => (
          <span key={c.id} className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5 text-muted-2" />
            <Link href={`/photos/albums/${c.id}`} className="rounded px-1.5 py-0.5 hover:text-foreground">{c.name}</Link>
          </span>
        ))}
        <ChevronRight className="h-3.5 w-3.5 text-muted-2" />
        <span className="px-1.5 py-0.5 text-foreground">{album.name}</span>
      </nav>

      <PageHeader
        title={album.name}
        subtitle={`${album.photoCount} photo${album.photoCount === 1 ? "" : "s"}${album.childCount ? ` · ${album.childCount} sub-albums` : ""}`}
        actions={
          album.isOwner ? (
            <>
              <button
                onClick={() => setSubAlbum(true)}
                className="flex h-9 items-center gap-1.5 rounded-lg border border-stroke bg-surface-2/60 px-3 text-sm text-muted hover:text-foreground"
              >
                <FolderPlus className="h-4 w-4" /> Sub-album
              </button>
              <button
                onClick={() => setPicking(true)}
                className="flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-white hover:bg-primary/90"
              >
                <ImagePlus className="h-4 w-4" /> Add photos
              </button>
              <div className="relative">
                <button
                  onClick={() => setMenuOpen((o) => !o)}
                  onBlur={() => setTimeout(() => setMenuOpen(false), 150)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-stroke bg-surface-2/60 text-muted hover:text-foreground"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 z-20 mt-1 w-52 overflow-hidden rounded-xl border border-stroke bg-surface-1 shadow-xl">
                    <MenuItem icon={<Pencil className="h-4 w-4" />} onClick={rename}>Rename</MenuItem>
                    <MenuItem icon={<Heart className={cn("h-4 w-4", album.favorite && "fill-current text-danger")} />} onClick={() => patch({ favorite: !album.favorite })}>
                      {album.favorite ? "Unfavorite" : "Favorite"}
                    </MenuItem>
                    <MenuItem icon={<Pin className={cn("h-4 w-4", album.pinned && "fill-current text-primary")} />} onClick={() => patch({ pinned: !album.pinned })}>
                      {album.pinned ? "Unpin" : "Pin"}
                    </MenuItem>
                    <MenuItem icon={<EyeOff className="h-4 w-4" />} onClick={() => patch({ isPrivate: !album.isPrivate })}>
                      {album.isPrivate ? "Make public" : "Make private"}
                    </MenuItem>
                    <MenuItem icon={<KeyRound className="h-4 w-4" />} onClick={setPassword}>
                      {album.locked ? "Change / remove password" : "Set password"}
                    </MenuItem>
                    <MenuItem icon={<Trash2 className="h-4 w-4" />} onClick={del} danger>Delete album</MenuItem>
                  </div>
                )}
              </div>
            </>
          ) : undefined
        }
      />

      {/* Password gate */}
      {album.locked && !pw ? (
        <div className="glass-card mx-auto flex max-w-sm flex-col items-center gap-3 py-12 text-center">
          <Lock className="h-8 w-8 text-muted-2" />
          <p className="text-sm font-medium text-foreground">This album is protected</p>
          <div className="flex w-full max-w-xs gap-2">
            <input
              type="password"
              value={pwInput}
              onChange={(e) => setPwInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && unlock()}
              placeholder="Password"
              className="h-9 flex-1 rounded-lg border border-stroke bg-surface-2 px-3 text-sm text-foreground focus:border-primary/50 focus:outline-none"
            />
            <button onClick={unlock} className="h-9 rounded-lg bg-primary px-3 text-sm font-medium text-white hover:bg-primary/90">
              Unlock
            </button>
          </div>
        </div>
      ) : (
        <>
          {children.length > 0 && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {children.map((c, i) => (
                <AlbumCard key={c.id} album={c} index={i} />
              ))}
            </div>
          )}

          {photos.length === 0 ? (
            <div className="glass-card flex flex-col items-center py-16 text-center">
              <ImagePlus className="mb-3 h-8 w-8 text-muted-2" />
              <p className="text-sm font-medium text-foreground">This album is empty</p>
              {album.isOwner && <p className="mt-1 text-xs text-muted">Use “Add photos” to fill it.</p>}
            </div>
          ) : (
            <>
              <PhotoGrid photos={photos} onOpen={setLightbox} />
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
          onRemove={album.isOwner ? removeFromAlbum : undefined}
          removeLabel="Remove from album"
        />
      )}

      {picking && (
        <PhotoPickerModal
          albumId={id}
          onClose={() => setPicking(false)}
          onAdded={() => {
            refetch();
            qc.invalidateQueries({ queryKey: ["album", id] });
          }}
        />
      )}

      {subAlbum && <CreateAlbumModal parentId={id} onClose={() => setSubAlbum(false)} />}
    </div>
  );
}

function MenuItem({
  icon,
  children,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onMouseDown={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm hover:bg-surface-3",
        danger ? "text-danger" : "text-foreground",
      )}
    >
      {icon}
      {children}
    </button>
  );
}
