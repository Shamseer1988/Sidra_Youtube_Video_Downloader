"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Clapperboard,
  FolderOpen,
  FolderPlus,
  HardDrive,
  Info,
  Music,
  RefreshCw,
  Trash2,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiGet, apiSend } from "@/lib/client-api";
import { useToast } from "@/components/providers/toast-provider";
import { useUser } from "@/components/providers/user-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface SettingsData {
  role: string;
  nasName: string;
  downloadVideoPath: string;
  downloadAudioPath: string;
  mediaVideoPaths: string[];
  mediaAudioPaths: string[];
  extraVideoDirs: string[];
  extraAudioDirs: string[];
}

function PathRow({
  label,
  value,
  badge,
  onRemove,
}: {
  label: string;
  value: string;
  badge?: string;
  onRemove?: () => void;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-stroke py-2.5 last:border-0">
      <span className="w-40 shrink-0 text-[13px] text-muted">{label}</span>
      <code className="min-w-0 flex-1 truncate rounded-lg bg-surface-2 px-2.5 py-1 font-mono text-xs text-foreground">
        {value || "—"}
      </code>
      {badge && (
        <Badge size="sm" className="hidden shrink-0 border-stroke bg-surface-3 text-muted sm:inline-flex">
          {badge}
        </Badge>
      )}
      {onRemove && (
        <button
          onClick={onRemove}
          aria-label={`Remove ${value}`}
          className="shrink-0 rounded-lg p-1.5 text-muted-2 transition-colors hover:bg-danger/10 hover:text-danger"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function AddFolderForm({
  onAdded,
}: {
  onAdded: () => void;
}) {
  const toast = useToast();
  const [path, setPath] = useState("");
  const [kind, setKind] = useState<"video" | "audio">("video");

  const mutation = useMutation({
    mutationFn: () => apiSend("POST", "/api/settings", { action: "add", kind, path }),
    onSuccess: () => {
      toast(`Folder added — run a scan to index it`, "success");
      setPath("");
      onAdded();
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (path.trim()) mutation.mutate();
      }}
      className="mt-4 flex flex-col gap-2.5 rounded-2xl border border-stroke bg-surface-2/60 p-3.5 sm:flex-row"
    >
      <div className="flex shrink-0 overflow-hidden rounded-xl border border-stroke">
        {(["video", "audio"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            aria-pressed={kind === k}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 text-xs font-medium capitalize transition-colors",
              kind === k
                ? "bg-primary/15 text-foreground"
                : "bg-transparent text-muted hover:text-foreground"
            )}
          >
            {k === "video" ? <Clapperboard className="h-3.5 w-3.5" /> : <Music className="h-3.5 w-3.5" />}
            {k}
          </button>
        ))}
      </div>
      <input
        value={path}
        onChange={(e) => setPath(e.target.value)}
        placeholder="/media/videos/Movies  (path inside the container)"
        aria-label="Folder path inside the container"
        className="h-10 min-w-0 flex-1 rounded-xl border border-stroke bg-surface px-3.5 font-mono text-xs text-foreground placeholder:text-muted-2 focus:border-primary/50"
      />
      <Button type="submit" size="sm" className="h-10" isLoading={mutation.isPending}>
        {!mutation.isPending && <FolderPlus className="h-4 w-4" />} Add Folder
      </Button>
    </form>
  );
}

export default function SettingsPage() {
  const toast = useToast();
  const user = useUser();
  const queryClient = useQueryClient();
  const [scanning, setScanning] = useState(false);
  const isAdmin = user.role === "admin";

  const { data, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: () => apiGet<SettingsData>("/api/settings"),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["settings"] });

  const removeMutation = useMutation({
    mutationFn: (vars: { kind: "video" | "audio"; path: string }) =>
      apiSend("POST", "/api/settings", { action: "remove", ...vars }),
    onSuccess: () => {
      toast("Folder removed — items are pruned on next scan", "success");
      refresh();
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  async function scan() {
    setScanning(true);
    try {
      const res = await apiSend<{ added: number; removed: number; scanned: number }>(
        "POST",
        "/api/library/scan"
      );
      toast(`Scanned ${res.scanned} files — ${res.added} added, ${res.removed} removed`, "success");
    } catch {
      toast("Scan failed", "error");
    } finally {
      setScanning(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader title="Settings" subtitle={`SidraMedia on ${data?.nasName ?? "…"}`} />

      {/* Media folders */}
      <section aria-label="Media folders" className="glass-card p-6">
        <div className="mb-4 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <HardDrive className="h-4.5 w-4.5" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-foreground">Media Folders</h2>
            <p className="text-xs text-muted-2">
              Libraries the app scans, streams and saves downloads to.
            </p>
          </div>
        </div>

        {isLoading || !data ? (
          <div className="space-y-2.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-9 rounded-lg" />
            ))}
          </div>
        ) : (
          <>
            <PathRow label="Download · Video" value={data.downloadVideoPath} badge="env" />
            <PathRow label="Download · Audio" value={data.downloadAudioPath} badge="env" />
            {data.mediaVideoPaths.map((p, i) => (
              <PathRow key={`v${i}`} label={`Library · Video ${i + 1}`} value={p} badge="env" />
            ))}
            {data.mediaAudioPaths.map((p, i) => (
              <PathRow key={`a${i}`} label={`Library · Audio ${i + 1}`} value={p} badge="env" />
            ))}
            {data.extraVideoDirs.map((p) => (
              <PathRow
                key={p}
                label="Library · Video"
                value={p}
                badge="added via UI"
                onRemove={isAdmin ? () => removeMutation.mutate({ kind: "video", path: p }) : undefined}
              />
            ))}
            {data.extraAudioDirs.map((p) => (
              <PathRow
                key={p}
                label="Library · Audio"
                value={p}
                badge="added via UI"
                onRemove={isAdmin ? () => removeMutation.mutate({ kind: "audio", path: p }) : undefined}
              />
            ))}

            {isAdmin && <AddFolderForm onAdded={refresh} />}

            <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-stroke bg-surface-2/60 p-3 text-xs text-muted">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <p>
                Paths must exist <em>inside the container</em>. On Synology, first mount the shared
                folder as a Docker volume (e.g.{" "}
                <code className="text-foreground">/volume1/video → /media/videos</code>), then add
                the container path here and run a scan. See{" "}
                <code className="text-foreground">Docs/Synology Setup.md</code>.
              </p>
            </div>
          </>
        )}
      </section>

      {/* Library scan */}
      <section aria-label="Library scan" className="glass-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-success/15 text-success">
              <FolderOpen className="h-4.5 w-4.5" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-foreground">Library Scan</h2>
              <p className="text-xs text-muted-2">
                Re-index all media folders for new or removed files.
              </p>
            </div>
          </div>
          <Button onClick={scan} isLoading={scanning} variant="secondary">
            {!scanning && <RefreshCw className="h-4 w-4" />} Scan now
          </Button>
        </div>
      </section>

      {/* Account */}
      <section aria-label="Account" className="glass-card p-6">
        <div className="mb-4 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15 text-accent">
            <User className="h-4.5 w-4.5" />
          </span>
          <h2 className="text-base font-semibold text-foreground">Account</h2>
        </div>
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12 ring-2 ring-primary/30">
            <AvatarFallback style={{ background: user.avatarColor }} className="text-base">
              {user.username.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-semibold text-foreground">{user.username}</p>
            <p className="truncate text-sm text-muted">{user.email}</p>
            <Badge size="sm" className="mt-1 border-primary/30 bg-primary/10 capitalize text-primary">
              {user.role}
            </Badge>
          </div>
        </div>
      </section>
    </div>
  );
}
