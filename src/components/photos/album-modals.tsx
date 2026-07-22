"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { X, Plus, Lock, Loader2, Check } from "lucide-react";
import { apiSend } from "@/lib/client-api";
import { useToast } from "@/components/providers/toast-provider";
import { useAlbums } from "@/hooks/use-photos";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AlbumSummary } from "@/lib/types";

const inputCls =
  "w-full h-10 px-3 rounded-lg bg-navy-800/80 border border-slate-600/30 text-sm text-slate-200 placeholder-slate-500 focus:border-accent-blue/50 focus:outline-none";

/** Create a new album (optionally nested, private, password-protected). */
export function CreateAlbumModal({
  parentId,
  onClose,
  onCreated,
}: {
  parentId?: string | null;
  onClose: () => void;
  onCreated?: (album: AlbumSummary) => void;
}) {
  const toast = useToast();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  async function create() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const album = await apiSend<AlbumSummary>("POST", "/api/albums", {
        name: name.trim(),
        parentId: parentId ?? null,
        isPrivate,
        ...(password.trim() ? { password: password.trim() } : {}),
      });
      toast("Album created", "success");
      qc.invalidateQueries({ queryKey: ["albums"] });
      onCreated?.(album);
      onClose();
    } catch (e) {
      toast((e as Error).message || "Could not create album", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-navy-900/70 p-4" onClick={onClose}>
      <div className="glass-card w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-100">New Album</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3">
          <input
            autoFocus
            className={inputCls}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && create()}
            placeholder="Album name"
          />
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} />
            Private (only you can see it)
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              className={cn(inputCls, "pl-9")}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (optional)"
            />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button size="sm" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={create} isLoading={saving} disabled={!name.trim()}>Create</Button>
        </div>
      </div>
    </div>
  );
}

/** Pick an album (or create one) to add photos into. */
export function AddToAlbumModal({
  photoIds,
  onClose,
}: {
  photoIds: string[];
  onClose: () => void;
}) {
  const toast = useToast();
  const { data: albums = [], isLoading } = useAlbums(null);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const mine = albums.filter((a) => a.isOwner);

  async function addTo(albumId: string) {
    setBusy(albumId);
    try {
      await apiSend("POST", `/api/albums/${albumId}/photos`, { photoIds });
      toast(`Added ${photoIds.length} to album`, "success");
      onClose();
    } catch (e) {
      toast((e as Error).message || "Could not add", "error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-navy-900/70 p-4" onClick={onClose}>
      <div className="glass-card w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-100">Add to Album</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-3 max-h-64 space-y-1 overflow-y-auto">
          {isLoading && <p className="py-4 text-center text-sm text-slate-500">Loading…</p>}
          {!isLoading && mine.length === 0 && (
            <p className="py-4 text-center text-sm text-slate-500">No albums yet — create one below.</p>
          )}
          {mine.map((a) => (
            <button
              key={a.id}
              onClick={() => addTo(a.id)}
              disabled={busy === a.id}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-slate-300 hover:bg-navy-700/50 disabled:opacity-50"
            >
              <span className="flex-1 truncate">{a.name}</span>
              {busy === a.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 opacity-0" />}
              <span className="text-xs text-slate-500">{a.photoCount}</span>
            </button>
          ))}
        </div>

        {creating ? (
          <CreateAlbumModal onClose={() => setCreating(false)} onCreated={(a) => addTo(a.id)} />
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="flex w-full items-center gap-2 rounded-lg border border-dashed border-slate-600/40 px-3 py-2.5 text-sm text-accent-blue hover:bg-navy-700/40"
          >
            <Plus className="h-4 w-4" /> New album
          </button>
        )}
      </div>
    </div>
  );
}
