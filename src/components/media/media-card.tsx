"use client";

import { useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { Play, Heart, Clock, Music2, MoreVertical, ListPlus, Trash2 } from "lucide-react";
import { cn, formatDuration } from "@/lib/utils";
import { apiSend } from "@/lib/client-api";
import { useToast } from "@/components/providers/toast-provider";
import { AddToPlaylistModal } from "./add-to-playlist";
import type { LibraryItem } from "@/lib/types";

export function MediaCard({
  item,
  onRemoved,
  showDelete = false,
}: {
  item: LibraryItem;
  onRemoved?: () => void;
  showDelete?: boolean;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const [state, setState] = useState(item.state);
  const [menuOpen, setMenuOpen] = useState(false);
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const isAudio = item.type === "audio";

  const progressPct =
    item.duration && state.position > 0
      ? Math.min(100, (state.position / item.duration) * 100)
      : 0;

  async function toggle(field: "favorite" | "watchLater") {
    const next = !state[field];
    setState((s) => ({ ...s, [field]: next }));
    try {
      await apiSend("PATCH", `/api/library/${item.id}/state`, { [field]: next });
      qc.invalidateQueries({ queryKey: ["library"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    } catch {
      setState((s) => ({ ...s, [field]: !next }));
      toast("Could not update", "error");
    }
  }

  async function remove() {
    if (!confirm(`Remove "${item.title}" from the library?`)) return;
    try {
      await apiSend("DELETE", `/api/library/${item.id}`);
      toast("Removed", "success");
      qc.invalidateQueries({ queryKey: ["library"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      onRemoved?.();
    } catch {
      toast("Could not remove", "error");
    }
  }

  return (
    <div className="group relative">
      <Link href={`/watch/${item.id}`} className="block">
        <div
          className={cn(
            "relative aspect-video rounded-lg overflow-hidden bg-navy-800 border border-slate-700/25",
            "transition-all duration-300 group-hover:scale-[1.03] group-hover:border-slate-500/50 group-hover:shadow-xl group-hover:shadow-black/50 group-hover:z-10",
          )}
        >
          {isAudio ? (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-navy-700 to-navy-800">
              <Music2 className="h-12 w-12 text-slate-600" />
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/thumbnail/${item.id}`}
              alt={item.title}
              loading="lazy"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.visibility = "hidden";
              }}
            />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-navy-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-12 h-12 rounded-full bg-accent-blue/90 flex items-center justify-center shadow-lg">
              <Play className="h-5 w-5 text-white fill-white ml-0.5" />
            </div>
          </div>

          {item.duration ? (
            <span className="absolute bottom-2 right-2 text-[11px] font-medium text-white bg-navy-900/80 px-1.5 py-0.5 rounded">
              {formatDuration(item.duration)}
            </span>
          ) : null}

          {item.source === "download" && (
            <span className="absolute top-2 left-2 text-[10px] font-medium text-accent-emerald bg-navy-900/80 px-1.5 py-0.5 rounded">
              Downloaded
            </span>
          )}

          {progressPct > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-navy-900/60">
              <div className="h-full bg-accent-blue" style={{ width: `${progressPct}%` }} />
            </div>
          )}
        </div>
      </Link>

      <div className="mt-2 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <Link href={`/watch/${item.id}`}>
            <p className="text-sm font-medium text-slate-200 truncate hover:text-white">
              {item.title}
            </p>
          </Link>
          <p className="text-xs text-slate-500 capitalize">
            {item.type}
            {item.ext ? ` · ${item.ext.toUpperCase()}` : ""}
          </p>
        </div>

        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            onClick={() => toggle("favorite")}
            title="Favorite"
            className={cn(
              "p-1.5 rounded-lg transition-colors",
              state.favorite ? "text-red-400" : "text-slate-500 hover:text-slate-300",
            )}
          >
            <Heart className={cn("h-4 w-4", state.favorite && "fill-current")} />
          </button>

          <div className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              onBlur={() => setTimeout(() => setMenuOpen(false), 150)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 transition-colors"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-1 w-44 glass-card z-20 overflow-hidden shadow-xl">
                <button
                  onMouseDown={() => toggle("watchLater")}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-navy-700/50"
                >
                  <Clock className="h-4 w-4" />
                  {state.watchLater ? "Remove from Later" : "Watch Later"}
                </button>
                <button
                  onMouseDown={() => setPlaylistOpen(true)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-navy-700/50"
                >
                  <ListPlus className="h-4 w-4" />
                  Add to Playlist
                </button>
                {showDelete && (
                  <button
                    onMouseDown={remove}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {playlistOpen && (
        <AddToPlaylistModal itemId={item.id} onClose={() => setPlaylistOpen(false)} />
      )}
    </div>
  );
}
