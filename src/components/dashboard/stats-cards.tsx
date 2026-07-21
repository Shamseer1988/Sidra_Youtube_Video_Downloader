"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { Clapperboard, DownloadCloud, HardDrive, Loader2, Music, Video, type LucideIcon } from "lucide-react";
import { cn, formatBytes } from "@/lib/utils";
import { useDashboard } from "@/hooks/use-dashboard";
import { useStorageInfo } from "@/hooks/use-system";
import { useAnimatedCounter } from "@/hooks/use-animated-counter";
import { Skeleton } from "@/components/ui/skeleton";

interface Stat {
  id: string;
  label: string;
  value: number;
  display?: string;
  sub: string;
  icon: LucideIcon;
  iconBg: string;
  pulse?: boolean;
}

function StatCard({ stat, index }: { stat: Stat; index: number }) {
  const Icon = stat.icon;
  const animated = useAnimatedCounter(stat.value);

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.06, duration: 0.45, ease: "easeOut" }}
      className="glass-card card-interactive group relative overflow-hidden p-5"
      aria-label={`${stat.label}: ${stat.display ?? stat.value}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg transition-transform duration-300 group-hover:scale-110",
            stat.iconBg
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        {stat.pulse && stat.value > 0 && (
          <span className="flex items-center gap-1 text-[11px] font-medium text-accent">
            <Loader2 className="h-3 w-3 animate-spin" /> live
          </span>
        )}
      </div>
      <p className="mt-4 text-2xl font-bold tabular-nums tracking-tight text-foreground">
        {stat.display ?? animated.toLocaleString()}
      </p>
      <p className="text-[13px] text-muted">{stat.label}</p>
      <p className="mt-0.5 text-[11px] text-muted-2">{stat.sub}</p>
    </motion.article>
  );
}

/** Real KPI cards from /api/stats + /api/system/storage. */
export const StatsCards = memo(function StatsCards() {
  const { data: dash, isLoading } = useDashboard();
  const { data: storage } = useStorageInfo();

  if (isLoading || !dash) {
    return (
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-[150px] rounded-2xl" />
        ))}
      </section>
    );
  }

  const s = dash.stats;
  const stats: Stat[] = [
    { id: "videos", label: "Videos", value: s.totalVideos, sub: "in your libraries", icon: Clapperboard, iconBg: "from-primary to-violet-500" },
    { id: "audio", label: "Music Tracks", value: s.totalAudios, sub: "in your libraries", icon: Music, iconBg: "from-success to-teal-500" },
    { id: "downloads", label: "Total Downloads", value: s.totalDownloads, sub: "all time", icon: DownloadCloud, iconBg: "from-accent to-sky-500" },
    { id: "active", label: "Active Downloads", value: s.activeDownloads, sub: "in progress", icon: Video, iconBg: "from-warning to-orange-500", pulse: true },
    {
      id: "storage",
      label: "Library Size",
      value: s.storageUsed,
      display: formatBytes(s.storageUsed, 1),
      sub: storage ? `${storage.usedPercent}% of ${formatBytes(storage.totalBytes, 0)}` : "on disk",
      icon: HardDrive,
      iconBg: "from-secondary to-indigo-400",
    },
  ];

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
