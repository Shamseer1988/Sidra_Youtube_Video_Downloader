"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { cn, formatDuration } from "@/lib/utils";
import { usePlayer } from "@/components/player/player-provider";
import { MediaThumb } from "@/components/media/media-thumb";

function fmt(t: number) {
  return Number.isFinite(t) ? formatDuration(Math.floor(t)) : "0:00";
}

/** Persistent bottom "now playing" bar — full music-player controls. */
export function NowPlayingBar() {
  const p = usePlayer();

  return (
    <AnimatePresence>
      {p.current && (
        <motion.div
          initial={{ y: 90, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 90, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 32 }}
          className="fixed inset-x-0 bottom-0 z-40 px-3 pb-3 sm:px-5"
          role="region"
          aria-label="Now playing"
        >
          <div className="glass mx-auto flex max-w-[1600px] items-center gap-3 rounded-2xl border border-stroke px-3 py-2.5 shadow-2xl shadow-black/40 sm:gap-4 sm:px-4">
            {/* Track info */}
            <div className="flex min-w-0 flex-1 items-center gap-3 sm:w-64 sm:flex-none">
              <span className="h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-stroke">
                <MediaThumb id={p.current.id} title={p.current.title} type="audio" hasThumbnail={!!p.current.thumbnail} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-foreground">{p.current.title}</p>
                <p className="truncate text-[11px] capitalize text-muted-2">
                  {p.current.ext?.toUpperCase()} · {p.queue.length} in queue
                </p>
              </div>
            </div>

            {/* Center: controls + seek */}
            <div className="flex flex-1 flex-col items-center gap-1">
              <div className="flex items-center gap-1 sm:gap-2">
                <button
                  onClick={p.toggleShuffle}
                  aria-label="Shuffle"
                  aria-pressed={p.shuffle}
                  className={cn(
                    "hidden rounded-lg p-2 transition-colors sm:block",
                    p.shuffle ? "text-primary" : "text-muted-2 hover:text-foreground"
                  )}
                >
                  <Shuffle className="h-4 w-4" />
                </button>
                <button
                  onClick={p.prev}
                  aria-label="Previous"
                  className="rounded-lg p-2 text-muted transition-colors hover:text-foreground"
                >
                  <SkipBack className="h-5 w-5" />
                </button>
                <button
                  onClick={p.toggle}
                  aria-label={p.playing ? "Pause" : "Play"}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-background transition-transform hover:scale-105"
                >
                  {p.playing ? <Pause className="h-4 w-4 fill-background" /> : <Play className="ml-0.5 h-4 w-4 fill-background" />}
                </button>
                <button
                  onClick={p.next}
                  aria-label="Next"
                  className="rounded-lg p-2 text-muted transition-colors hover:text-foreground"
                >
                  <SkipForward className="h-5 w-5" />
                </button>
                <button
                  onClick={p.cycleRepeat}
                  aria-label={`Repeat: ${p.repeat}`}
                  className={cn(
                    "hidden rounded-lg p-2 transition-colors sm:block",
                    p.repeat !== "off" ? "text-primary" : "text-muted-2 hover:text-foreground"
                  )}
                >
                  {p.repeat === "one" ? <Repeat1 className="h-4 w-4" /> : <Repeat className="h-4 w-4" />}
                </button>
              </div>

              <div className="hidden w-full items-center gap-2 sm:flex">
                <span className="w-9 text-right text-[10px] tabular-nums text-muted-2">{fmt(p.currentTime)}</span>
                <input
                  type="range"
                  min={0}
                  max={p.duration || 0}
                  value={p.currentTime}
                  onChange={(e) => p.seek(Number(e.target.value))}
                  aria-label="Seek"
                  className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-surface-3 accent-primary"
                />
                <span className="w-9 text-[10px] tabular-nums text-muted-2">{fmt(p.duration)}</span>
              </div>
            </div>

            {/* Right: volume + close */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={p.toggleMute}
                aria-label={p.muted ? "Unmute" : "Mute"}
                className="hidden rounded-lg p-2 text-muted-2 transition-colors hover:text-foreground md:block"
              >
                {p.muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={p.muted ? 0 : p.volume}
                onChange={(e) => p.setVolume(Number(e.target.value))}
                aria-label="Volume"
                className="hidden h-1 w-20 cursor-pointer appearance-none rounded-full bg-surface-3 accent-primary lg:block"
              />
              <button
                onClick={p.close}
                aria-label="Close player"
                className="rounded-lg p-2 text-muted-2 transition-colors hover:text-danger"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
