"use client";

import { memo } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Music, Play, RotateCw, Trash2, Video, X } from "lucide-react";
import { cn, formatBytes } from "@/lib/utils";
import { apiSend } from "@/lib/client-api";
import { useDownloads } from "@/hooks/use-dashboard";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import type { DownloadJob } from "@/lib/types";

const statusMeta: Record<string, { label: string; badge: string }> = {
  queued: { label: "Queued", badge: "border-stroke bg-surface-3 text-muted" },
  downloading: { label: "Downloading", badge: "border-accent/30 bg-accent/10 text-accent" },
  completed: { label: "Completed", badge: "border-success/30 bg-success/10 text-success" },
  failed: { label: "Failed", badge: "border-danger/30 bg-danger/10 text-danger" },
  canceled: { label: "Canceled", badge: "border-stroke bg-surface-3 text-muted-2" },
};

/** Recent downloads — real queue from /api/downloads. */
export const DownloadTable = memo(function DownloadTable() {
  const qc = useQueryClient();
  const { data: downloads = [], isLoading } = useDownloads();
  const rows = downloads.slice(0, 5);

  async function act(id: string, kind: "retry" | "delete") {
    try {
      if (kind === "retry") await apiSend("POST", `/api/downloads/${id}`);
      else await apiSend("DELETE", `/api/downloads/${id}`);
      qc.invalidateQueries({ queryKey: ["downloads"] });
    } catch {
      /* toast handled elsewhere */
    }
  }

  return (
    <section aria-label="Recent downloads" className="glass-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">Recent Downloads</h2>
        <Link
          href="/downloads"
          className="rounded-lg border border-stroke px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-primary/40 hover:text-foreground"
        >
          View All
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center">
          <CheckCircle2 className="mb-3 h-8 w-8 text-muted-2" />
          <p className="text-sm text-muted">No downloads yet.</p>
          <Link href="/downloads" className="mt-2 text-xs text-primary hover:underline">
            Paste a link to start one →
          </Link>
        </div>
      ) : (
        <div className="space-y-2.5">
          {rows.map((d) => (
            <DownloadRow key={d.id} d={d} onAct={act} />
          ))}
        </div>
      )}
    </section>
  );
});

function DownloadRow({ d, onAct }: { d: DownloadJob; onAct: (id: string, kind: "retry" | "delete") => void }) {
  const meta = statusMeta[d.status] ?? statusMeta.queued;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-stroke bg-surface-2/50 p-3">
      <span className="flex h-11 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-3">
        {d.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={d.thumbnail} alt="" className="h-full w-full object-cover" />
        ) : d.mediaType === "audio" ? (
          <Music className="h-5 w-5 text-muted-2" />
        ) : (
          <Video className="h-5 w-5 text-muted-2" />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-[13px] font-medium text-foreground">{d.title}</p>
          <Badge size="sm" className={cn("shrink-0 border", meta.badge)}>
            {meta.label}
          </Badge>
        </div>
        {d.status === "downloading" ? (
          <div className="mt-1.5 flex items-center gap-2.5">
            <Progress value={d.progress} active className="h-1" />
            <span className="shrink-0 text-[11px] tabular-nums text-muted">
              {d.progress.toFixed(0)}%
            </span>
          </div>
        ) : (
          <p className="mt-0.5 truncate text-[11px] capitalize text-muted-2">
            {d.platform} · {d.mediaType}
            {d.fileSize ? ` · ${formatBytes(d.fileSize)}` : ""}
            {d.status === "failed" && d.error ? ` · ${d.error}` : ""}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {d.status === "completed" && d.libraryId && (
          <Link
            href={`/watch/${d.libraryId}`}
            className="rounded-lg p-1.5 text-accent hover:bg-surface-3"
            aria-label="Play"
          >
            <Play className="h-4 w-4" />
          </Link>
        )}
        {(d.status === "failed" || d.status === "canceled") && (
          <button
            onClick={() => onAct(d.id, "retry")}
            className="rounded-lg p-1.5 text-muted-2 hover:bg-surface-3 hover:text-foreground"
            aria-label="Retry"
          >
            <RotateCw className="h-4 w-4" />
          </button>
        )}
        <button
          onClick={() => onAct(d.id, "delete")}
          className="rounded-lg p-1.5 text-muted-2 hover:bg-danger/10 hover:text-danger"
          aria-label={d.status === "downloading" ? "Cancel" : "Remove"}
        >
          {d.status === "downloading" ? <X className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
