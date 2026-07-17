"use client";

import { useEffect, useCallback } from "react";
import { connectSocket, disconnectSocket, getSocket, SOCKET_EVENTS } from "@/lib/socket";
import { useDownloadStore } from "@/stores/download-store";
import type { DownloadProgress, Log } from "@/types";

export function useSocket() {
  const { updateProgress, markComplete, markFailed } = useDownloadStore();

  useEffect(() => {
    const socket = connectSocket();

    socket.on(SOCKET_EVENTS.DOWNLOAD_PROGRESS, (data: DownloadProgress) => {
      updateProgress(data.id, data);
    });

    socket.on(SOCKET_EVENTS.DOWNLOAD_COMPLETE, (data: { id: string }) => {
      markComplete(data.id);
    });

    socket.on(SOCKET_EVENTS.DOWNLOAD_FAILED, (data: { id: string; error?: string }) => {
      markFailed(data.id, data.error);
    });

    return () => {
      socket.off(SOCKET_EVENTS.DOWNLOAD_PROGRESS);
      socket.off(SOCKET_EVENTS.DOWNLOAD_COMPLETE);
      socket.off(SOCKET_EVENTS.DOWNLOAD_FAILED);
      disconnectSocket();
    };
  }, [updateProgress, markComplete, markFailed]);

  const subscribe = useCallback((event: string, handler: (...args: unknown[]) => void) => {
    const socket = getSocket();
    socket.on(event, handler);
    return () => {
      socket.off(event, handler);
    };
  }, []);

  return { subscribe };
}

export function useLogSocket(onLogEntry: (log: Log) => void) {
  useEffect(() => {
    const socket = connectSocket();

    socket.on(SOCKET_EVENTS.LOG_ENTRY, onLogEntry);

    return () => {
      socket.off(SOCKET_EVENTS.LOG_ENTRY, onLogEntry);
    };
  }, [onLogEntry]);
}
