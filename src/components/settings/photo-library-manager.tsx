"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FolderOpen, FolderPlus, Images, Loader2, Trash2 } from "lucide-react";
import { apiSend } from "@/lib/client-api";
import { usePhotoLibraries } from "@/hooks/use-photos";
import type { PhotoLibrarySummary } from "@/lib/types";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FolderPicker } from "@/components/settings/folder-picker";

export function PhotoLibraryManager({ isAdmin }: { isAdmin: boolean }) {
  const toast = useToast();
  const qc = useQueryClient();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [folderPath, setFolderPath] = useState("");
  const [name, setName] = useState("");

  const { data: libraries = [], isLoading } = usePhotoLibraries();

  const scanMutation = useMutation({
    mutationFn: () => apiSend<{ added: number; removed: number }>("POST", "/api/photos/scan"),
    onSuccess: (res) => {
      toast(`Scan complete — ${res.added} added, ${res.removed} removed`, "success");
      qc.invalidateQueries({ queryKey: ["photos"] });
      qc.invalidateQueries({ queryKey: ["photo-libraries"] });
    },
    onError: () => toast("Scan failed", "error"),
  });

  const addMutation = useMutation({
    mutationFn: () => apiSend<PhotoLibrarySummary>("POST", "/api/photo-libraries", { name, folderPath }),
    onSuccess: () => {
      toast("Photo folder added — scanning…", "success");
      setFolderPath("");
      setName("");
      qc.invalidateQueries({ queryKey: ["photo-libraries"] });
      scanMutation.mutate();
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => apiSend("DELETE", `/api/photo-libraries/${id}`),
    onSuccess: () => {
      toast("Photo folder removed", "success");
      qc.invalidateQueries({ queryKey: ["photo-libraries"] });
      qc.invalidateQueries({ queryKey: ["photos"] });
    },
    onError: () => toast("Could not remove", "error"),
  });

  return (
    <section aria-label="Photo libraries" className="glass-card p-6">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Images className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-base font-semibold text-foreground">Photo Library</h2>
          <p className="text-xs text-muted-2">
            Add a mounted photo folder (e.g. a Synology <code className="text-foreground">/photo</code> share) to index.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2.5">
          <Skeleton className="h-16 rounded-xl" />
        </div>
      ) : libraries.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-stroke bg-surface-2/40 p-6 text-center text-sm text-muted">
          No photo folders yet. Mount a share (via <code className="text-foreground">MEDIA_PHOTO_PATH</code>) and add it below.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {libraries.map((lib) => (
            <li key={lib.id} className="flex items-center gap-3 rounded-xl border border-stroke bg-surface-2/60 p-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-3 text-primary">
                <FolderOpen className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{lib.name}</p>
                <p className="truncate font-mono text-[11px] text-muted-2">{lib.path}</p>
              </div>
              <span className="hidden shrink-0 text-xs text-muted sm:block">
                {lib.photoCount.toLocaleString()} photo{lib.photoCount === 1 ? "" : "s"}
              </span>
              {isAdmin && (
                <button
                  onClick={() => removeMutation.mutate(lib.id)}
                  aria-label={`Remove ${lib.name}`}
                  className="shrink-0 rounded-lg p-1.5 text-muted-2 transition-colors hover:bg-danger/10 hover:text-danger"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {isAdmin && (
        <div className="mt-4 rounded-2xl border border-stroke bg-surface-2/60 p-4">
          <p className="mb-3 text-sm font-medium text-foreground">Add a photo folder</p>
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-stroke bg-surface px-2 focus-within:border-primary/40">
              <FolderOpen className="h-4 w-4 shrink-0 text-muted-2" />
              <input
                value={folderPath}
                onChange={(e) => setFolderPath(e.target.value)}
                placeholder="/media/photos"
                aria-label="Photo folder path"
                className="h-10 min-w-0 flex-1 bg-transparent font-mono text-xs text-foreground placeholder:text-muted-2 focus:outline-none"
              />
              <button
                onClick={() => setPickerOpen(true)}
                className="shrink-0 rounded-lg px-2 py-1 text-xs text-primary hover:bg-primary/10"
              >
                Browse
              </button>
            </div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Display name (optional)"
              aria-label="Library name"
              className="h-10 rounded-xl border border-stroke bg-surface px-3.5 text-sm text-foreground placeholder:text-muted-2 focus:border-primary/50 sm:w-48"
            />
            <Button disabled={!folderPath.trim()} isLoading={addMutation.isPending} onClick={() => addMutation.mutate()}>
              {!addMutation.isPending && <FolderPlus className="h-4 w-4" />} Add
            </Button>
          </div>
          <p className="mt-2 text-[11px] text-muted-2">
            Type the in-container path (e.g. <code className="text-foreground">/media/photos</code>) or Browse. If browsing
            shows “permission denied”, grant the container user read access to that share on your NAS.
          </p>
          {scanMutation.isPending && (
            <p className="mt-3 flex items-center gap-2 text-xs text-muted">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Indexing photos…
            </p>
          )}
        </div>
      )}

      <FolderPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onPick={setFolderPath}
        endpoint="/api/photos/browse"
        queryParam="dir"
      />
    </section>
  );
}
