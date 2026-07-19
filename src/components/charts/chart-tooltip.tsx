"use client";

import type { TooltipProps } from "recharts";

/** Shared glass tooltip for every Recharts chart. */
export function ChartTooltip({
  active,
  payload,
  label,
  unit = "",
}: TooltipProps<number, string> & { unit?: string }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-stroke bg-surface-2/95 px-3 py-2 shadow-xl shadow-black/40 backdrop-blur-xl">
      {label !== undefined && (
        <p className="mb-1 text-[11px] font-medium text-muted-2">{label}</p>
      )}
      <div className="space-y-1">
        {payload.map((entry) => (
          <div key={String(entry.dataKey ?? entry.name)} className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: entry.color ?? (entry.payload as { color?: string })?.color }}
            />
            <span className="text-xs capitalize text-muted">{entry.name}</span>
            <span className="ml-auto pl-3 text-xs font-semibold text-foreground">
              {typeof entry.value === "number" ? entry.value.toLocaleString() : entry.value}
              {unit}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
