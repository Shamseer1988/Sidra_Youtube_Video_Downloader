"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/client-api";
import type { PhotoItem, PhotoLibrarySummary } from "@/lib/types";

interface PhotoPage {
  photos: PhotoItem[];
  nextCursor: string | null;
}

export interface PhotoQuery {
  libraryId?: string;
  favorite?: boolean;
  scope?: "archive" | "all";
}

export function usePhotos(params: PhotoQuery = {}) {
  const base = new URLSearchParams();
  if (params.libraryId) base.set("libraryId", params.libraryId);
  if (params.favorite) base.set("favorite", "1");
  if (params.scope) base.set("scope", params.scope);

  return useInfiniteQuery({
    queryKey: ["photos", base.toString()],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => {
      const qs = new URLSearchParams(base);
      if (pageParam) qs.set("cursor", pageParam);
      return apiGet<PhotoPage>(`/api/photos?${qs.toString()}`);
    },
    getNextPageParam: (last) => last.nextCursor,
  });
}

export function usePhotoLibraries() {
  return useQuery({
    queryKey: ["photo-libraries"],
    queryFn: () => apiGet<PhotoLibrarySummary[]>("/api/photo-libraries"),
  });
}
