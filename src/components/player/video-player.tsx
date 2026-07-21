"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AudioLines,
  Check,
  Loader2,
  Maximize,
  Pause,
  PictureInPicture2,
  Play,
  Settings2,
  Subtitles,
  Volume2,
  VolumeX,
} from "lucide-react";
import { cn, formatDuration } from "@/lib/utils";
import { apiGet } from "@/lib/client-api";
import type { AudioTrack, LibraryItem, SubtitleTrack } from "@/lib/types";

interface Quality {
  label: string;
  height: number | null; // null = original / direct play
}

// Containers a browser can play natively. Anything else (VOB, MPG, AVI,
// WMV, TS, M2TS, FLV, and often MKV/MOV) must be transcoded by ffmpeg,
// so those default to a transcoded rung instead of a failing direct play.
const DIRECT_PLAY_EXTS = new Set(["mp4", "m4v", "webm"]);

function isDirectPlayable(item: LibraryItem): boolean {
  const ext = (item.ext ?? "").toLowerCase().replace(/^\./, "");
  return DIRECT_PLAY_EXTS.has(ext);
}

function qualitiesFor(item: LibraryItem): Quality[] {
  const native = item.height ?? 1080;
  const direct = isDirectPlayable(item);
  const q: Quality[] = [];

  if (direct) q.push({ label: "Original", height: null });

  // Transcode ladder, capped at the source height (never upscale).
  const rungs = new Set<number>([Math.min(native, 1080)]);
  for (const h of [1080, 720, 480]) if (h < native) rungs.add(h);
  for (const h of [...rungs].sort((a, b) => b - a)) q.push({ label: `${h}p`, height: h });

  // For non-native containers, still expose a last-resort direct attempt.
  if (!direct) q.push({ label: "Original", height: null });

  return q;
}

function srcFor(
  item: LibraryItem,
  quality: Quality,
  start: number,
  audioIndex: number | null,
): string {
  if (quality.height === null) return `/api/stream/${item.id}`;
  const audio = audioIndex !== null ? `&audio=${audioIndex}` : "";
  return `/api/transcode/${item.id}?height=${quality.height}&start=${Math.floor(start)}${audio}`;
}

/**
 * Custom video player with quality selection (direct play or GPU/CPU
 * transcode), Picture-in-Picture, and absolute-time seeking that works even
 * for transcoded streams (seeks reload the transcode at the target offset).
 */
export function VideoPlayer({ item, startAt = 0 }: { item: LibraryItem; startAt?: number }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const lastSaved = useRef(0);

  const qualities = qualitiesFor(item);
  const [quality, setQuality] = useState<Quality>(qualities[0]);
  const [baseOffset, setBaseOffset] = useState(startAt);
  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [absTime, setAbsTime] = useState(startAt);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [showQuality, setShowQuality] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);

  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([]);
  const [subtitleTracks, setSubtitleTracks] = useState<SubtitleTrack[]>([]);
  const [audioIndex, setAudioIndex] = useState<number | null>(null);
  const [subTrack, setSubTrack] = useState<number | null>(null);
  const [showSubs, setShowSubs] = useState(false);
  const [showAudio, setShowAudio] = useState(false);

  const duration = item.duration ?? 0;

  // Subtitle cues are in absolute file time; a transcode restarts its clock
  // at `baseOffset`, so shift the subtitle by the same offset to stay synced.
  const subOffset = quality.height === null ? 0 : Math.floor(baseOffset);

  // Discover embedded/sidecar audio and subtitle tracks once.
  useEffect(() => {
    let cancelled = false;
    apiGet<{ audio: AudioTrack[]; subtitles: SubtitleTrack[] }>(`/api/library/${item.id}/tracks`)
      .then((t) => {
        if (cancelled) return;
        setAudioTracks(t.audio ?? []);
        setSubtitleTracks(t.subtitles ?? []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [item.id]);

  const saveProgress = useCallback(
    (position: number, finished = false) => {
      import("@/lib/client-api").then(({ apiSend }) =>
        apiSend("PATCH", `/api/library/${item.id}/state`, { position, finished }).catch(() => {})
      );
    },
    [item.id]
  );

  // Load initial source with a resume offset.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.src = srcFor(item, quality, baseOffset, audioIndex);
    if (baseOffset > 0 && quality.height === null) {
      const onMeta = () => {
        v.currentTime = baseOffset;
        v.removeEventListener("loadedmetadata", onMeta);
      };
      v.addEventListener("loadedmetadata", onMeta);
    }
    v.play().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Show/hide the active subtitle track (re-applied after each src reload).
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const apply = () => {
      const tt = v.textTracks;
      for (let i = 0; i < tt.length; i++) {
        tt[i].mode = subTrack === null ? "disabled" : "showing";
      }
    };
    apply();
    v.addEventListener("loadeddata", apply);
    return () => v.removeEventListener("loadeddata", apply);
  }, [subTrack, subOffset]);

  function changeQuality(q: Quality) {
    const v = videoRef.current;
    if (!v) return;
    const current = baseOffset + v.currentTime;
    setShowQuality(false);
    setQuality(q);
    setBaseOffset(current);
    // Direct play cannot carry an alternate audio track — reset to default.
    const nextAudio = q.height === null ? null : audioIndex;
    if (q.height === null) setAudioIndex(null);
    v.src = srcFor(item, q, current, nextAudio);
    if (q.height === null && current > 0) {
      const onMeta = () => {
        v.currentTime = current;
        v.removeEventListener("loadedmetadata", onMeta);
      };
      v.addEventListener("loadedmetadata", onMeta);
    }
    v.play().catch(() => {});
  }

  // Selecting an audio track requires transcoding (browsers can't switch
  // embedded audio on direct play), so force a transcode rung if needed.
  function changeAudio(idx: number) {
    const v = videoRef.current;
    if (!v) return;
    const current = baseOffset + v.currentTime;
    setShowAudio(false);
    setAudioIndex(idx);
    let q = quality;
    if (q.height === null) {
      q = qualities.find((x) => x.height !== null) ?? { label: "720p", height: 720 };
      setQuality(q);
    }
    setBaseOffset(current);
    setAbsTime(current);
    v.src = srcFor(item, q, current, idx);
    v.play().catch(() => {});
  }

  function seekTo(target: number) {
    const v = videoRef.current;
    if (!v) return;
    if (quality.height === null) {
      v.currentTime = target;
      setAbsTime(target);
    } else {
      // Transcoded streams aren't seekable — reload at the new offset.
      setBaseOffset(target);
      setAbsTime(target);
      v.src = srcFor(item, quality, target, audioIndex);
      v.play().catch(() => {});
    }
  }

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  }

  async function togglePiP() {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await v.requestPictureInPicture();
    } catch {
      /* PiP unsupported */
    }
  }

  function toggleFullscreen() {
    const el = wrapRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen().catch(() => {});
  }

  return (
    <div
      ref={wrapRef}
      className="group relative aspect-video w-full overflow-hidden rounded-2xl bg-black"
      onMouseMove={() => setControlsVisible(true)}
      onMouseLeave={() => playing && setControlsVisible(false)}
    >
      <video
        ref={videoRef}
        poster={`/api/thumbnail/${item.id}?size=800`}
        className="h-full w-full bg-black"
        onClick={togglePlay}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onWaiting={() => setBuffering(true)}
        onPlaying={() => setBuffering(false)}
        onTimeUpdate={(e) => {
          const abs = baseOffset + e.currentTarget.currentTime;
          setAbsTime(abs);
          if (abs - lastSaved.current > 5) {
            lastSaved.current = abs;
            saveProgress(abs);
          }
        }}
        onEnded={() => {
          if (quality.height === null || baseOffset + (videoRef.current?.currentTime ?? 0) >= duration - 2) {
            saveProgress(duration, true);
          }
        }}
      >
        {subTrack !== null && (
          <track
            key={`${subTrack}:${subOffset}`}
            kind="subtitles"
            default
            src={`/api/library/${item.id}/subtitle?track=${subTrack}&offset=${subOffset}`}
            label={subtitleTracks.find((s) => s.id === subTrack)?.label ?? "Subtitles"}
            srcLang={subtitleTracks.find((s) => s.id === subTrack)?.language ?? undefined}
          />
        )}
      </video>

      {buffering && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-white/80" />
        </div>
      )}

      {/* Center play on pause */}
      {!playing && !buffering && (
        <button
          onClick={togglePlay}
          aria-label="Play"
          className="absolute inset-0 flex items-center justify-center bg-black/20"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/30 backdrop-blur-md transition-transform hover:scale-105">
            <Play className="ml-1 h-7 w-7 fill-white" />
          </span>
        </button>
      )}

      {/* Controls */}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-4 pb-3 pt-10 transition-opacity duration-300",
          controlsVisible || !playing ? "opacity-100" : "opacity-0"
        )}
      >
        {/* Seek */}
        <input
          type="range"
          min={0}
          max={duration || 0}
          value={absTime}
          onChange={(e) => seekTo(Number(e.target.value))}
          aria-label="Seek"
          className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/25 accent-primary"
        />

        <div className="mt-2 flex items-center gap-3 text-white">
          <button onClick={togglePlay} aria-label={playing ? "Pause" : "Play"} className="transition-transform hover:scale-110">
            {playing ? <Pause className="h-5 w-5 fill-white" /> : <Play className="h-5 w-5 fill-white" />}
          </button>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                const v = videoRef.current;
                if (v) {
                  v.muted = !v.muted;
                  setMuted(v.muted);
                }
              }}
              aria-label={muted ? "Unmute" : "Mute"}
            >
              {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={(e) => {
                const v = videoRef.current;
                const nv = Number(e.target.value);
                if (v) v.volume = nv;
                setVolume(nv);
                setMuted(nv === 0);
              }}
              aria-label="Volume"
              className="hidden h-1 w-20 cursor-pointer appearance-none rounded-full bg-white/25 accent-primary sm:block"
            />
          </div>

          <span className="text-xs tabular-nums text-white/85">
            {formatDuration(Math.floor(absTime))} / {formatDuration(Math.floor(duration))}
          </span>

          <div className="ml-auto flex items-center gap-1">
            {/* Subtitles */}
            {subtitleTracks.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowSubs((s) => !s)}
                  aria-label="Subtitles"
                  className={cn(
                    "flex items-center rounded-lg px-2 py-1 hover:bg-white/10",
                    subTrack !== null && "text-primary"
                  )}
                >
                  <Subtitles className="h-4 w-4" />
                </button>
                {showSubs && (
                  <div className="absolute bottom-full right-0 mb-2 w-48 overflow-hidden rounded-xl border border-white/10 bg-black/90 p-1 backdrop-blur-xl">
                    <button
                      onClick={() => {
                        setSubTrack(null);
                        setShowSubs(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-white/85 hover:bg-white/10"
                    >
                      {subTrack === null ? <Check className="h-3.5 w-3.5 text-primary" /> : <span className="w-3.5" />}
                      Off
                    </button>
                    {subtitleTracks.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          setSubTrack(s.id);
                          setShowSubs(false);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-white/85 hover:bg-white/10"
                      >
                        {subTrack === s.id ? <Check className="h-3.5 w-3.5 text-primary" /> : <span className="w-3.5" />}
                        <span className="truncate">{s.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Audio track */}
            {audioTracks.length > 1 && (
              <div className="relative">
                <button
                  onClick={() => setShowAudio((s) => !s)}
                  aria-label="Audio track"
                  className="flex items-center rounded-lg px-2 py-1 hover:bg-white/10"
                >
                  <AudioLines className="h-4 w-4" />
                </button>
                {showAudio && (
                  <div className="absolute bottom-full right-0 mb-2 w-48 overflow-hidden rounded-xl border border-white/10 bg-black/90 p-1 backdrop-blur-xl">
                    {audioTracks.map((a) => {
                      const activeId = audioIndex ?? audioTracks.find((t) => t.isDefault)?.id ?? 0;
                      return (
                        <button
                          key={a.id}
                          onClick={() => changeAudio(a.id)}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-white/85 hover:bg-white/10"
                        >
                          {activeId === a.id ? <Check className="h-3.5 w-3.5 text-primary" /> : <span className="w-3.5" />}
                          <span className="truncate">{a.label}</span>
                          {a.channels ? <span className="ml-auto text-[10px] text-white/40">{a.channels}ch</span> : null}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Quality */}
            <div className="relative">
              <button
                onClick={() => setShowQuality((s) => !s)}
                aria-label="Quality"
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium hover:bg-white/10"
              >
                <Settings2 className="h-4 w-4" />
                {quality.label}
              </button>
              {showQuality && (
                <div className="absolute bottom-full right-0 mb-2 w-36 overflow-hidden rounded-xl border border-white/10 bg-black/90 p-1 backdrop-blur-xl">
                  {qualities.map((q) => (
                    <button
                      key={q.label}
                      onClick={() => changeQuality(q)}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-white/85 hover:bg-white/10"
                    >
                      {q.label === quality.label ? (
                        <Check className="h-3.5 w-3.5 text-primary" />
                      ) : (
                        <span className="w-3.5" />
                      )}
                      {q.label}
                      {q.height === null && <span className="ml-auto text-[10px] text-white/40">direct</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button onClick={togglePiP} aria-label="Picture in picture" className="rounded-lg p-1.5 hover:bg-white/10">
              <PictureInPicture2 className="h-5 w-5" />
            </button>
            <button onClick={toggleFullscreen} aria-label="Fullscreen" className="rounded-lg p-1.5 hover:bg-white/10">
              <Maximize className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
