"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { cn, formatBytes } from "@/lib/utils";
import {
  formatRate,
  formatUptime,
  useSystemHealth,
} from "@/hooks/use-system";
import { Sparkline } from "@/components/charts/sparkline";
import { Skeleton } from "@/components/ui/skeleton";

interface MetricCardProps {
  label: string;
  value: string;
  sub: string;
  series: number[];
  color: string;
  status?: "good" | "warn" | "crit";
  index: number;
}

const statusDot = {
  good: "bg-success",
  warn: "bg-warning",
  crit: "bg-danger",
} as const;

function MetricCard({ label, value, sub, series, color, status = "good", index }: MetricCardProps) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      aria-label={`${label}: ${value}`}
      className="card-interactive rounded-2xl border border-stroke bg-surface-2/60 p-4"
    >
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium text-muted-2">{label}</p>
        <span className={cn("h-1.5 w-1.5 rounded-full", statusDot[status])} />
      </div>
      <p className="mt-1 text-lg font-bold tabular-nums text-foreground">{value}</p>
      <p className="truncate text-[10px] text-muted-2">{sub}</p>
      <div className="mt-2 h-[30px]">
        {series.length > 1 ? (
          <Sparkline data={series} color={color} height={30} fill={false} />
        ) : (
          <div className="h-full rounded bg-surface-3/40" />
        )}
      </div>
    </motion.article>
  );
}

/**
 * Live host/NAS health — CPU, RAM, network, temperature and uptime read
 * from the kernel (/proc, /sys) via /api/system/health.
 */
export const SystemHealth = memo(function SystemHealth() {
  const { data, series, isLoading, isError } = useSystemHealth();

  const healthy =
    !isError &&
    (data?.cpu.percent === null || (data?.cpu.percent ?? 0) < 90) &&
    (data?.memory?.usedPercent ?? 0) < 92 &&
    (data?.temperatureC === null || (data?.temperatureC ?? 0) < 75);

  const metrics: Omit<MetricCardProps, "index">[] = data
    ? [
        {
          label: "CPU",
          value: data.cpu.percent === null ? "…" : `${data.cpu.percent}%`,
          sub: `${data.cpu.cores} cores · load ${data.cpu.load1}`,
          series: series.cpu,
          color: "#7c3aed",
          status: (data.cpu.percent ?? 0) > 90 ? "crit" : (data.cpu.percent ?? 0) > 70 ? "warn" : "good",
        },
        {
          label: "RAM",
          value: data.memory ? `${data.memory.usedPercent}%` : "—",
          sub: data.memory
            ? `${formatBytes(data.memory.usedBytes, 1)} / ${formatBytes(data.memory.totalBytes, 1)}`
            : "unavailable",
          series: series.memory,
          color: "#3b82f6",
          status: (data.memory?.usedPercent ?? 0) > 92 ? "crit" : (data.memory?.usedPercent ?? 0) > 80 ? "warn" : "good",
        },
        {
          label: "Network ↓",
          value: formatRate(data.network.rxPerSec),
          sub: "download throughput",
          series: series.rx,
          color: "#10b981",
        },
        {
          label: "Network ↑",
          value: formatRate(data.network.txPerSec),
          sub: "upload throughput",
          series: series.tx,
          color: "#0ea5e9",
        },
        ...(data.temperatureC !== null
          ? [
              {
                label: "NAS Temp",
                value: `${Math.round(data.temperatureC)}°C`,
                sub:
                  data.temperatureC < 60 ? "Good" : data.temperatureC < 75 ? "Elevated" : "Hot",
                series: series.temp,
                color: "#f59e0b",
                status: (data.temperatureC < 60
                  ? "good"
                  : data.temperatureC < 75
                    ? "warn"
                    : "crit") as MetricCardProps["status"],
              },
            ]
          : []),
        {
          label: "Uptime",
          value: formatUptime(data.uptimeSec),
          sub: data.hostname,
          series: [],
          color: "#6366f1",
        },
      ]
    : [];

  return (
    <section aria-label="System health" className="glass-card h-full p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">System Health</h2>
        <span
          className={cn(
            "flex items-center gap-1.5 text-[11px] font-medium",
            isError ? "text-muted-2" : healthy ? "text-success" : "text-warning"
          )}
        >
          <span className="relative flex h-2 w-2">
            {!isError && (
              <span
                className={cn(
                  "absolute h-full w-full animate-ping rounded-full opacity-60",
                  healthy ? "bg-success" : "bg-warning"
                )}
              />
            )}
            <span
              className={cn(
                "relative h-2 w-2 rounded-full",
                isError ? "bg-muted-2" : healthy ? "bg-success" : "bg-warning"
              )}
            />
          </span>
          {isError ? "Unavailable" : healthy ? "Healthy" : "Attention"}
        </span>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[118px] rounded-2xl" />
          ))}
        </div>
      ) : isError ? (
        <p className="rounded-2xl border border-stroke bg-surface-2/60 p-6 text-center text-sm text-muted">
          System metrics are unavailable in this environment.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {metrics.map((m, i) => (
            <MetricCard key={m.label} {...m} index={i} />
          ))}
        </div>
      )}
    </section>
  );
});
