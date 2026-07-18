"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  DownloadCloud, Film, Music, HardDrive, Link2, ArrowRight, PlayCircle, Activity,
} from "lucide-react";
import { HeroBanner } from "@/components/media/hero-banner";
import { MediaSection } from "@/components/media/media-section";
import { ActivityChart } from "@/components/dashboard/activity-chart";
import { apiGet } from "@/lib/client-api";
import { formatBytes } from "@/lib/utils";
import { useUser } from "@/components/providers/user-provider";
import type { DashboardData } from "@/lib/types";

export default function DashboardPage() {
  const router = useRouter();
  const user = useUser();
  const [url, setUrl] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["stats"],
    queryFn: () => apiGet<DashboardData>("/api/stats"),
    refetchInterval: 15000,
  });

  function go() {
    router.push(url.trim() ? `/downloads?url=${encodeURIComponent(url.trim())}` : "/downloads");
  }

  const stats = data?.stats;
  const heroItem =
    data?.continueWatching?.[0] ?? data?.recentDownloaded?.[0] ?? data?.recentUploaded?.[0];
  const heroLabel = data?.continueWatching?.length
    ? "Continue Watching"
    : data?.recentDownloaded?.length
      ? "Latest Download"
      : "From Your Library";

  return (
    <div className="space-y-7 max-w-[1600px] mx-auto">
      {/* Hero */}
      {isLoading ? (
        <div className="rounded-2xl min-h-[300px] sm:min-h-[380px] lg:min-h-[440px] shimmer" />
      ) : heroItem ? (
        <HeroBanner item={heroItem} label={heroLabel} />
      ) : (
        <div className="relative rounded-2xl overflow-hidden border border-slate-700/20 min-h-[300px] flex flex-col items-center justify-center text-center p-8 bg-gradient-to-br from-navy-800 via-navy-900 to-navy-800">
          <PlayCircle className="h-12 w-12 text-slate-600 mb-4" />
          <h1 className="text-xl font-bold text-slate-100">
            Welcome, <span className="gradient-text">{user.username}</span>
          </h1>
          <p className="text-sm text-slate-400 mt-2 max-w-md">
            Your library is empty. Paste a link below to download something, or add your
            NAS media folders in Settings and run a scan.
          </p>
        </div>
      )}

      {/* Quick download bar */}
      {user.canDownload && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <div className="relative flex-1">
            <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && go()}
              placeholder="Paste a video or music URL to download…"
              className="w-full h-12 pl-11 pr-4 rounded-xl bg-navy-800/90 border border-slate-600/30 text-[15px] text-slate-200 placeholder-slate-500 focus:border-accent-blue/60 focus:ring-2 focus:ring-accent-blue/20"
            />
          </div>
          <button
            onClick={go}
            className="flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-gradient-to-r from-accent-blue to-accent-purple text-white text-sm font-semibold shadow-lg shadow-accent-blue/20 hover:opacity-95 active:scale-[0.99] transition-all"
          >
            <DownloadCloud className="h-4 w-4" /> Download <ArrowRight className="h-4 w-4" />
          </button>
        </motion.div>
      )}

      {/* Rows */}
      {!isLoading && data && (
        <>
          {data.continueWatching.length > 1 && (
            <MediaSection title="Continue Watching" items={data.continueWatching} />
          )}
          <MediaSection title="Recently Downloaded" items={data.recentDownloaded} href="/downloads" />
          <MediaSection title="New in Your Library" items={data.recentUploaded} href="/videos" />
        </>
      )}

      {/* Stats strip */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatChip icon={Film} label="Videos" value={String(stats.totalVideos)} tone="text-accent-blue" />
          <StatChip icon={Music} label="Audio tracks" value={String(stats.totalAudios)} tone="text-accent-emerald" />
          <StatChip
            icon={Activity}
            label="My downloads"
            value={`${stats.totalDownloads}${stats.activeDownloads ? ` · ${stats.activeDownloads} active` : ""}`}
            tone="text-accent-purple"
          />
          <StatChip icon={HardDrive} label="Library size" value={formatBytes(stats.storageUsed)} tone="text-accent-amber" />
        </div>
      )}

      {/* Activity chart */}
      {!isLoading && data?.activity?.some((d) => d.videos + d.audios > 0) && (
        <ActivityChart data={data.activity} />
      )}
    </div>
  );
}

function StatChip({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: any;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="glass-card px-4 py-3.5 flex items-center gap-3">
      <Icon className={`h-5 w-5 flex-shrink-0 ${tone}`} />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-100 truncate tabular-nums">{value}</p>
        <p className="text-[11px] text-slate-500">{label}</p>
      </div>
    </div>
  );
}
