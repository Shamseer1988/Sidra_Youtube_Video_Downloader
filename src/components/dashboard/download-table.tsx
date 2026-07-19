"use client";

import { memo, useCallback, useMemo, useState } from "react";
import Link from "next/link";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  CheckCircle2,
  Clock3,
  FolderOpen,
  MoreVertical,
  Pause,
  Play,
  RotateCcw,
  Trash2,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { downloads as seed, type DownloadItem, type DownloadStatus } from "@/lib/mock-data";
import { PosterArt } from "@/components/media/poster-art";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/* ------------------------------------------------------------------ */

const statusMeta: Record<
  DownloadStatus,
  { label: string; badge: string; icon: React.ReactNode }
> = {
  downloading: {
    label: "Downloading",
    badge: "border-accent/30 bg-accent/10 text-accent",
    icon: <Play className="h-3 w-3" />,
  },
  completed: {
    label: "Completed",
    badge: "border-success/30 bg-success/10 text-success",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  paused: {
    label: "Paused",
    badge: "border-warning/30 bg-warning/10 text-warning",
    icon: <Pause className="h-3 w-3" />,
  },
  queued: {
    label: "Queued",
    badge: "border-stroke bg-surface-3 text-muted",
    icon: <Clock3 className="h-3 w-3" />,
  },
  failed: {
    label: "Failed",
    badge: "border-danger/30 bg-danger/10 text-danger",
    icon: <XCircle className="h-3 w-3" />,
  },
};

function RowActions({
  item,
  onAction,
}: {
  item: DownloadItem;
  onAction: (id: string, action: "pause" | "resume" | "cancel" | "retry") => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={`Actions for ${item.title}`}
          className="rounded-lg p-1.5 text-muted-2 transition-colors hover:bg-surface-3 hover:text-foreground data-[state=open]:bg-surface-3 data-[state=open]:text-foreground"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {item.status === "downloading" && (
          <DropdownMenuItem onSelect={() => onAction(item.id, "pause")}>
            <Pause className="h-4 w-4" /> Pause
          </DropdownMenuItem>
        )}
        {(item.status === "paused" || item.status === "queued") && (
          <DropdownMenuItem onSelect={() => onAction(item.id, "resume")}>
            <Play className="h-4 w-4" /> Resume
          </DropdownMenuItem>
        )}
        {item.status === "failed" && (
          <DropdownMenuItem onSelect={() => onAction(item.id, "retry")}>
            <RotateCcw className="h-4 w-4" /> Retry
          </DropdownMenuItem>
        )}
        {item.status === "completed" && (
          <DropdownMenuItem>
            <FolderOpen className="h-4 w-4" /> Show in library
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="danger" onSelect={() => onAction(item.id, "cancel")}>
          <Trash2 className="h-4 w-4" /> {item.status === "completed" ? "Remove" : "Cancel"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function StatusBadge({ status }: { status: DownloadStatus }) {
  const meta = statusMeta[status];
  return (
    <Badge size="sm" className={cn("gap-1 border", meta.badge)}>
      {meta.icon}
      {meta.label}
    </Badge>
  );
}

/* ------------------------------------------------------------------ */

const columnHelper = createColumnHelper<DownloadItem>();

/** Recent downloads — TanStack table on desktop, cards on mobile. */
export const DownloadTable = memo(function DownloadTable() {
  const [rows, setRows] = useState<DownloadItem[]>(seed.slice(0, 5));

  const handleAction = useCallback(
    (id: string, action: "pause" | "resume" | "cancel" | "retry") => {
      setRows((prev) =>
        action === "cancel"
          ? prev.filter((r) => r.id !== id)
          : prev.map((r) => {
              if (r.id !== id) return r;
              if (action === "pause") return { ...r, status: "paused" as const, speed: "paused", eta: "—" };
              if (action === "resume") return { ...r, status: "downloading" as const, speed: "9.4 MB/s", eta: "estimating…" };
              return { ...r, status: "downloading" as const, progress: 0, speed: "starting…", eta: "estimating…" };
            })
      );
    },
    []
  );

  const columns = useMemo(
    () => [
      columnHelper.accessor("title", {
        header: "Title",
        cell: (info) => {
          const item = info.row.original;
          return (
            <div className="flex min-w-0 items-center gap-3">
              <span className="h-11 w-8 shrink-0 overflow-hidden rounded-md border border-stroke">
                <PosterArt title={item.title} colors={item.art} showTitle={false} />
              </span>
              <span className="min-w-0">
                <span className="block max-w-[260px] truncate text-[13px] font-medium text-foreground">
                  {item.title}
                </span>
                <span className="mt-0.5 flex items-center gap-1.5">
                  <Badge size="sm" className="border-stroke bg-surface-3 text-[9px] text-muted">
                    {item.quality}
                  </Badge>
                  {item.hdr && (
                    <Badge size="sm" className="border-warning/30 bg-warning/10 text-[9px] text-warning">
                      HDR
                    </Badge>
                  )}
                  <span className="text-[10px] text-muted-2">{item.size}</span>
                </span>
              </span>
            </div>
          );
        },
      }),
      columnHelper.accessor("progress", {
        header: "Progress",
        cell: (info) => {
          const item = info.row.original;
          return (
            <div className="flex w-40 items-center gap-3">
              <Progress
                value={item.progress}
                active={item.status === "downloading"}
                aria-label={`${item.title} progress`}
                indicatorClassName={cn(
                  item.status === "completed" && "from-success to-teal-500",
                  item.status === "failed" && "from-danger to-rose-500"
                )}
              />
              <span className="w-9 text-right text-xs tabular-nums text-muted">
                {item.progress}%
              </span>
            </div>
          );
        },
      }),
      columnHelper.accessor("speed", {
        header: "Speed",
        cell: (info) => (
          <span className="whitespace-nowrap text-xs tabular-nums text-muted">
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor("eta", {
        header: "ETA",
        cell: (info) => {
          const item = info.row.original;
          return (
            <span className="whitespace-nowrap text-xs tabular-nums text-muted">
              {item.status === "completed" ? item.finishedAt : item.eta}
            </span>
          );
        },
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => <StatusBadge status={info.getValue()} />,
      }),
      columnHelper.display({
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: (info) => <RowActions item={info.row.original} onAction={handleAction} />,
      }),
    ],
    [handleAction]
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

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

      {rows.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center">
          <CheckCircle2 className="mb-3 h-8 w-8 text-muted-2" />
          <p className="text-sm text-muted">Queue is empty — start a new download.</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full border-collapse">
              <thead>
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id} className="border-b border-stroke">
                    {hg.headers.map((header) => (
                      <th
                        key={header.id}
                        className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-2 first:pl-0 last:pr-0"
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="group border-b border-stroke/60 transition-colors last:border-0 hover:bg-surface-2/50"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-3 py-3 first:pl-0 last:pr-0">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {rows.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-stroke bg-surface-2/60 p-3.5"
              >
                <div className="flex items-start gap-3">
                  <span className="h-12 w-9 shrink-0 overflow-hidden rounded-md border border-stroke">
                    <PosterArt title={item.title} colors={item.art} showTitle={false} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-foreground">{item.title}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <StatusBadge status={item.status} />
                      <span className="text-[10px] text-muted-2">
                        {item.quality} · {item.size}
                      </span>
                    </div>
                  </div>
                  <RowActions item={item} onAction={handleAction} />
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <Progress value={item.progress} active={item.status === "downloading"} />
                  <span className="text-xs tabular-nums text-muted">{item.progress}%</span>
                </div>
                <p className="mt-1.5 text-[10px] text-muted-2">
                  {item.status === "completed"
                    ? item.finishedAt
                    : `${item.speed} · ${item.eta}`}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
});
