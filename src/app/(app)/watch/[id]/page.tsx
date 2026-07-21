"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Clock, Heart, ListPlus, Loader2, Music2, Pause, Play, ThumbsUp } from "lucide-react";
import { apiGet, apiSend } from "@/lib/client-api";
import { cn, formatBytes, formatDuration } from "@/lib/utils";
import { useToast } from "@/components/providers/toast-provider";
import { usePlayer } from "@/components/player/player-provider";
import { VideoPlayer } from "@/components/player/video-player";
import { AddToPlaylistModal } from "@/components/media/add-to-playlist";
import { MediaMetadata } from "@/components/media/media-metadata";
import type { LibraryItem } from "@/lib/types";

export default function WatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const player = usePlayer();
  const [playlistOpen, setPlaylistOpen] = useState(false);

  const { data: item, isLoading } = useQuery({
    queryKey: ["library", id],
    queryFn: () => apiGet<LibraryItem>(`/api/library/${id}`),
  });

  const [state, setState] = useState<LibraryItem["state"] | null>(null);
  useEffect(() => {
    if (item) setState(item.state);
  }, [item]);

  // Audio items play through the persistent bottom player.
  useEffect(() => {
    if (item && item.type === "audio" && player.current?.id !== item.id) {
      player.playQueue([item], 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id]);

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
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const isAudio = item.type === "audio";
  const audioActive = player.current?.id === item.id;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {isAudio ? (
        <div className="glass-card flex flex-col items-center justify-center gap-6 py-14">
          <div className="flex h-40 w-40 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/30 to-secondary/20 shadow-xl">
            <Music2 className="h-16 w-16 text-primary" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-semibold text-foreground">{item.title}</h1>
            <p className="mt-1 text-sm text-muted">
              {item.ext?.toUpperCase()}
              {item.duration ? ` · ${formatDuration(item.duration)}` : ""}
            </p>
          </div>
          <button
            onClick={() => (audioActive ? player.toggle() : player.playQueue([item], 0))}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-primary to-secondary text-white shadow-lg shadow-primary/30 transition-transform hover:scale-105"
            aria-label={audioActive && player.playing ? "Pause" : "Play"}
          >
            {audioActive && player.playing ? (
              <Pause className="h-6 w-6 fill-white" />
            ) : (
              <Play className="ml-0.5 h-6 w-6 fill-white" />
            )}
          </button>
          <p className="text-xs text-muted-2">Playing in the bar below — it keeps going as you browse.</p>
        </div>
      ) : (
        <VideoPlayer item={item} startAt={!state.finished && state.position > 3 ? state.position : 0} />
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="break-words text-xl font-semibold text-foreground">{item.title}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-2">
            <span className="capitalize">{item.category}</span>
            {item.duration ? <span>· {formatDuration(item.duration)}</span> : null}
            {item.height ? <span>· {item.height}p</span> : null}
            <span>· {formatBytes(item.size)}</span>
            {item.ext ? <span>· {item.ext.toUpperCase()}</span> : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
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

      {item.type === "video" && (
        <MediaMetadata itemId={id} metadata={item.metadata} canEdit />
      )}

      {playlistOpen && <AddToPlaylistModal itemId={id} onClose={() => setPlaylistOpen(false)} />}
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
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-xl border transition-colors",
        active
          ? "border-primary/40 bg-primary/15 text-primary"
          : "border-stroke bg-surface-2/60 text-muted hover:border-stroke-strong hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}
