"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  DownloadCloud, Film, Music, HardDrive, Link2, ArrowRight, Loader2, PlayCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/stat-card";
import { ActivityChart } from "@/components/dashboard/activity-chart";
import { MediaSection } from "@/components/media/media-section";
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
    const dest = url.trim()
      ? `/downloads?url=${encodeURIComponent(url.trim())}`
      : "/downloads";
    router.push(dest);
  }

  const stats = data?.stats;

  return (
    <div className="space-y-6">
      {/* Greeting + quick add */}
      <div className="glass-card p-6">
        <h1 className="text-xl font-bold text-slate-100">
          Welcome back, <span className="gradient-text">{user.username}</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Grab something new or jump back into your library.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <div className="relative flex-1">
            <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && go()}
              placeholder="Paste a video or audio URL to download…"
              className="w-full h-12 pl-11 pr-4 rounded-xl bg-navy-800/80 border border-slate-600/30 text-slate-200 placeholder-slate-500 focus:border-accent-blue/50 focus:outline-none"
            />
          </div>
          <Button size="lg" onClick={go} className="px-6">
            <DownloadCloud className="h-4 w-4" /> Download <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading || !stats ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass-card p-5 h-[132px] shimmer" />
          ))
        ) : (
          <>
            <StatCard title="Videos" value={stats.totalVideos} icon={Film} gradient="from-accent-blue to-blue-400" />
            <StatCard title="Audio tracks" value={stats.totalAudios} icon={Music} gradient="from-accent-emerald to-emerald-400" />
            <StatCard title="My downloads" value={stats.totalDownloads} sub={`${stats.activeDownloads} active`} icon={DownloadCloud} gradient="from-accent-purple to-purple-400" />
            <StatCard title="Library size" value={formatBytes(stats.storageUsed)} icon={HardDrive} gradient="from-accent-amber to-amber-400" />
          </>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-accent-blue" />
        </div>
      ) : (
        <>
          {data?.continueWatching?.length ? (
            <MediaSection title="Continue Watching" items={data.continueWatching} />
          ) : null}

          {data?.activity?.length ? <ActivityChart data={data.activity} /> : null}

          <MediaSection title="Recently Downloaded" items={data?.recentDownloaded ?? []} href="/downloads" />
          <MediaSection title="Recently Added to Library" items={data?.recentUploaded ?? []} href="/videos" />

          {!data?.recentDownloaded?.length &&
            !data?.recentUploaded?.length &&
            !data?.continueWatching?.length && (
              <div className="glass-card py-16 flex flex-col items-center text-center">
                <PlayCircle className="h-10 w-10 text-slate-600 mb-3" />
                <p className="text-sm text-slate-400">
                  Your library is empty. Download something, or point the app at your NAS
                  media folders and run a scan from the Videos page.
                </p>
              </div>
            )}
        </>
      )}
    </div>
  );
}
