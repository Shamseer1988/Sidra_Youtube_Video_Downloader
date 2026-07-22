"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { FolderLock, Heart, Images, Lock, Pin } from "lucide-react";
import type { AlbumSummary } from "@/lib/types";

export function AlbumCard({ album, index }: { album: AlbumSummary; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3), duration: 0.3 }}
    >
      <Link href={`/photos/albums/${album.id}`} className="group block">
        <div className="relative aspect-square overflow-hidden rounded-2xl border border-stroke bg-surface-2 transition-all duration-300 group-hover:border-primary/40 group-hover:shadow-xl group-hover:shadow-primary/10">
          {album.coverPhotoId && !album.locked ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/photos/${album.coverPhotoId}/thumbnail?size=400`}
              alt=""
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-2">
              {album.locked ? <FolderLock className="h-10 w-10" /> : <Images className="h-10 w-10" />}
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

          <div className="absolute right-2 top-2 flex gap-1.5">
            {album.pinned && (
              <span className="rounded-full bg-black/50 p-1.5 text-white backdrop-blur">
                <Pin className="h-3.5 w-3.5 fill-current" />
              </span>
            )}
            {album.favorite && (
              <span className="rounded-full bg-black/50 p-1.5 text-danger backdrop-blur">
                <Heart className="h-3.5 w-3.5 fill-current" />
              </span>
            )}
            {album.isPrivate && (
              <span className="rounded-full bg-black/50 p-1.5 text-white backdrop-blur">
                <Lock className="h-3.5 w-3.5" />
              </span>
            )}
          </div>

          <div className="absolute inset-x-0 bottom-0 p-3">
            <p className="truncate text-sm font-semibold text-white">{album.name}</p>
            <p className="text-[11px] text-white/60">
              {album.photoCount} photo{album.photoCount === 1 ? "" : "s"}
              {album.childCount > 0 ? ` · ${album.childCount} album${album.childCount === 1 ? "" : "s"}` : ""}
            </p>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
