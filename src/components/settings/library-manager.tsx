"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FolderOpen, FolderPlus, Library, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiGet, apiSend } from "@/lib/client-api";
import { CATEGORIES, categoryIcon } from "@/lib/categories";
import type { LibraryDTO } from "@/lib/types";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FolderPicker } from "@/components/settings/folder-picker";

export function LibraryManager({ isAdmin }: { isAdmin: boolean }) {
  const toast = useToast();
  const qc = useQueryClient();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [folderPath, setFolderPath] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState<LibraryDTO["category"]>("movies");

  const { data: libraries = [], isLoading } = useQuery({
    queryKey: ["libraries"],
    queryFn: () => apiGet<LibraryDTO[]>("/api/libraries"),
  });

  const addMutation = useMutation({
    mutationFn: () => apiSend<LibraryDTO>("POST", "/api/libraries", { name, folderPath, category }),
    onSuccess: () => {
      toast("Library added — scanning for media…", "success");
      setFolderPath("");
      setName("");
      qc.invalidateQueries({ queryKey: ["libraries"] });
      scanMutation.mutate();
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => apiSend("DELETE", `/api/libraries/${id}`),
    onSuccess: () => {
      toast("Library removed", "success");
      qc.invalidateQueries({ queryKey: ["libraries"] });
      qc.invalidateQueries({ queryKey: ["library"] });
    },
    onError: () => toast("Could not remove library", "error"),
  });

  const scanMutation = useMutation({
    mutationFn: () => apiSend<{ scanned: number; added: number; removed: number }>("POST", "/api/library/scan"),
    onSuccess: (res) => {
      toast(`Scan complete — ${res.added} added, ${res.removed} removed`, "success");
      qc.invalidateQueries({ queryKey: ["libraries"] });
      qc.invalidateQueries({ queryKey: ["library"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
    onError: () => toast("Scan failed", "error"),
  });

  return (
    <section aria-label="Libraries" className="glass-card p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Library className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-foreground">Media Libraries</h2>
            <p className="text-xs text-muted-2">
              Assign & categorize NAS folders. Only added folders are indexed.
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => scanMutation.mutate()}
          isLoading={scanMutation.isPending}
        >
          {!scanMutation.isPending && <RefreshCw className="h-4 w-4" />} Scan all
        </Button>
      </div>

      {/* Existing libraries */}
      {isLoading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : libraries.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-stroke bg-surface-2/40 p-6 text-center text-sm text-muted">
          No libraries yet. Add a folder below — e.g. assign{" "}
          <code className="text-foreground">/media/videos/Movies</code> as a{" "}
          <span className="text-foreground">Movies</span> library.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {libraries.map((lib) => {
            const Icon = categoryIcon[lib.category] ?? FolderOpen;
            return (
              <li
                key={lib.id}
                className="flex items-center gap-3 rounded-xl border border-stroke bg-surface-2/60 p-3"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-3 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-foreground">{lib.name}</p>
                    <Badge size="sm" className="border-primary/30 bg-primary/10 capitalize text-primary">
                      {lib.category}
                    </Badge>
                  </div>
                  <p className="truncate font-mono text-[11px] text-muted-2">{lib.path}</p>
                </div>
                <span className="hidden shrink-0 text-xs text-muted sm:block">
                  {lib.itemCount} item{lib.itemCount === 1 ? "" : "s"}
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
            );
          })}
        </ul>
      )}

      {/* Add form */}
      {isAdmin && (
        <div className="mt-4 rounded-2xl border border-stroke bg-surface-2/60 p-4">
          <p className="mb-3 text-sm font-medium text-foreground">Add a library</p>
          <div className="flex flex-col gap-2.5">
            <div className="flex flex-col gap-2.5 sm:flex-row">
              <button
                onClick={() => setPickerOpen(true)}
                className="flex h-10 min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-stroke bg-surface px-3 text-left transition-colors hover:border-primary/40"
              >
                <FolderOpen className="h-4 w-4 shrink-0 text-muted-2" />
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate font-mono text-xs",
                    folderPath ? "text-foreground" : "text-muted-2"
                  )}
                >
                  {folderPath || "Browse mounted volumes…"}
                </span>
              </button>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Display name (optional)"
                aria-label="Library name"
                className="h-10 rounded-xl border border-stroke bg-surface px-3.5 text-sm text-foreground placeholder:text-muted-2 focus:border-primary/50 sm:w-48"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-2">Category:</span>
              {CATEGORIES.map((c) => {
                const Icon = categoryIcon[c.id];
                return (
                  <button
                    key={c.id}
                    onClick={() => setCategory(c.id)}
                    aria-pressed={category === c.id}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                      category === c.id
                        ? "border-primary/50 bg-primary/15 text-foreground"
                        : "border-stroke text-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {c.label}
                  </button>
                );
              })}
              <Button
                size="sm"
                className="ml-auto"
                disabled={!folderPath}
                isLoading={addMutation.isPending}
                onClick={() => addMutation.mutate()}
              >
                {!addMutation.isPending && <FolderPlus className="h-4 w-4" />} Add Library
              </Button>
            </div>
          </div>
        </div>
      )}

      {scanMutation.isPending && (
        <p className="mt-3 flex items-center gap-2 text-xs text-muted">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Indexing media files…
        </p>
      )}

      <FolderPicker open={pickerOpen} onOpenChange={setPickerOpen} onPick={setFolderPath} />
    </section>
  );
}
