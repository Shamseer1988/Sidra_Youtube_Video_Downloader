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
      <span className="w-full min-w-0">
        <span
          title={label}
          className="block break-words text-sm font-semibold leading-snug text-foreground line-clamp-2"
        >
          {label}
        </span>
        <span className="mt-0.5 block text-[11px] text-muted-2">
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
/*  Views (grouping / sorting of a library's items)                    */
/* ------------------------------------------------------------------ */

type ViewMode =
  | "folder"
  | "all"
  | "recent-added"
  | "recent-played"
  | "continue"
  | "years"
  | "resolution"
  | "duration"
  | "filetype";

const VIEW_OPTIONS: { v: ViewMode; label: string }[] = [
  { v: "folder", label: "Folders" },
  { v: "all", label: "All Media" },
  { v: "recent-added", label: "Recently Added" },
  { v: "recent-played", label: "Recently Played" },
  { v: "continue", label: "Continue" },
  { v: "years", label: "Years" },
  { v: "resolution", label: "Resolution" },
  { v: "duration", label: "Duration" },
  { v: "filetype", label: "File Type" },
];

function viewsForCategory(category: string): { v: ViewMode; label: string }[] {
  // Resolution grouping is meaningless for audio-only libraries.
  return category === "music" ? VIEW_OPTIONS.filter((o) => o.v !== "resolution") : VIEW_OPTIONS;
}

const byTitle = (items: LibraryItem[]) =>
  [...items].sort((a, b) => a.title.localeCompare(b.title));

interface Group {
  label: string;
  items: LibraryItem[];
}

function groupBy(items: LibraryItem[], keyOf: (i: LibraryItem) => string, order?: string[]): Group[] {
  const map = new Map<string, LibraryItem[]>();
  for (const it of items) {
    const key = keyOf(it);
    const bucket = map.get(key);
    if (bucket) bucket.push(it);
    else map.set(key, [it]);
  }
  const entries = [...map.entries()];
  if (order) entries.sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));
  else entries.sort((a, b) => a[0].localeCompare(b[0]));
  return entries.map(([label, its]) => ({ label, items: byTitle(its) }));
}

const RES_ORDER = ["4K", "1080p", "720p", "SD", "Unknown"];
function resBucket(h: number | null): string {
  if (!h) return "Unknown";
  if (h >= 2160) return "4K";
  if (h >= 1080) return "1080p";
  if (h >= 720) return "720p";
  return "SD";
}

const DUR_ORDER = ["Under 5 min", "5–20 min", "20–60 min", "Over 1 hour", "Unknown"];
function durBucket(d: number | null): string {
  if (!d) return "Unknown";
  if (d < 300) return "Under 5 min";
  if (d < 1200) return "5–20 min";
  if (d < 3600) return "20–60 min";
  return "Over 1 hour";
}

function fileYear(item: LibraryItem): string {
  const y = new Date(item.mtime).getFullYear();
  return Number.isFinite(y) && y > 1900 ? String(y) : "Unknown";
}

/** Turn a library's flat item list into the sections a given view shows. */
function buildView(view: ViewMode, items: LibraryItem[]): Group[] {
  switch (view) {
    case "all":
      return [{ label: "", items: byTitle(items) }];
    case "recent-added":
      return [{ label: "", items: [...items].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")) }];
    case "recent-played":
      return [
        {
          label: "",
          items: items
            .filter((i) => i.state?.playedAt)
            .sort((a, b) => (b.state?.playedAt || "").localeCompare(a.state?.playedAt || "")),
        },
      ];
    case "continue":
      return [
        {
          label: "",
          items: items
            .filter((i) => (i.state?.position ?? 0) > 0 && !i.state?.finished)
            .sort((a, b) => (b.state?.playedAt || "").localeCompare(a.state?.playedAt || "")),
        },
      ];
    case "years": {
      const groups = groupBy(items, fileYear);
      // Newest year first, "Unknown" last.
      return groups.sort((a, b) => {
        if (a.label === "Unknown") return 1;
        if (b.label === "Unknown") return -1;
        return Number(b.label) - Number(a.label);
      });
    }
    case "resolution":
      return groupBy(items, (i) => resBucket(i.height), RES_ORDER);
    case "duration":
      return groupBy(items, (i) => durBucket(i.duration), DUR_ORDER);
    case "filetype":
      return groupBy(items, (i) => (i.ext || "?").toUpperCase());
    default:
      return [];
  }
}

function fileGridClass(category: string): string {
  return cn(
    "grid gap-4",
    category === "music"
      ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
      : category === "videos"
        ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
  );
}

function FileGrid({
  category,
  items,
  onPlayAt,
}: {
  category: LibraryCategory;
  items: LibraryItem[];
  onPlayAt?: (list: LibraryItem[], index: number) => void;
}) {
  return (
    <div className={fileGridClass(category)}>
      {items.map((item, i) => (
        <FileTile
          key={item.id}
          item={item}
          aspect={aspectByCategory[category]}
          onPlay={onPlayAt ? () => onPlayAt(items, i) : undefined}
        />
      ))}
    </div>
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
  const [view, setView] = useState<ViewMode>("folder");

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
    setView("folder");
  }

  function backToLibraries() {
    setLibraryId(null);
    setFolder("");
    setQuery("");
    setView("folder");
  }

  // Switching to a non-folder view abandons the folder path (it no longer
  // applies), so browsing stays coherent.
  function selectView(v: ViewMode) {
    setView(v);
    if (v !== "folder") setFolder("");
  }

  const crumbs = view === "folder" && folder ? folder.split("/") : [];

  return (
    <div className="space-y-4">
      {/* Toolbar: breadcrumb + search */}
      <div className="glass-card flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center">
        <nav aria-label="Breadcrumb" className="flex min-w-0 flex-1 items-center gap-1 text-sm">
          <button
            onClick={backToLibraries}
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

      {/* View selector — instant client-side re-grouping of a library */}
      {activeLibrary && (
        <div className="no-scrollbar -mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1">
          {viewsForCategory(category).map((opt) => (
            <button
              key={opt.v}
              onClick={() => selectView(opt.v)}
              className={cn(
                "shrink-0 snap-start rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                view === opt.v
                  ? "border-primary/40 bg-primary/15 text-primary"
                  : "border-stroke bg-surface-2/60 text-muted hover:text-foreground"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

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
      ) : view !== "folder" ? (
        itemsLoading ? (
          <TileSkeletons />
        ) : (
          <ViewSections
            category={category}
            groups={buildView(view, searching ? filtered : items).filter((g) => g.items.length > 0)}
            searching={searching}
            onPlayAt={category === "music" ? player.playQueue : undefined}
          />
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
            <FileGrid
              category={category}
              items={level.files}
              onPlayAt={category === "music" ? player.playQueue : undefined}
            />
          )}
        </div>
      )}
    </div>
  );
}

function ViewSections({
  category,
  groups,
  searching,
  onPlayAt,
}: {
  category: LibraryCategory;
  groups: Group[];
  searching: boolean;
  onPlayAt?: (list: LibraryItem[], index: number) => void;
}) {
  if (groups.length === 0) {
    return (
      <div className="glass-card flex flex-col items-center py-20 text-center">
        <FolderOpen className="mb-3 h-8 w-8 text-muted-2" />
        <p className="text-sm font-medium text-foreground">{searching ? "No matches" : "Nothing here yet"}</p>
        <p className="mt-1 text-xs text-muted">
          {searching ? "Try a different search." : "This view has no items."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <section key={g.label || "all"} className="space-y-3">
          {g.label && (
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              {g.label}
              <span className="rounded-full bg-surface-3 px-2 py-0.5 text-[11px] font-normal text-muted-2">
                {g.items.length}
              </span>
            </h3>
          )}
          <FileGrid category={category} items={g.items} onPlayAt={onPlayAt} />
        </section>
      ))}
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
