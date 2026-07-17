import { create } from "zustand";
import type { DownloadProgress, Download } from "@/types";

interface DownloadState {
  activeDownloads: Map<string, Download>;
  downloadProgress: Map<string, DownloadProgress>;
  addDownload: (download: Download) => void;
  removeDownload: (id: string) => void;
  updateProgress: (id: string, progress: DownloadProgress) => void;
  markComplete: (id: string) => void;
  markFailed: (id: string, error?: string) => void;
  clearCompleted: () => void;
}

export const useDownloadStore = create<DownloadState>((set) => ({
  activeDownloads: new Map(),
  downloadProgress: new Map(),

  addDownload: (download: Download) =>
    set((state) => {
      const newDownloads = new Map(state.activeDownloads);
      newDownloads.set(download.id, download);
      return { activeDownloads: newDownloads };
    }),

  removeDownload: (id: string) =>
    set((state) => {
      const newDownloads = new Map(state.activeDownloads);
      const newProgress = new Map(state.downloadProgress);
      newDownloads.delete(id);
      newProgress.delete(id);
      return { activeDownloads: newDownloads, downloadProgress: newProgress };
    }),

  updateProgress: (id: string, progress: DownloadProgress) =>
    set((state) => {
      const newProgress = new Map(state.downloadProgress);
      newProgress.set(id, progress);

      const newDownloads = new Map(state.activeDownloads);
      const existing = newDownloads.get(id);
      if (existing) {
        newDownloads.set(id, {
          ...existing,
          progress: progress.progress,
          speed: progress.speed,
          eta: progress.eta,
          status: progress.status,
        });
      }

      return { downloadProgress: newProgress, activeDownloads: newDownloads };
    }),

  markComplete: (id: string) =>
    set((state) => {
      const newDownloads = new Map(state.activeDownloads);
      const existing = newDownloads.get(id);
      if (existing) {
        newDownloads.set(id, { ...existing, status: "completed", progress: 100 });
      }
      const newProgress = new Map(state.downloadProgress);
      newProgress.delete(id);
      return { activeDownloads: newDownloads, downloadProgress: newProgress };
    }),

  markFailed: (id: string, error?: string) =>
    set((state) => {
      const newDownloads = new Map(state.activeDownloads);
      const existing = newDownloads.get(id);
      if (existing) {
        newDownloads.set(id, { ...existing, status: "failed", error });
      }
      const newProgress = new Map(state.downloadProgress);
      newProgress.delete(id);
      return { activeDownloads: newDownloads, downloadProgress: newProgress };
    }),

  clearCompleted: () =>
    set((state) => {
      const newDownloads = new Map(state.activeDownloads);
      for (const [id, download] of newDownloads.entries()) {
        if (download.status === "completed") {
          newDownloads.delete(id);
        }
      }
      return { activeDownloads: newDownloads };
    }),
}));
