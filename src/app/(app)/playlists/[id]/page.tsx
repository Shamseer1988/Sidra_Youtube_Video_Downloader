"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Trash2, Pencil, Loader2, Check, X } from "lucide-react";
import Link from "next/link";
import { apiGet, apiSend } from "@/lib/client-api";
import { MediaCard } from "@/components/media/media-card";
import { useToast } from "@/components/providers/toast-provider";
import type { LibraryItem } from "@/lib/types";

interface PlaylistDetail {
  id: string;
  name: string;
  items: (LibraryItem & { playlistItemId: string })[];
}

export default function PlaylistDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["playlist", id],
    queryFn: () => apiGet<PlaylistDetail>(`/api/playlists/${id}`),
  });

  async function rename() {
    try {
      await apiSend("PATCH", `/api/playlists/${id}`, { name: name.trim() });
      setEditing(false);
      qc.invalidateQueries({ queryKey: ["playlist", id] });
      qc.invalidateQueries({ queryKey: ["playlists"] });
    } catch {
      toast("Could not rename", "error");
    }
  }

  async function removeItem(itemId: string) {
    try {
      await apiSend("DELETE", `/api/playlists/${id}/items`, { itemId });
      qc.invalidateQueries({ queryKey: ["playlist", id] });
    } catch {
      toast("Could not remove", "error");
    }
  }

  async function deletePlaylist() {
    if (!confirm("Delete this playlist?")) return;
    try {
      await apiSend("DELETE", `/api/playlists/${id}`);
      toast("Playlist deleted", "success");
      qc.invalidateQueries({ queryKey: ["playlists"] });
      router.push("/playlists");
    } catch {
      toast("Could not delete", "error");
    }
  }

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-6 w-6 animate-spin text-accent-blue" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/playlists" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200">
        <ArrowLeft className="h-4 w-4" /> All playlists
      </Link>

      <div className="flex items-center justify-between gap-3">
        {editing ? (
          <div className="flex items-center gap-2 flex-1">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && rename()}
              autoFocus
              className="h-10 px-3 rounded-lg bg-navy-800/80 border border-slate-600/30 text-lg text-slate-100 focus:border-accent-blue/50 focus:outline-none"
            />
            <button onClick={rename} className="p-2 text-emerald-400 hover:bg-navy-700/50 rounded-lg">
              <Check className="h-5 w-5" />
            </button>
            <button onClick={() => setEditing(false)} className="p-2 text-slate-400 hover:bg-navy-700/50 rounded-lg">
              <X className="h-5 w-5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-100">{data.name}</h1>
            <button
              onClick={() => { setName(data.name); setEditing(true); }}
              className="p-1.5 text-slate-500 hover:text-slate-300"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <span className="text-sm text-slate-500">{data.items.length} items</span>
          </div>
        )}
        <button
          onClick={deletePlaylist}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10"
        >
          <Trash2 className="h-4 w-4" /> Delete
        </button>
      </div>

      {data.items.length === 0 ? (
        <div className="glass-card py-16 text-center text-sm text-slate-500">
          This playlist is empty. Add items using the ⋯ menu on any video or track.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {data.items.map((item) => (
            <div key={item.playlistItemId} className="relative group/pl">
              <button
                onClick={() => removeItem(item.id)}
                title="Remove from playlist"
                className="absolute top-2 right-2 z-10 p-1.5 rounded-lg bg-navy-900/80 text-slate-300 hover:text-red-400 opacity-0 group-hover/pl:opacity-100 transition-opacity"
              >
                <X className="h-4 w-4" />
              </button>
              <MediaCard item={item} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
