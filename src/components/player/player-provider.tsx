"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { apiSend } from "@/lib/client-api";
import type { LibraryItem } from "@/lib/types";

export type RepeatMode = "off" | "all" | "one";

interface PlayerState {
  queue: LibraryItem[];
  index: number;
  current: LibraryItem | null;
  playing: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  repeat: RepeatMode;
  shuffle: boolean;
}

interface PlayerContextValue extends PlayerState {
  playQueue: (items: LibraryItem[], index: number) => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  seek: (time: number) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  cycleRepeat: () => void;
  toggleShuffle: () => void;
  close: () => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
  return ctx;
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastSaved = useRef(0);
  const [state, setState] = useState<PlayerState>({
    queue: [],
    index: -1,
    current: null,
    playing: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    muted: false,
    repeat: "off",
    shuffle: false,
  });

  const patch = useCallback((p: Partial<PlayerState>) => setState((s) => ({ ...s, ...p })), []);

  const load = useCallback(
    (queue: LibraryItem[], index: number) => {
      const current = queue[index] ?? null;
      patch({ queue, index, current, currentTime: 0, duration: current?.duration ?? 0 });
      const audio = audioRef.current;
      if (audio && current) {
        audio.src = `/api/stream/${current.id}`;
        audio.play().then(() => patch({ playing: true })).catch(() => patch({ playing: false }));
      }
    },
    [patch]
  );

  const playQueue = useCallback(
    (items: LibraryItem[], index: number) => load(items.filter((i) => i.type === "audio"), index),
    [load]
  );

  const next = useCallback(() => {
    setState((s) => {
      if (s.queue.length === 0) return s;
      let nextIndex: number;
      if (s.shuffle) {
        nextIndex = Math.floor(Math.random() * s.queue.length);
      } else {
        nextIndex = s.index + 1;
        if (nextIndex >= s.queue.length) {
          if (s.repeat === "off") return { ...s, playing: false };
          nextIndex = 0;
        }
      }
      const current = s.queue[nextIndex];
      const audio = audioRef.current;
      if (audio && current) {
        audio.src = `/api/stream/${current.id}`;
        audio.play().catch(() => {});
      }
      return { ...s, index: nextIndex, current, currentTime: 0 };
    });
  }, []);

  const prev = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    setState((s) => {
      if (s.queue.length === 0) return s;
      const prevIndex = s.index - 1 < 0 ? s.queue.length - 1 : s.index - 1;
      const current = s.queue[prevIndex];
      if (audio && current) {
        audio.src = `/api/stream/${current.id}`;
        audio.play().catch(() => {});
      }
      return { ...s, index: prevIndex, current, currentTime: 0 };
    });
  }, []);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !state.current) return;
    if (audio.paused) audio.play().then(() => patch({ playing: true })).catch(() => {});
    else {
      audio.pause();
      patch({ playing: false });
    }
  }, [patch, state.current]);

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (audio) audio.currentTime = time;
  }, []);

  const setVolume = useCallback(
    (v: number) => {
      const audio = audioRef.current;
      if (audio) audio.volume = v;
      patch({ volume: v, muted: v === 0 });
    },
    [patch]
  );

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !audio.muted;
    patch({ muted: audio.muted });
  }, [patch]);

  const cycleRepeat = useCallback(
    () =>
      setState((s) => ({
        ...s,
        repeat: s.repeat === "off" ? "all" : s.repeat === "all" ? "one" : "off",
      })),
    []
  );

  const toggleShuffle = useCallback(() => setState((s) => ({ ...s, shuffle: !s.shuffle })), []);

  const close = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    patch({ queue: [], index: -1, current: null, playing: false, currentTime: 0, duration: 0 });
  }, [patch]);

  // Persist resume position for the current track.
  const saveProgress = useCallback((id: string, position: number, finished = false) => {
    apiSend("PATCH", `/api/library/${id}/state`, { position, finished }).catch(() => {});
  }, []);

  const value = useMemo<PlayerContextValue>(
    () => ({
      ...state,
      playQueue,
      toggle,
      next,
      prev,
      seek,
      setVolume,
      toggleMute,
      cycleRepeat,
      toggleShuffle,
      close,
    }),
    [state, playQueue, toggle, next, prev, seek, setVolume, toggleMute, cycleRepeat, toggleShuffle, close]
  );

  return (
    <PlayerContext.Provider value={value}>
      {children}
      <audio
        ref={audioRef}
        onPlay={() => patch({ playing: true })}
        onPause={() => patch({ playing: false })}
        onTimeUpdate={(e) => {
          const t = e.currentTarget.currentTime;
          patch({ currentTime: t });
          if (state.current && t - lastSaved.current > 5) {
            lastSaved.current = t;
            saveProgress(state.current.id, t);
          }
        }}
        onLoadedMetadata={(e) => patch({ duration: e.currentTarget.duration })}
        onEnded={() => {
          if (state.current) saveProgress(state.current.id, state.duration, true);
          if (state.repeat === "one") {
            const audio = audioRef.current;
            if (audio) {
              audio.currentTime = 0;
              audio.play().catch(() => {});
            }
          } else {
            next();
          }
        }}
      />
    </PlayerContext.Provider>
  );
}
