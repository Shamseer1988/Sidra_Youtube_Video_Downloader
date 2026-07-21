"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DownloadCloud, FolderSearch, Library, Play, Settings as SettingsIcon, Sparkles } from "lucide-react";
import { useUIStore } from "@/lib/ui-store";
import { navSections } from "@/lib/navigation";
import { categoryIcon } from "@/lib/categories";
import { useLibraries, useLibraryItems } from "@/hooks/use-library";
import { MediaThumb } from "@/components/media/media-thumb";
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

const categoryHref: Record<string, string> = {
  movies: "/movies",
  tv: "/tv-shows",
  videos: "/videos",
  music: "/music",
};

const quickActions = [
  { label: "New Download", icon: DownloadCloud, href: "/downloads", shortcut: "D" },
  { label: "Add Library", icon: FolderSearch, href: "/settings", shortcut: "L" },
  { label: "Settings", icon: SettingsIcon, href: "/settings", shortcut: "," },
];

/** Global ⌘K / Ctrl+K command palette with real library search. */
export function CommandMenu() {
  const router = useRouter();
  const { commandOpen, setCommandOpen } = useUIStore();
  const [query, setQuery] = useState("");

  const { data: libraries = [] } = useLibraries();
  const { data: results = [] } = useLibraryItems(
    { q: query.trim(), limit: 16 },
    { enabled: commandOpen && query.trim().length > 1 }
  );

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

  useEffect(() => {
    if (!commandOpen) setQuery("");
  }, [commandOpen]);

  function run(action: () => void) {
    setCommandOpen(false);
    action();
  }

  return (
    <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
      <CommandInput
        placeholder="Search your library, pages, actions…"
        value={query}
        onValueChange={setQuery}
        autoFocus
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {results.length > 0 && (
          <CommandGroup heading="Library">
            {results.map((item) => (
              <CommandItem
                key={item.id}
                value={`media-${item.id}-${item.title}`}
                onSelect={() => run(() => router.push(`/watch/${item.id}`))}
              >
                <span className="h-9 w-9 shrink-0 overflow-hidden rounded-md">
                  <MediaThumb id={item.id} title={item.title} type={item.type} hasThumbnail={!!item.thumbnail} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-foreground">{item.title}</span>
                  <span className="block text-[11px] capitalize text-muted-2">
                    {item.category} · {item.type}
                  </span>
                </span>
                <Play className="ml-auto h-3.5 w-3.5 text-muted-2" />
              </CommandItem>
            ))}
          </CommandGroup>
        )}

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

        {libraries.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Libraries">
              {libraries.map((lib) => {
                const Icon = categoryIcon[lib.category] ?? Library;
                return (
                  <CommandItem
                    key={lib.id}
                    value={`lib ${lib.name} ${lib.category}`}
                    onSelect={() => run(() => router.push(categoryHref[lib.category] ?? "/videos"))}
                  >
                    <Icon className="h-4 w-4 text-muted-2" />
                    {lib.name}
                    <span className="ml-auto text-[11px] text-muted-2">{lib.itemCount}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </>
        )}

        <CommandSeparator />
        <CommandGroup heading="Navigate">
          {navSections.flatMap((s) => s.items).map((item) => (
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
