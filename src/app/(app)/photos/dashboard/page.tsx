"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  CalendarDays, Camera, Clock, HardDrive, Images, Loader2, MapPin, Sparkles,
} from "lucide-react";
import { usePhotoDashboard } from "@/hooks/use-photos";
import { useUser } from "@/components/providers/user-provider";
import { PhotoLightbox } from "@/components/photos/photo-lightbox";
import { AlbumCard } from "@/components/photos/album-card";
import { formatBytes } from "@/lib/utils";
import type { PhotoItem } from "@/lib/types";

export default function PhotosDashboardPage() {
  const user = useUser();
  const { data, isLoading } = usePhotoDashboard();
  const [box, setBox] = useState<{ photos: PhotoItem[]; index: number } | null>(null);

  if (isLoading || !data) {
    return (
      <div className="flex justify-center py-32">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const { stats, recent, memories, albums } = data;

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative overflow-hidden rounded-3xl border border-stroke bg-[#0a0716]"
      >
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="animate-aurora absolute -left-1/4 -top-1/2 h-[140%] w-[80%] rounded-full bg-[radial-gradient(closest-side,rgba(124,58,237,0.45),transparent)] blur-3xl" />
          <div
            className="animate-aurora absolute -right-1/4 -bottom-1/2 h-[150%] w-[85%] rounded-full bg-[radial-gradient(closest-side,rgba(59,130,246,0.35),transparent)] blur-3xl"
            style={{ animationDelay: "-7s" }}
          />
          <div className="bg-grid-pattern absolute inset-0 opacity-60" />
        </div>
        <div className="relative z-10 p-6 sm:p-8">
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Your Photos, <span className="capitalize">{user.username}</span> 📷
          </h1>
          <p className="mt-2 max-w-xl text-sm text-white/65">
            {stats.totalPhotos.toLocaleString()} photos across {stats.years} year{stats.years === 1 ? "" : "s"},
            {" "}{formatBytes(stats.totalSize, 1)} in your library.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <HeroChip icon={<Images className="h-4 w-4" />} primary={stats.totalPhotos.toLocaleString()} secondary="photos" />
            <HeroChip icon={<HardDrive className="h-4 w-4" />} primary={formatBytes(stats.totalSize, 1)} secondary="stored" />
            <HeroChip icon={<Images className="h-4 w-4" />} primary={`${stats.albums}`} secondary="albums" />
            <HeroChip icon={<MapPin className="h-4 w-4" />} primary={stats.geotagged.toLocaleString()} secondary="geotagged" />
          </div>
        </div>
      </motion.section>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={<Images className="h-5 w-5" />} label="Photos" value={stats.totalPhotos.toLocaleString()} href="/photos" />
        <StatCard icon={<Camera className="h-5 w-5" />} label="Cameras" value={String(stats.cameras)} href="/photos" />
        <StatCard icon={<MapPin className="h-5 w-5" />} label="On the map" value={stats.geotagged.toLocaleString()} href="/photos?view=map" />
        <StatCard icon={<Images className="h-5 w-5" />} label="Albums" value={String(stats.albums)} href="/photos/albums" />
      </div>

      {/* Memories — On this day */}
      {memories.length > 0 && (
        <section className="glass-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold text-foreground">On this day</h2>
          </div>
          <div className="space-y-5">
            {memories.map((m) => (
              <div key={m.year}>
                <p className="mb-2 flex items-center gap-1.5 text-sm text-muted">
                  <CalendarDays className="h-4 w-4" /> {new Date().getFullYear() - m.year} year
                  {new Date().getFullYear() - m.year === 1 ? "" : "s"} ago · {m.year}
                </p>
                <PhotoStrip
                  photos={m.photos}
                  onOpen={(i) => setBox({ photos: m.photos, index: i })}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recent uploads */}
      {recent.length > 0 && (
        <section className="glass-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <h2 className="text-base font-semibold text-foreground">Recently added</h2>
            </div>
            <Link href="/photos" className="rounded-lg border border-stroke px-3 py-1.5 text-xs text-muted hover:text-foreground">
              View all
            </Link>
          </div>
          <PhotoStrip photos={recent} onOpen={(i) => setBox({ photos: recent, index: i })} />
        </section>
      )}

      {/* Albums */}
      {albums.length > 0 && (
        <section className="glass-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Images className="h-5 w-5 text-primary" />
              <h2 className="text-base font-semibold text-foreground">Albums</h2>
            </div>
            <Link href="/photos/albums" className="rounded-lg border border-stroke px-3 py-1.5 text-xs text-muted hover:text-foreground">
              All albums
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            {albums.map((a, i) => (
              <AlbumCard key={a.id} album={a} index={i} />
            ))}
          </div>
        </section>
      )}

      {box && (
        <PhotoLightbox
          photos={box.photos}
          index={box.index}
          onClose={() => setBox(null)}
          onIndexChange={(i) => setBox((b) => (b ? { ...b, index: i } : b))}
        />
      )}
    </div>
  );
}

function HeroChip({ icon, primary, secondary }: { icon: React.ReactNode; primary: string; secondary: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 backdrop-blur-xl">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/85">{icon}</span>
      <div>
        <p className="text-sm font-semibold leading-tight text-white">{primary}</p>
        <p className="text-xs leading-tight text-white/60">{secondary}</p>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, href }: { icon: React.ReactNode; label: string; value: string; href: string }) {
  return (
    <Link href={href} className="glass-card flex items-center gap-3 p-4 transition-colors hover:border-primary/40">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">{icon}</span>
      <div>
        <p className="text-xl font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-2">{label}</p>
      </div>
    </Link>
  );
}

function PhotoStrip({ photos, onOpen }: { photos: PhotoItem[]; onOpen: (index: number) => void }) {
  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
      {photos.map((p, i) => (
        <button
          key={p.id}
          onClick={() => onOpen(i)}
          className="group relative h-28 w-28 shrink-0 overflow-hidden rounded-xl bg-surface-2 sm:h-32 sm:w-32"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/photos/${p.id}/thumbnail?size=400`}
            alt={p.filename}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={(e) => ((e.target as HTMLImageElement).style.visibility = "hidden")}
          />
        </button>
      ))}
    </div>
  );
}
