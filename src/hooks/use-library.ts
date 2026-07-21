"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/client-api";
import type { LibraryDTO, LibraryItem } from "@/lib/types";

/** Registered libraries, optionally filtered by category. */
export function useLibraries(category?: string) {
  return useQuery({
    queryKey: ["libraries", category ?? "all"],
    queryFn: () =>
      apiGet<LibraryDTO[]>(`/api/libraries${category ? `?category=${category}` : ""}`),
  });
}

export interface LibraryQuery {
  type?: "video" | "audio";
  source?: "download" | "nas";
  category?: string;
  libraryId?: string;
  filter?: "favorites" | "watchLater" | "continue";
  q?: string;
  sort?: string;
  limit?: number;
}

function toParams(query: LibraryQuery): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== "") p.set(k, String(v));
  }
  return p.toString();
}

/** Library items matching a query, with the current user's state attached. */
export function useLibraryItems(query: LibraryQuery, opts?: { enabled?: boolean }) {
  const qs = toParams(query);
  return useQuery({
    queryKey: ["library", qs],
    queryFn: () => apiGet<LibraryItem[]>(`/api/library?${qs}`),
    enabled: opts?.enabled ?? true,
  });
}
