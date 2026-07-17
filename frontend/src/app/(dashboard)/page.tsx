"use client";

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  DownloadCloud,
  Activity,
  HardDrive,
  Film,
  Search,
  Sparkles,
  Link2,
  Loader2,
  ArrowRight,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";
import { StatsCard } from "@/components/dashboard/stats-card";
import { ActivityChart } from "@/components/dashboard/activity-chart";
import { RecentDownloads } from "@/components/dashboard/recent-downloads";
import { DownloadCard } from "@/components/downloads/download-card";
import { ProgressBar } from "@/components/downloads/progress-bar";
import { Badge } from "@/components/ui/badge";
import { useStats, useActivity, useDownloads } from "@/hooks/use-downloads";
import { useDownloadStore } from "@/stores/download-store";
import { formatBytes } from "@/lib/utils";
import type { Download } from "@/types";

// Animation stagger variants
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

// Active downloads sidebar component
function ActiveDownloadsSidebar() {
  const { data, isLoading } = useDownloads({
    status: "downloading",
    pageSize: 5,
  });

  const downloads = data?.data?.items ?? [];
  const activeDownloads = downloads.filter(
    (d: Download) => d.status === "downloading" || d.status === "processing"
  );

  return (
    <div className="glass-card overflow-hidden h-full">
      <div className="px-6 py-4 border-b border-slate-700/30">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-100">
              Active Downloads
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Live progress</p>
          </div>
          {activeDownloads.length > 0 && (
            <Badge variant="blue" size="sm">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-400" />
              </span>
              {activeDownloads.length} active
            </Badge>
          )}
        </div>
      </div>

      <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-4 rounded-xl bg-navy-800/40 space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton variant="circular" className="w-8 h-8" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="w-3/4 h-3.5" />
                  <Skeleton className="w-1/2 h-3" />
                </div>
              </div>
              <Skeleton variant="rectangular" className="h-2 rounded-full" />
            </div>
          ))
        ) : activeDownloads.length === 0 ? (
          <div className="py-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-navy-700/40 flex items-center justify-center mx-auto mb-4">
              <Zap className="h-7 w-7 text-slate-600" />
            </div>
            <p className="text-sm text-slate-400 font-medium">
              No active downloads
            </p>
            <p className="text-xs text-slate-500 mt-1">
              All clear — paste a URL to start
            </p>
          </div>
        ) : (
          activeDownloads.map((download: Download) => (
            <motion.div
              key={download.id}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 rounded-xl bg-navy-800/40 border border-slate-700/20 space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-200 truncate">
                    {download.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={download.platform as "youtube" | "vimeo" | "instagram" | "facebook" | "twitter" | "tiktok"} size="sm">
                      {download.platform}
                    </Badge>
                    {download.fileSize && (
                      <span className="text-[10px] text-slate-500 tabular-nums">
                        {formatBytes(download.fileSize)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <ProgressBar
                progress={download.progress}
                speed={download.speed}
                eta={download.eta}
                status={download.status}
                size="sm"
              />
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [url, setUrl] = useState("");
  const router = useRouter();

  // Fetch dashboard data
  const { data: statsData, isLoading: statsLoading } = useStats();
  const { data: activityData, isLoading: activityLoading } = useActivity(7);

  const stats = statsData?.data;
  const activity = activityData?.data ?? [];

  const handleAnalyze = useCallback(() => {
    if (url.trim()) {
      router.push(`/downloads/new?url=${encodeURIComponent(url.trim())}`);
    }
  }, [url, router]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") handleAnalyze();
    },
    [handleAnalyze]
  );

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Quick download bar */}
      <motion.div variants={itemVariants}>
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-accent-blue to-accent-emerald shadow-lg">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-100">
                Quick Download
              </h2>
              <p className="text-xs text-slate-400">
                Paste any video URL to get started
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="relative flex-1">
              <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Paste YouTube, Vimeo, Instagram, or other video URL..."
                className="w-full h-12 pl-11 pr-4 rounded-xl bg-navy-800/80 border border-slate-600/30 text-slate-200 placeholder-slate-500 transition-all duration-200 focus:border-accent-blue/50 focus:ring-2 focus:ring-accent-blue/20 focus:outline-none hover:border-slate-500/50"
              />
            </div>
            <Button
              size="lg"
              onClick={handleAnalyze}
              disabled={!url.trim()}
              className="px-8 h-12"
            >
              <Search className="h-4 w-4" />
              Analyze
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Stats cards row */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass-card p-6 space-y-4">
              <div className="flex items-start justify-between">
                <Skeleton variant="rectangular" className="w-12 h-12 rounded-xl" />
                <Skeleton className="w-16 h-5 rounded-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="w-20 h-8" />
                <Skeleton className="w-28 h-4" />
              </div>
              <Skeleton className="h-0.5 w-full rounded-full" />
            </div>
          ))
        ) : (
          <>
            <StatsCard
              title="Total Downloads"
              value={stats?.totalDownloads ?? 0}
              icon={DownloadCloud}
              trend="up"
              trendValue="+12%"
              gradient="from-accent-blue to-blue-400"
            />
            <StatsCard
              title="Active Downloads"
              value={stats?.activeDownloads ?? 0}
              icon={Activity}
              trend="neutral"
              gradient="from-accent-purple to-purple-400"
            />
            <StatsCard
              title="Storage Used"
              value={stats?.storageUsed ?? 0}
              icon={HardDrive}
              trend="up"
              trendValue={stats?.storageUsed ? formatBytes(stats.storageUsed) : "0 B"}
              gradient="from-accent-emerald to-emerald-400"
            />
            <StatsCard
              title="Total Media"
              value={(stats?.totalVideos ?? 0) + (stats?.totalAudios ?? 0)}
              icon={Film}
              trend="up"
              trendValue={`${stats?.totalVideos ?? 0}V / ${stats?.totalAudios ?? 0}A`}
              gradient="from-accent-amber to-amber-400"
            />
          </>
        )}
      </motion.div>

      {/* Activity Chart */}
      <motion.div variants={itemVariants}>
        {activityLoading ? (
          <div className="glass-card p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="w-40 h-5" />
                  <Skeleton className="w-20 h-3" />
                </div>
                <Skeleton className="w-28 h-7 rounded-lg" />
              </div>
              <Skeleton variant="rectangular" className="h-[280px] rounded-xl" />
            </div>
          </div>
        ) : (
          <ActivityChart data={activity} />
        )}
      </motion.div>

      {/* Two-column layout: Recent Downloads + Active Downloads */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        {/* Recent Downloads — wider column */}
        <div className="lg:col-span-2">
          <RecentDownloads />
        </div>

        {/* Active Downloads — right sidebar */}
        <div className="lg:col-span-1">
          <ActiveDownloadsSidebar />
        </div>
      </motion.div>
    </motion.div>
  );
}
