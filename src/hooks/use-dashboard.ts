"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/client-api";
import type { DashboardData, DownloadJob } from "@/lib/types";

/** Dashboard stats: counts, storage, recent activity, continue-watching. */
export function useDashboard() {
  return useQuery({
    queryKey: ["stats"],
    queryFn: () => apiGet<DashboardData>("/api/stats"),
    refetchInterval: 20_000,
  });
}

/** Live download queue (polls faster while jobs are active). */
export function useDownloads() {
  return useQuery({
    queryKey: ["downloads"],
    queryFn: () => apiGet<DownloadJob[]>("/api/downloads"),
    refetchInterval: (query) => {
      const data = query.state.data as DownloadJob[] | undefined;
      const active = data?.some((d) => d.status === "downloading" || d.status === "queued");
      return active ? 1500 : 10_000;
    },
  });
}

export interface AnalyticsData {
  downloadsPerDay: { day: string; downloads: number; completed: number }[];
  categories: { name: string; value: number; gb: number; color: string }[];
  sources: { name: string; value: number; color: string }[];
  storageGrowth: { month: string; gb: number }[];
  recentlyWatched: { id: string; title: string; type: string; thumbnail: string | null; progress: number }[];
  totals: { libraryItems: number; completedDownloads: number; weekDownloads: number };
}

export function useAnalytics() {
  return useQuery({
    queryKey: ["analytics"],
    queryFn: () => apiGet<AnalyticsData>("/api/analytics"),
    refetchInterval: 60_000,
  });
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  time: string;
  kind: "success" | "info" | "warning" | "error";
  libraryId: string | null;
}

export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: () => apiGet<{ items: AppNotification[]; unread: number }>("/api/notifications"),
    refetchInterval: 30_000,
  });
}
