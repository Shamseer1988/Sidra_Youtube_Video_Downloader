"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { DownloadRequest } from "@/types";

export function useDownloads(params?: Record<string, string | number | boolean | undefined>) {
  return useQuery({
    queryKey: ["downloads", params],
    queryFn: () => api.getDownloads(params),
    refetchInterval: 5000,
  });
}

export function useDownload(id: string) {
  return useQuery({
    queryKey: ["download", id],
    queryFn: () => api.getDownload(id),
    enabled: !!id,
  });
}

export function useCreateDownload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: DownloadRequest) => api.createDownload(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["downloads"] });
    },
  });
}

export function useCancelDownload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.cancelDownload(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["downloads"] });
    },
  });
}

export function useRetryDownload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.retryDownload(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["downloads"] });
    },
  });
}

export function useDeleteDownload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.deleteDownload(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["downloads"] });
    },
  });
}

export function useExtractInfo() {
  return useMutation({
    mutationFn: (url: string) => api.extractInfo(url),
  });
}

export function useStats() {
  return useQuery({
    queryKey: ["stats"],
    queryFn: () => api.getStats(),
    refetchInterval: 10000,
  });
}

export function useActivity(days?: number) {
  return useQuery({
    queryKey: ["activity", days],
    queryFn: () => api.getActivity(days),
  });
}
