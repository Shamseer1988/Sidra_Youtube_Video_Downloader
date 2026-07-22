"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/client-api";
import type { AlbumDetail, AlbumSummary, PhotoItem, PhotoLibrarySummary } from "@/lib/types";

interface PhotoPage {
  photos: PhotoItem[];
  nextCursor: string | null;
}

export interface PhotoQuery {
  libraryId?: string;
  favorite?: boolean;
  scope?: "archive" | "all";
  q?: string;
  year?: number;
  month?: number;
  ext?: string;
}

export function usePhotos(params: PhotoQuery = {}) {
  const base = new URLSearchParams();
  if (params.libraryId) base.set("libraryId", params.libraryId);
  if (params.favorite) base.set("favorite", "1");
  if (params.scope) base.set("scope", params.scope);
  if (params.q?.trim()) base.set("q", params.q.trim());
  if (params.year) base.set("year", String(params.year));
  if (params.month) base.set("month", String(params.month));
  if (params.ext) base.set("ext", params.ext);

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

export function useAlbums(parentId: string | null = null) {
  return useQuery({
    queryKey: ["albums", parentId ?? "root"],
    queryFn: () =>
      apiGet<AlbumSummary[]>(`/api/albums${parentId ? `?parentId=${parentId}` : ""}`),
  });
}

export function useAlbum(id: string) {
  return useQuery({
    queryKey: ["album", id],
    queryFn: () => apiGet<AlbumDetail>(`/api/albums/${id}`),
  });
}

export function useAlbumPhotos(id: string, pw: string | null, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: ["album-photos", id, pw ? "pw" : "open"],
    enabled,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => {
      const qs = new URLSearchParams();
      if (pageParam) qs.set("cursor", pageParam);
      if (pw) qs.set("pw", pw);
      return apiGet<PhotoPage>(`/api/albums/${id}/photos?${qs.toString()}`);
    },
    getNextPageParam: (last) => last.nextCursor,
  });
}
