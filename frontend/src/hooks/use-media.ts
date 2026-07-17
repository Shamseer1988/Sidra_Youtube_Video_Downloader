"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

export function useVideos(params?: Record<string, string | number | boolean | undefined>) {
  return useQuery({
    queryKey: ["videos", params],
    queryFn: () => api.getVideos(params),
  });
}

export function useAudios(params?: Record<string, string | number | boolean | undefined>) {
  return useQuery({
    queryKey: ["audios", params],
    queryFn: () => api.getAudios(params),
  });
}

export function useMediaBrowse(path?: string) {
  return useQuery({
    queryKey: ["media-browse", path],
    queryFn: () => api.browseMedia(path),
  });
}
