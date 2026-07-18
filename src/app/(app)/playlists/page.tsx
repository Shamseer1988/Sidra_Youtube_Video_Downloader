"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ListVideo, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiGet, apiSend } from "@/lib/client-api";
import { useToast } from "@/components/providers/toast-provider";
import type { PlaylistSummary } from "@/lib/types";

export default function PlaylistsPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  const { data: playlists = [], isLoading } = useQuery({
    queryKey: ["playlists"],
    queryFn: () => apiGet<PlaylistSummary[]>("/api/playlists"),
  });

  async function create() {
    if (!name.trim()) return;
    setCreating(true);
    try {
      await apiSend("POST", "/api/playlists", { name: name.trim() });
      setName("");
      qc.invalidateQueries({ queryKey: ["playlists"] });
    } catch {
      toast("Could not create playlist", "error");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-100">Playlists</h1>
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && create()}
            placeholder="New playlist name"
            className="h-10 px-3 rounded-lg bg-navy-800/80 border border-slate-600/30 text-sm text-slate-200 placeholder-slate-500 focus:border-accent-blue/50 focus:outline-none"
          />
          <Button onClick={create} isLoading={creating} disabled={!name.trim()}>
            <Plus className="h-4 w-4" /> Create
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-accent-blue" />
        </div>
      ) : playlists.length === 0 ? (
        <div className="glass-card py-16 text-center text-sm text-slate-500">
          No playlists yet. Create one above, then add media from any video or track.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {playlists.map((pl) => (
            <Link
              key={pl.id}
              href={`/playlists/${pl.id}`}
              className="glass-card p-5 hover:border-accent-blue/40 transition-colors group"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-blue/30 to-accent-purple/20 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <ListVideo className="h-6 w-6 text-accent-blue" />
              </div>
              <p className="font-medium text-slate-200 truncate">{pl.name}</p>
              <p className="text-xs text-slate-500 mt-0.5">{pl.count} item{pl.count === 1 ? "" : "s"}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
