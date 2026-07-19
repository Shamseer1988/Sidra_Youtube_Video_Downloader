"use client";

import { memo } from "react";
import Link from "next/link";
import { formatBytes } from "@/lib/utils";
import { useStorageInfo } from "@/hooks/use-system";
import { DonutChart } from "@/components/charts/donut-chart";
import { Skeleton } from "@/components/ui/skeleton";

/** Storage overview — real NAS volume usage (statfs) + library breakdown. */
export const StorageChart = memo(function StorageChart() {
  const { data, isLoading } = useStorageInfo();

  const video = data?.library.videoBytes ?? 0;
  const audio = data?.library.audioBytes ?? 0;
  const otherUsed = Math.max(0, (data?.usedBytes ?? 0) - video - audio);

  const donutData = data
    ? [
        { name: "Videos", value: +(video / 1e9).toFixed(1), color: "#7c3aed" },
        { name: "Music", value: +(audio / 1e9).toFixed(1), color: "#10b981" },
        { name: "Other data", value: +(otherUsed / 1e9).toFixed(1), color: "#f59e0b" },
        { name: "Free", value: +((data.freeBytes ?? 0) / 1e9).toFixed(1), color: "#1e2230" },
      ].filter((d) => d.value > 0)
    : [];

  const legend = data
    ? [
        { name: "Videos", bytes: video, color: "#7c3aed" },
        { name: "Music", bytes: audio, color: "#10b981" },
        { name: "Other data", bytes: otherUsed, color: "#f59e0b" },
        { name: "Free", bytes: data.freeBytes, color: "#64748b" },
      ]
    : [];

  return (
    <section aria-label="Storage overview" className="glass-card flex h-full flex-col p-5">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">Storage Overview</h2>
        <Link
          href="/nas"
          className="rounded-lg border border-stroke px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-primary/40 hover:text-foreground"
        >
          View Details
        </Link>
      </div>

      {isLoading || !data ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 py-6">
          <Skeleton variant="circular" className="h-[170px] w-[170px]" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ) : (
        <>
          <div className="flex flex-1 flex-col items-center gap-2 sm:flex-row sm:gap-6">
            <DonutChart
              data={donutData}
              centerValue={`${data.usedPercent}%`}
              centerLabel="Used"
              unit=" GB"
            />

            <ul className="w-full flex-1 space-y-2.5">
              {legend.map((row) => (
                <li key={row.name} className="flex items-center gap-2.5">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: row.color }}
                  />
                  <span className="text-[13px] text-muted">{row.name}</span>
                  <span className="ml-auto text-[13px] font-semibold tabular-nums text-foreground">
                    {formatBytes(row.bytes, 1)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-stroke pt-3 text-xs">
            <span className="text-muted">
              <span className="font-semibold text-foreground">
                {formatBytes(data.usedBytes, 1)}
              </span>{" "}
              of {formatBytes(data.totalBytes, 1)} used · {data.nasName}
            </span>
            <span className="font-medium text-accent">{formatBytes(data.freeBytes, 1)} free</span>
          </div>
        </>
      )}
    </section>
  );
});
