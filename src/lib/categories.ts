import { Clapperboard, Film, Music, Tv, Video, type LucideIcon } from "lucide-react";

/** Client-safe library category metadata (shared by server + UI). */

export type LibraryKind = "video" | "audio";
export type LibraryCategory = "movies" | "tv" | "videos" | "music";

export interface CategoryMeta {
  id: LibraryCategory;
  label: string;
  kind: LibraryKind;
  description: string;
}

export const CATEGORIES: CategoryMeta[] = [
  { id: "movies", label: "Movies", kind: "video", description: "Feature films" },
  { id: "tv", label: "TV Shows", kind: "video", description: "Series & episodes" },
  { id: "videos", label: "Videos", kind: "video", description: "Home videos, events, clips" },
  { id: "music", label: "Music", kind: "audio", description: "Songs & albums" },
];

export function categoryMeta(id: string): CategoryMeta | undefined {
  return CATEGORIES.find((c) => c.id === id);
}

export const categoryIcon: Record<string, LucideIcon> = {
  movies: Film,
  tv: Tv,
  videos: Video,
  music: Music,
  downloads: Clapperboard,
};
