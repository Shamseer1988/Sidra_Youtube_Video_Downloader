"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, CornerLeftUp, Folder, FolderOpen, HardDrive, Loader2 } from "lucide-react";
import { apiGet } from "@/lib/client-api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface BrowseEntry {
  name: string;
  path: string;
}
interface BrowseResult {
  ok: boolean;
  message?: string;
  cwd: string | null;
  parent: string | null;
  atRoot: boolean;
  dirs: BrowseEntry[];
}

export function FolderPicker({
  open,
  onOpenChange,
  onPick,
  endpoint = "/api/browse",
  queryParam = "path",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (path: string) => void;
  endpoint?: string;
  queryParam?: string;
}) {
  const [path, setPath] = useState<string | null>(null);

  const { data, isFetching } = useQuery({
    queryKey: ["browse", endpoint, path],
    queryFn: () =>
      apiGet<BrowseResult>(`${endpoint}${path ? `?${queryParam}=${encodeURIComponent(path)}` : ""}`),
    enabled: open,
  });

  function pickCurrent() {
    if (data?.cwd) {
      onPick(data.cwd);
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Choose a folder</DialogTitle>
          <DialogDescription>
            Browse your mounted media volumes and pick the folder to add as a library.
          </DialogDescription>
        </DialogHeader>

        {/* Current path */}
        <div className="mb-2 flex items-center gap-2 rounded-xl border border-stroke bg-surface-2 px-3 py-2">
          <FolderOpen className="h-4 w-4 shrink-0 text-primary" />
          <code className="min-w-0 flex-1 truncate font-mono text-xs text-foreground">
            {data?.cwd ?? "Mounted volumes"}
          </code>
        </div>

        {/* Listing */}
        <div className="max-h-[320px] min-h-[200px] overflow-y-auto rounded-xl border border-stroke bg-surface-2/50 p-1.5">
          {isFetching ? (
            <div className="flex h-[200px] items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-2" />
            </div>
          ) : (
            <>
              {data && !data.atRoot && data.parent !== null && (
                <button
                  onClick={() => setPath(data.parent)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-surface-3 hover:text-foreground"
                >
                  <CornerLeftUp className="h-4 w-4" /> Up one level
                </button>
              )}
              {data?.dirs.length === 0 && (
                <p className="px-3 py-8 text-center text-sm text-muted-2">
                  No subfolders here — you can add this folder itself.
                </p>
              )}
              {data?.dirs.map((d) => (
                <button
                  key={d.path}
                  onClick={() => setPath(d.path)}
                  className="group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-surface-3"
                >
                  {data.atRoot ? (
                    <HardDrive className="h-4 w-4 shrink-0 text-accent" />
                  ) : (
                    <Folder className="h-4 w-4 shrink-0 text-primary" />
                  )}
                  <span className="min-w-0 flex-1 truncate">{d.name}</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-2 opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
              ))}
            </>
          )}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={pickCurrent} disabled={!data?.cwd}>
            <FolderOpen className="h-4 w-4" /> Use this folder
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
