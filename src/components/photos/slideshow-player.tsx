"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft, ChevronRight, Maximize, Music, Pause, Play, Repeat, Shuffle, Timer, Wand2, X,
} from "lucide-react";
import { apiGet } from "@/lib/client-api";
import { cn } from "@/lib/utils";
import type { LibraryItem, PhotoItem } from "@/lib/types";

type Transition = "fade" | "zoom" | "dissolve" | "parallax" | "kenburns";

const TRANSITIONS: { v: Transition; label: string }[] = [
  { v: "fade", label: "Fade" },
  { v: "dissolve", label: "Cross dissolve" },
  { v: "zoom", label: "Zoom" },
  { v: "kenburns", label: "Ken Burns" },
  { v: "parallax", label: "Parallax" },
];

const TIMERS = [3, 5, 8, 12];

function variantsFor(t: Transition, seconds: number) {
  switch (t) {
    case "zoom":
      return { initial: { opacity: 0, scale: 1.15 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.95 }, transition: { duration: 0.9 } };
    case "parallax":
      return { initial: { opacity: 0, x: 140 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -140 }, transition: { duration: 0.8 } };
    case "dissolve":
      return { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 1.3 } };
    case "kenburns":
      return {
        initial: { opacity: 0, scale: 1 },
        animate: { opacity: 1, scale: 1.14 },
        exit: { opacity: 0 },
        transition: { opacity: { duration: 0.9 }, scale: { duration: seconds, ease: "linear" as const } },
      };
    default:
      return { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.8 } };
  }
}

export function SlideshowPlayer({
  photos,
  startIndex = 0,
  onClose,
}: {
  photos: PhotoItem[];
  startIndex?: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const [playing, setPlaying] = useState(true);
  const [transition, setTransition] = useState<Transition>("kenburns");
  const [seconds, setSeconds] = useState(5);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(true);
  const [controls, setControls] = useState(true);
  const [musicId, setMusicId] = useState<string | null>(null);
  const [musicOpen, setMusicOpen] = useState(false);

  const wrapRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const photo = photos[index];
  const variants = useMemo(() => variantsFor(transition, seconds), [transition, seconds]);

  const step = useCallback(
    (dir: 1 | -1) => {
      setIndex((cur) => {
        if (shuffle && dir === 1) {
          if (photos.length <= 1) return cur;
          let n = cur;
          while (n === cur) n = Math.floor(Math.random() * photos.length);
          return n;
        }
        const next = cur + dir;
        if (next >= photos.length) return repeat ? 0 : cur;
        if (next < 0) return repeat ? photos.length - 1 : 0;
        return next;
      });
    },
    [photos.length, shuffle, repeat],
  );

  // Auto-advance.
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setIndex((cur) => {
        if (shuffle) {
          if (photos.length <= 1) return cur;
          let n = cur;
          while (n === cur) n = Math.floor(Math.random() * photos.length);
          return n;
        }
        const next = cur + 1;
        if (next >= photos.length) return repeat ? 0 : cur;
        return next;
      });
    }, seconds * 1000);
    return () => clearInterval(id);
  }, [playing, seconds, shuffle, repeat, photos.length]);

  // Keyboard.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
      else if (e.key === " ") { e.preventDefault(); setPlaying((p) => !p); }
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, onClose]);

  // Sync background music with play state.
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (playing && musicId) a.play().catch(() => {});
    else a.pause();
  }, [playing, musicId]);

  // Auto-hide controls.
  const nudge = useCallback(() => {
    setControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setControls(false), 2800);
  }, []);
  useEffect(() => {
    nudge();
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [nudge]);

  function toggleFullscreen() {
    const el = wrapRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen().catch(() => {});
  }

  const { data: tracks = [] } = useQuery({
    queryKey: ["slideshow-music"],
    queryFn: () => apiGet<LibraryItem[]>("/api/library?type=audio&limit=200"),
    enabled: musicOpen,
  });

  if (!photo) return null;

  return (
    <div
      ref={wrapRef}
      className="fixed inset-0 z-[120] flex items-center justify-center overflow-hidden bg-black"
      onMouseMove={nudge}
    >
      <AnimatePresence>
        <motion.img
          key={photo.id}
          src={`/api/photos/${photo.id}/full`}
          alt=""
          draggable={false}
          initial={variants.initial}
          animate={variants.animate}
          exit={variants.exit}
          transition={variants.transition}
          className="absolute inset-0 h-full w-full select-none object-contain"
        />
      </AnimatePresence>

      {musicId && <audio ref={audioRef} src={`/api/stream/${musicId}`} loop autoPlay />}

      {/* Controls */}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300",
          controls ? "opacity-100" : "opacity-0",
        )}
      >
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-2 text-white">
          <Ctrl label="Previous" onClick={() => step(-1)}><ChevronLeft className="h-5 w-5" /></Ctrl>
          <Ctrl label={playing ? "Pause" : "Play"} onClick={() => setPlaying((p) => !p)}>
            {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </Ctrl>
          <Ctrl label="Next" onClick={() => step(1)}><ChevronRight className="h-5 w-5" /></Ctrl>

          <span className="mx-1 h-6 w-px bg-white/20" />

          {/* Transition */}
          <Menu icon={<Wand2 className="h-4 w-4" />} label={TRANSITIONS.find((t) => t.v === transition)?.label ?? "Effect"}>
            {TRANSITIONS.map((t) => (
              <MenuOpt key={t.v} active={t.v === transition} onClick={() => setTransition(t.v)}>{t.label}</MenuOpt>
            ))}
          </Menu>

          {/* Timer */}
          <Menu icon={<Timer className="h-4 w-4" />} label={`${seconds}s`}>
            {TIMERS.map((s) => (
              <MenuOpt key={s} active={s === seconds} onClick={() => setSeconds(s)}>{s} seconds</MenuOpt>
            ))}
          </Menu>

          <Ctrl label="Shuffle" active={shuffle} onClick={() => setShuffle((s) => !s)}><Shuffle className="h-5 w-5" /></Ctrl>
          <Ctrl label="Repeat" active={repeat} onClick={() => setRepeat((r) => !r)}><Repeat className="h-5 w-5" /></Ctrl>

          {/* Music */}
          <div className="relative">
            <Ctrl label="Background music" active={!!musicId} onClick={() => setMusicOpen((o) => !o)}><Music className="h-5 w-5" /></Ctrl>
            {musicOpen && (
              <div className="absolute bottom-full right-0 mb-2 max-h-64 w-56 overflow-y-auto rounded-xl border border-white/10 bg-black/90 p-1 backdrop-blur-xl">
                <MenuOpt active={!musicId} onClick={() => { setMusicId(null); setMusicOpen(false); }}>No music</MenuOpt>
                {tracks.length === 0 && <p className="px-3 py-2 text-xs text-white/40">No audio in library</p>}
                {tracks.map((t) => (
                  <MenuOpt key={t.id} active={t.id === musicId} onClick={() => { setMusicId(t.id); setMusicOpen(false); }}>
                    <span className="truncate">{t.title}</span>
                  </MenuOpt>
                ))}
              </div>
            )}
          </div>

          <Ctrl label="Fullscreen" onClick={toggleFullscreen}><Maximize className="h-5 w-5" /></Ctrl>
          <Ctrl label="Close" onClick={onClose}><X className="h-5 w-5" /></Ctrl>

          <span className="ml-1 text-xs tabular-nums text-white/60">{index + 1} / {photos.length}</span>
        </div>
      </div>
    </div>
  );
}

function Ctrl({ children, label, onClick, active }: { children: React.ReactNode; label: string; onClick: () => void; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn("flex h-10 w-10 items-center justify-center rounded-lg hover:bg-white/10", active ? "text-primary" : "text-white/85 hover:text-white")}
    >
      {children}
    </button>
  );
}

function Menu({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="flex h-10 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-white/85 hover:bg-white/10 hover:text-white"
      >
        {icon} {label}
      </button>
      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-44 overflow-hidden rounded-xl border border-white/10 bg-black/90 p-1 backdrop-blur-xl">
          {children}
        </div>
      )}
    </div>
  );
}

function MenuOpt({ children, active, onClick }: { children: React.ReactNode; active?: boolean; onClick: () => void }) {
  return (
    <button
      onMouseDown={onClick}
      className={cn("flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs hover:bg-white/10", active ? "text-primary" : "text-white/85")}
    >
      {children}
    </button>
  );
}
