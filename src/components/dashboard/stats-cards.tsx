"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowUpRight,
  Clapperboard,
  DownloadCloud,
  HardDrive,
  Music,
  Tv,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { stats, type StatCardData } from "@/lib/mock-data";
import { useAnimatedCounter } from "@/hooks/use-animated-counter";
import { Sparkline } from "@/components/charts/sparkline";

const iconByStat: Record<string, LucideIcon> = {
  movies: Clapperboard,
  tv: Tv,
  music: Music,
  downloads: DownloadCloud,
  storage: HardDrive,
};

const colorStyles: Record<
  StatCardData["color"],
  { iconBg: string; spark: string; glow: string }
> = {
  purple: { iconBg: "from-primary to-violet-500", spark: "#7c3aed", glow: "hover:shadow-primary/20" },
  blue: { iconBg: "from-accent to-sky-500", spark: "#3b82f6", glow: "hover:shadow-accent/20" },
  emerald: { iconBg: "from-success to-teal-500", spark: "#10b981", glow: "hover:shadow-success/20" },
  amber: { iconBg: "from-warning to-orange-500", spark: "#f59e0b", glow: "hover:shadow-warning/20" },
  indigo: { iconBg: "from-secondary to-indigo-400", spark: "#6366f1", glow: "hover:shadow-secondary/20" },
};

function StatCard({ stat, index }: { stat: StatCardData; index: number }) {
  const Icon = iconByStat[stat.id];
  const styles = colorStyles[stat.color];
  const animated = useAnimatedCounter(stat.value);
  const up = stat.delta >= 0;

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.06, duration: 0.45, ease: "easeOut" }}
      className={cn(
        "glass-card card-interactive group relative overflow-hidden p-5",
        "hover:shadow-2xl",
        styles.glow
      )}
      aria-label={`${stat.label}: ${stat.value}${stat.suffix ?? ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg transition-transform duration-300 group-hover:scale-110",
            styles.iconBg
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <span
          className={cn(
            "flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold",
            up ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
          )}
        >
          {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {Math.abs(stat.delta)}
        </span>
      </div>

      <p className="mt-4 text-2xl font-bold tabular-nums tracking-tight text-foreground">
        {animated.toLocaleString()}
        {stat.suffix}
      </p>
      <p className="text-[13px] text-muted">
        {stat.label} <span className="text-muted-2">· {stat.deltaLabel}</span>
      </p>

      <div className="mt-3 -mb-1">
        <Sparkline data={stat.spark} color={styles.spark} height={36} />
      </div>
    </motion.article>
  );
}

/** Row of five KPI stat cards with animated counters + sparklines. */
export const StatsCards = memo(function StatsCards() {
  return (
    <section
      aria-label="Library statistics"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
    >
      {stats.map((stat, i) => (
        <StatCard key={stat.id} stat={stat} index={i} />
      ))}
    </section>
  );
});
