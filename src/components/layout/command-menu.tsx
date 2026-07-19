"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Clock,
  FolderSearch,
  Link2,
  ListMusic,
  Sparkles,
  Star,
  TrendingUp,
  Upload,
} from "lucide-react";
import { useUIStore } from "@/lib/ui-store";
import { navSections } from "@/lib/navigation";
import { movies, tvShows, recentSearches, trendingSearches } from "@/lib/mock-data";
import { PosterArt } from "@/components/media/poster-art";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";

const quickActions = [
  { label: "Download from URL", icon: Link2, href: "/downloads", shortcut: "D" },
  { label: "Import Playlist", icon: ListMusic, href: "/playlists", shortcut: "P" },
  { label: "Upload Media", icon: Upload, href: "/movies", shortcut: "U" },
  { label: "Scan NAS", icon: FolderSearch, href: "/nas", shortcut: "S" },
];

/** Global ⌘K / Ctrl+K command palette. */
export function CommandMenu() {
  const router = useRouter();
  const { commandOpen, setCommandOpen } = useUIStore();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandOpen(!useUIStore.getState().commandOpen);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [setCommandOpen]);

  const media = useMemo(() => [...movies.slice(0, 6), ...tvShows.slice(0, 4)], []);

  function run(action: () => void) {
    setCommandOpen(false);
    action();
  }

  return (
    <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
      <CommandInput placeholder="Search movies, pages, actions…" autoFocus />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Quick Actions">
          {quickActions.map((action) => (
            <CommandItem
              key={action.label}
              value={`action ${action.label}`}
              onSelect={() => run(() => router.push(action.href))}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <action.icon className="h-4 w-4" />
              </span>
              {action.label}
              <CommandShortcut>⌘{action.shortcut}</CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Library">
          {media.map((item) => (
            <CommandItem
              key={item.id}
              value={`media ${item.title} ${item.genre}`}
              onSelect={() =>
                run(() => router.push(item.kind === "movie" ? "/movies" : "/tv-shows"))
              }
            >
              <span className="h-10 w-7 shrink-0 overflow-hidden rounded-md">
                <PosterArt title={item.title} colors={item.art} kind={item.kind} showTitle={false} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-foreground">{item.title}</span>
                <span className="block text-[11px] text-muted-2">
                  {item.kind === "movie" ? "Movie" : "TV Show"} · {item.year} · {item.genre}
                </span>
              </span>
              <span className="ml-auto flex items-center gap-1 text-[11px] text-warning">
                <Star className="h-3 w-3 fill-warning" /> {item.rating.toFixed(1)}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Navigate">
          {navSections
            .flatMap((s) => s.items)
            .map((item) => (
              <CommandItem
                key={item.href}
                value={`go ${item.label}`}
                onSelect={() => run(() => router.push(item.href))}
              >
                <item.icon className="h-4 w-4 text-muted-2" />
                {item.label}
              </CommandItem>
            ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Recent Searches">
          {recentSearches.map((term) => (
            <CommandItem
              key={term}
              value={`recent ${term}`}
              onSelect={() => run(() => router.push(`/movies?q=${encodeURIComponent(term)}`))}
            >
              <Clock className="h-4 w-4 text-muted-2" />
              {term}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="Trending">
          {trendingSearches.map((term) => (
            <CommandItem
              key={term}
              value={`trending ${term}`}
              onSelect={() => run(() => router.push(`/movies?q=${encodeURIComponent(term)}`))}
            >
              <TrendingUp className="h-4 w-4 text-success" />
              {term}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>

      <div className="flex items-center gap-4 border-t border-stroke px-4 py-2.5 text-[10px] text-muted-2">
        <span className="flex items-center gap-1.5">
          <kbd className="rounded border border-stroke bg-surface-3 px-1 py-0.5">↑↓</kbd> navigate
        </span>
        <span className="flex items-center gap-1.5">
          <kbd className="rounded border border-stroke bg-surface-3 px-1 py-0.5">↵</kbd> open
        </span>
        <span className="ml-auto flex items-center gap-1.5">
          <Sparkles className="h-3 w-3 text-primary" /> SidraMedia
        </span>
      </div>
    </CommandDialog>
  );
}
