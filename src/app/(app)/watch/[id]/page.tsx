"use client";

import { use, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, ThumbsUp, Clock, ListPlus, ArrowLeft, Loader2, Music2 } from "lucide-react";
import Link from "next/link";
import { apiGet, apiSend } from "@/lib/client-api";
import { cn, formatBytes, formatDuration } from "@/lib/utils";
import { useToast } from "@/components/providers/toast-provider";
import { AddToPlaylistModal } from "@/components/media/add-to-playlist";
import type { LibraryItem } from "@/lib/types";

export default function WatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();
  const toast = useToast();
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
  const lastSaved = useRef(0);
  const seeked = useRef(false);

  const { data: item, isLoading } = useQuery({
    queryKey: ["library", id],
    queryFn: () => apiGet<LibraryItem>(`/api/library/${id}`),
  });

  const [state, setState] = useState<LibraryItem["state"] | null>(null);
  useEffect(() => {
    if (item) setState(item.state);
  }, [item]);

  function saveProgress(position: number, finished = false) {
    apiSend("PATCH", `/api/library/${id}/state`, { position, finished }).catch(() => {});
  }

  function onTimeUpdate(e: React.SyntheticEvent<HTMLMediaElement>) {
    const t = e.currentTarget.currentTime;
    if (t - lastSaved.current > 5) {
      lastSaved.current = t;
      saveProgress(t);
    }
  }

  function onLoadedMetadata(e: React.SyntheticEvent<HTMLMediaElement>) {
    if (!seeked.current && item?.state.position && item.state.position > 3) {
      e.currentTarget.currentTime = item.state.position;
    }
    seeked.current = true;
  }

  async function toggle(field: "favorite" | "watchLater" | "liked") {
    if (!state) return;
    const next = !state[field];
    setState({ ...state, [field]: next });
    try {
      await apiSend("PATCH", `/api/library/${id}/state`, { [field]: next });
      qc.invalidateQueries({ queryKey: ["library"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    } catch {
      setState((s) => (s ? { ...s, [field]: !next } : s));
      toast("Could not update", "error");
    }
  }

  if (isLoading || !item || !state) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-6 w-6 animate-spin text-accent-blue" />
      </div>
    );
  }

  const isAudio = item.type === "video" ? false : true;

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <Link
        href="/videos"
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200"
      >
        <ArrowLeft className="h-4 w-4" /> Back to library
      </Link>

      <div className="rounded-2xl overflow-hidden bg-black border border-slate-700/30">
        {isAudio ? (
          <div className="flex flex-col items-center justify-center py-14 bg-gradient-to-br from-navy-800 to-navy-900">
            <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-accent-blue/30 to-accent-purple/20 flex items-center justify-center mb-6">
              <Music2 className="h-12 w-12 text-accent-blue" />
            </div>
            <audio
              ref={mediaRef as React.RefObject<HTMLAudioElement>}
              src={`/api/stream/${id}`}
              controls
              autoPlay
              className="w-[min(90%,32rem)]"
              onTimeUpdate={onTimeUpdate}
              onLoadedMetadata={onLoadedMetadata}
              onEnded={() => saveProgress(item.duration || 0, true)}
            />
          </div>
        ) : (
          <video
            ref={mediaRef as React.RefObject<HTMLVideoElement>}
            src={`/api/stream/${id}`}
            poster={`/api/thumbnail/${id}`}
            controls
            autoPlay
            className="w-full aspect-video bg-black"
            onTimeUpdate={onTimeUpdate}
            onLoadedMetadata={onLoadedMetadata}
            onEnded={() => saveProgress(item.duration || 0, true)}
          />
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-slate-100 break-words">{item.title}</h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-sm text-slate-500">
            <span className="capitalize">{item.source === "download" ? "Downloaded" : "Library"}</span>
            {item.duration ? <span>· {formatDuration(item.duration)}</span> : null}
            {item.width && item.height ? <span>· {item.height}p</span> : null}
            <span>· {formatBytes(item.size)}</span>
            {item.ext ? <span>· {item.ext.toUpperCase()}</span> : null}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <ActionButton active={state.favorite} onClick={() => toggle("favorite")} label="Favorite">
            <Heart className={cn("h-4 w-4", state.favorite && "fill-current")} />
          </ActionButton>
          <ActionButton active={state.liked} onClick={() => toggle("liked")} label="Like">
            <ThumbsUp className={cn("h-4 w-4", state.liked && "fill-current")} />
          </ActionButton>
          <ActionButton active={state.watchLater} onClick={() => toggle("watchLater")} label="Watch later">
            <Clock className="h-4 w-4" />
          </ActionButton>
          <ActionButton active={false} onClick={() => setPlaylistOpen(true)} label="Add to playlist">
            <ListPlus className="h-4 w-4" />
          </ActionButton>
        </div>
      </div>

      {playlistOpen && (
        <AddToPlaylistModal itemId={id} onClose={() => setPlaylistOpen(false)} />
      )}
    </div>
  );
}

function ActionButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={cn(
        "flex items-center justify-center h-10 w-10 rounded-xl border transition-colors",
        active
          ? "bg-accent-blue/20 border-accent-blue/40 text-accent-blue"
          : "bg-navy-800/60 border-slate-700/40 text-slate-400 hover:text-slate-200 hover:border-slate-600",
      )}
    >
      {children}
    </button>
  );
}
