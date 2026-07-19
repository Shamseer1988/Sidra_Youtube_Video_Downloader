"use client";

import { memo } from "react";
import Link from "next/link";
import { DonutChart } from "@/components/charts/donut-chart";
import { storageBreakdown, storageTotals } from "@/lib/mock-data";

function formatTb(tb: number) {
  return tb >= 1 ? `${tb.toFixed(1)} TB` : `${Math.round(tb * 1000)} GB`;
}

/** Storage overview — animated donut + per-category legend. */
export const StorageChart = memo(function StorageChart() {
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

      <div className="flex flex-1 flex-col items-center gap-2 sm:flex-row sm:gap-6">
        <DonutChart
          data={storageBreakdown}
          centerValue={`${storageTotals.usedPercent}%`}
          centerLabel="Used"
          unit=" TB"
        />

        <ul className="w-full flex-1 space-y-2.5">
          {storageBreakdown.map((row) => (
            <li key={row.name} className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: row.color }} />
              <span className="text-[13px] text-muted">{row.name}</span>
              <span className="ml-auto text-[13px] font-semibold tabular-nums text-foreground">
                {formatTb(row.value)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-stroke pt-3 text-xs">
        <span className="text-muted">
          <span className="font-semibold text-foreground">{storageTotals.usedTb} TB</span> of{" "}
          {storageTotals.capacityTb} TB used
        </span>
        <span className="font-medium text-accent">{storageTotals.freeTb} TB free</span>
      </div>
    </section>
  );
});
