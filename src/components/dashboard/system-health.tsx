"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { systemMetrics, type SystemMetric } from "@/lib/mock-data";
import { Sparkline } from "@/components/charts/sparkline";

const statusDot: Record<SystemMetric["status"], string> = {
  good: "bg-success",
  warn: "bg-warning",
  crit: "bg-danger",
};

function MetricCard({ metric, index }: { metric: SystemMetric; index: number }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      aria-label={`${metric.label}: ${metric.value}`}
      className="card-interactive rounded-2xl border border-stroke bg-surface-2/60 p-4"
    >
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium text-muted-2">{metric.label}</p>
        <span className={cn("h-1.5 w-1.5 rounded-full", statusDot[metric.status])} />
      </div>
      <p className="mt-1 text-lg font-bold tabular-nums text-foreground">{metric.value}</p>
      <p className="truncate text-[10px] text-muted-2">{metric.sub}</p>
      <div className="mt-2">
        <Sparkline data={metric.series} color={metric.color} height={30} fill={false} />
      </div>
    </motion.article>
  );
}

/** System health grid — CPU / RAM / GPU / Docker / NAS / IO / network. */
export const SystemHealth = memo(function SystemHealth() {
  return (
    <section aria-label="System health" className="glass-card h-full p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">System Health</h2>
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-success">
          <span className="relative flex h-2 w-2">
            <span className="absolute h-full w-full animate-ping rounded-full bg-success opacity-60" />
            <span className="relative h-2 w-2 rounded-full bg-success" />
          </span>
          Healthy
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {systemMetrics.map((metric, i) => (
          <MetricCard key={metric.id} metric={metric} index={i} />
        ))}
      </div>
    </section>
  );
});
