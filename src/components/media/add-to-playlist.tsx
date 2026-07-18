"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { X, Plus, ListVideo } from "lucide-react";
import { apiGet, apiSend } from "@/lib/client-api";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import type { PlaylistSummary } from "@/lib/types";

export function AddToPlaylistModal({
  itemId,
  onClose,
}: {
  itemId: string;
  onClose: () => void;
}) {
  const toast = useToast();
  const qc = useQueryClient();
  const [newName, setNewName] = useState("");
  const { data: playlists = [], refetch } = useQuery({
    queryKey: ["playlists"],
    queryFn: () => apiGet<PlaylistSummary[]>("/api/playlists"),
  });

  async function addTo(playlistId: string) {
    try {
      await apiSend("POST", `/api/playlists/${playlistId}/items`, { itemId });
      toast("Added to playlist", "success");
      qc.invalidateQueries({ queryKey: ["playlists"] });
      onClose();
    } catch (e: any) {
      toast(e.message || "Could not add", "error");
    }
  }

  async function createAndAdd() {
    if (!newName.trim()) return;
    try {
      const pl = await apiSend<{ id: string }>("POST", "/api/playlists", { name: newName.trim() });
      await addTo(pl.id);
      refetch();
    } catch {
      toast("Could not create playlist", "error");
    }
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-navy-900/70 p-4"
      onClick={onClose}
    >
      <div className="glass-card w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-slate-100">Add to Playlist</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-1 max-h-64 overflow-y-auto mb-4">
          {playlists.length === 0 && (
            <p className="text-sm text-slate-500 py-4 text-center">No playlists yet.</p>
          )}
          {playlists.map((pl) => (
            <button
              key={pl.id}
              onClick={() => addTo(pl.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm text-slate-300 hover:bg-navy-700/50"
            >
              <ListVideo className="h-4 w-4 text-accent-blue" />
              <span className="flex-1 truncate">{pl.name}</span>
              <span className="text-xs text-slate-500">{pl.count}</span>
            </button>
          ))}
        </div>

        <div className="flex gap-2 pt-3 border-t border-slate-700/30">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createAndAdd()}
            placeholder="New playlist name"
            className="flex-1 h-9 px-3 rounded-lg bg-navy-800/80 border border-slate-600/30 text-sm text-slate-200 placeholder-slate-500 focus:border-accent-blue/50 focus:outline-none"
          />
          <Button size="sm" onClick={createAndAdd} disabled={!newName.trim()}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
