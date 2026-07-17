"use client";

import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      withCredentials: true,
      transports: ["websocket", "polling"],
    });
  }
  return socket;
}

export function connectSocket(): Socket {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
  return s;
}

export function disconnectSocket(): void {
  if (socket?.connected) {
    socket.disconnect();
  }
}

// Socket event names
export const SOCKET_EVENTS = {
  DOWNLOAD_PROGRESS: "download_progress",
  LOG_ENTRY: "log_entry",
  DOWNLOAD_COMPLETE: "download_complete",
  DOWNLOAD_FAILED: "download_failed",
  DOWNLOAD_STARTED: "download_started",
} as const;

export default { getSocket, connectSocket, disconnectSocket, SOCKET_EVENTS };
