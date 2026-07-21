"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ChevronRight,
  Clock,
  Folder,
  FolderOpen,
  Home,
  Library as LibraryIcon,
  Play,
  Search,
} from "lucide-react";
import { cn, formatDuration } from "@/lib/utils";
import { useLibraryItems, useLibraries } from "@/hooks/use-library";
import { categoryIcon, type LibraryCategory } from "@/lib/categories";
import type { LibraryItem } from "@/lib/types";
import { usePlayer } from "@/components/player/player-provider";
import { MediaThumb } from "@/components/media/media-thumb";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

/* ------------------------------------------------------------------ */
/*  Folder maths                                                       */
/* ------------------------------------------------------------------ */

interface LevelContents {
  subfolders: { name: string; path: string; count: number }[];
  files: LibraryItem[];
}

function levelContents(items: LibraryItem[], prefix: string): LevelContents {
  const subfolders = new Map<string, number>();
  const files: LibraryItem[] = [];

  for (const item of items) {
    const folder = item.folder || "";
    if (folder === prefix) {
      files.push(item);
      continue;
    }
    const inside =
      prefix === "" ? folder : folder.startsWith(prefix + "/") ? folder.slice(prefix.length + 1) : null;
    if (prefix === "" ? folder !== "" : inside !== null) {
      const rest = prefix === "" ? folder : (inside as string);
      const seg = rest.split("/")[0];
      subfolders.set(seg, (subfolders.get(seg) ?? 0) + 1);
    }
  }

  return {
    subfolders: [...subfolders.entries()]
      .map(([name, count]) => ({ name, path: prefix ? `${prefix}/${name}` : name, count }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    files: files.sort((a, b) => a.title.localeCompare(b.title)),
  };
}

/* ------------------------------------------------------------------ */
/*  Tiles                                                              */
/* ------------------------------------------------------------------ */

const aspectByCategory: Record<string, string> = {
  movies: "aspect-[2/3]",
  tv: "aspect-[2/3]",
  videos: "aspect-video",
  music: "aspect-square",
};

function FolderTile({
  label,
  count,
  onOpen,
  icon,
}: {
  label: string;
  count: number;
  onOpen: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <motion.button
      whileHover={{ y: -3 }}
      onClick={onOpen}
      className="group flex flex-col items-center gap-3 rounded-2xl border border-stroke bg-surface-2/60 p-5 text-center transition-colors hover:border-primary/40 hover:bg-surface-2"
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/12 text-primary transition-transform group-hover:scale-110">
        {icon ?? <Folder className="h-7 w-7" />}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-foreground">{label}</span>
        <span className="block text-[11px] text-muted-2">
          {count} item{count === 1 ? "" : "s"}
        </span>
      </span>
    </motion.button>
  );
}

function FileTile({
  item,
  aspect,
  onPlay,
}: {
  item: LibraryItem;
  aspect: string;
  onPlay?: () => void;
}) {
  const progress = item.state?.position && item.duration
    ? Math.min(100, (item.state.position / item.duration) * 100)
    : 0;

  const inner = (
    <>
      <div
          className={cn(
            "relative overflow-hidden rounded-2xl border border-stroke shadow-lg shadow-black/25 transition-all duration-300 group-hover:border-primary/40 group-hover:shadow-2xl group-hover:shadow-primary/15",
            aspect
          )}
        >
          <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-105">
            <MediaThumb id={item.id} title={item.title} type={item.type} hasThumbnail={!!item.thumbnail} />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent" />

          <div className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-11 w-11 scale-75 items-center justify-center rounded-full bg-white/15 text-white opacity-0 shadow-xl backdrop-blur-md ring-1 ring-white/30 transition-all duration-300 group-hover:scale-100 group-hover:opacity-100">
              <Play className="ml-0.5 h-4 w-4 fill-white" />
            </span>
          </div>

          {item.state?.favorite && (
            <Badge size="sm" className="absolute right-2 top-2 border-danger/40 bg-black/50 text-danger backdrop-blur">
              ♥
            </Badge>
          )}
          {item.state?.watchLater && (
            <span className="absolute left-2 top-2 rounded-full bg-black/50 p-1 text-white backdrop-blur">
              <Clock className="h-3 w-3" />
            </span>
          )}

          {progress > 2 && (
            <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20">
              <div className="h-full bg-gradient-to-r from-primary to-accent" style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>
        <p className="mt-2 truncate text-[13px] font-medium text-foreground">{item.title}</p>
        <p className="text-[11px] text-muted-2">
          {item.duration ? formatDuration(item.duration) : item.ext?.toUpperCase()}
          {item.height ? ` · ${item.height}p` : ""}
        </p>
    </>
  );

  if (onPlay) {
    return (
      <motion.button whileHover={{ y: -4 }} onClick={onPlay} className="group block w-full text-left">
        {inner}
      </motion.button>
    );
  }

  return (
    <motion.div whileHover={{ y: -4 }} className="group">
      <Link href={`/watch/${item.id}`} className="block">
        {inner}
      </Link>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Explorer                                                           */
/* ------------------------------------------------------------------ */

export function CategoryExplorer({ category }: { category: LibraryCategory }) {
  const player = usePlayer();
  const { data: libraries = [], isLoading: libLoading } = useLibraries(category);
  const [libraryId, setLibraryId] = useState<string | null>(null);
  const [folder, setFolder] = useState("");
  const [query, setQuery] = useState("");

  const activeLibrary = libraries.find((l) => l.id === libraryId) ?? null;

  const { data: items = [], isLoading: itemsLoading } = useLibraryItems(
    { category, libraryId: libraryId ?? undefined },
    { enabled: !!libraryId }
  );

  const searching = query.trim().length > 0;
  const filtered = useMemo(
    () => (searching ? items.filter((i) => i.title.toLowerCase().includes(query.toLowerCase())) : items),
    [items, query, searching]
  );

  const level = useMemo(
    () => (searching ? { subfolders: [], files: filtered } : levelContents(items, folder)),
    [items, folder, searching, filtered]
  );

  const CatIcon = categoryIcon[category] ?? LibraryIcon;

  function enterLibrary(id: string) {
    setLibraryId(id);
    setFolder("");
    setQuery("");
  }

  const crumbs = folder ? folder.split("/") : [];

  return (
    <div className="space-y-4">
      {/* Toolbar: breadcrumb + search */}
      <div className="glass-card flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center">
        <nav aria-label="Breadcrumb" className="flex min-w-0 flex-1 items-center gap-1 text-sm">
          <button
            onClick={() => { setLibraryId(null); setFolder(""); setQuery(""); }}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-2 py-1 transition-colors hover:bg-surface-3",
              !activeLibrary ? "text-foreground" : "text-muted hover:text-foreground"
            )}
          >
            <CatIcon className="h-4 w-4" /> <span className="capitalize">{category}</span>
          </button>
          {activeLibrary && (
            <>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-2" />
              <button
                onClick={() => { setFolder(""); setQuery(""); }}
                className={cn(
                  "truncate rounded-lg px-2 py-1 transition-colors hover:bg-surface-3",
                  folder ? "text-muted hover:text-foreground" : "text-foreground"
                )}
              >
                {activeLibrary.name}
              </button>
            </>
          )}
          {crumbs.map((seg, i) => {
            const target = crumbs.slice(0, i + 1).join("/");
            const last = i === crumbs.length - 1;
            return (
              <span key={target} className="flex min-w-0 items-center gap-1">
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-2" />
                <button
                  onClick={() => setFolder(target)}
                  className={cn(
                    "truncate rounded-lg px-2 py-1 transition-colors hover:bg-surface-3",
                    last ? "text-foreground" : "text-muted hover:text-foreground"
                  )}
                >
                  {seg}
                </button>
              </span>
            );
          })}
        </nav>

        {activeLibrary && (
          <div className="relative sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${activeLibrary.name}…`}
              className="h-9 w-full rounded-xl border border-stroke bg-surface-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-2 focus:border-primary/50"
            />
          </div>
        )}
      </div>

      {/* Library selection level */}
      {!activeLibrary ? (
        libLoading ? (
          <TileSkeletons />
        ) : libraries.length === 0 ? (
          <EmptyState category={category} />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {libraries.map((lib) => (
              <FolderTile
                key={lib.id}
                label={lib.name}
                count={lib.itemCount}
                onOpen={() => enterLibrary(lib.id)}
                icon={<CatIcon className="h-7 w-7" />}
              />
            ))}
          </div>
        )
      ) : itemsLoading ? (
        <TileSkeletons />
      ) : level.subfolders.length === 0 && level.files.length === 0 ? (
        <div className="glass-card flex flex-col items-center py-20 text-center">
          <FolderOpen className="mb-3 h-8 w-8 text-muted-2" />
          <p className="text-sm font-medium text-foreground">
            {searching ? "No matches" : "This folder is empty"}
          </p>
          <p className="mt-1 text-xs text-muted">
            {searching ? "Try a different search." : "Run a scan from Settings if you just added files."}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {level.subfolders.length > 0 && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {level.subfolders.map((sf) => (
                <FolderTile
                  key={sf.path}
                  label={sf.name}
                  count={sf.count}
                  onOpen={() => setFolder(sf.path)}
                />
              ))}
            </div>
          )}
          {level.files.length > 0 && (
            <div
              className={cn(
                "grid gap-4",
                category === "music"
                  ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
                  : category === "videos"
                    ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                    : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
              )}
            >
              {level.files.map((item, i) => (
                <FileTile
                  key={item.id}
                  item={item}
                  aspect={aspectByCategory[category]}
                  onPlay={
                    category === "music"
                      ? () => player.playQueue(level.files, i)
                      : undefined
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TileSkeletons() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {Array.from({ length: 10 }).map((_, i) => (
        <Skeleton key={i} className="aspect-[2/3] rounded-2xl" />
      ))}
    </div>
  );
}

function EmptyState({ category }: { category: string }) {
  return (
    <div className="glass-card flex flex-col items-center py-20 text-center">
      <Home className="mb-3 h-9 w-9 text-muted-2" />
      <p className="text-base font-semibold text-foreground">No {category} libraries yet</p>
      <p className="mt-1 max-w-sm text-sm text-muted">
        Go to <Link href="/settings" className="text-primary hover:underline">Settings</Link> and add a
        folder from your NAS, tagged as <span className="capitalize text-foreground">{category}</span>.
      </p>
    </div>
  );
}
