"use client";

import dynamic from "next/dynamic";
import { useUser } from "@/components/providers/user-provider";
import { Hero } from "@/components/dashboard/hero";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { ContinueWatching } from "@/components/dashboard/continue-watching";
import { Skeleton } from "@/components/ui/skeleton";

const DownloadTable = dynamic(
  () => import("@/components/dashboard/download-table").then((m) => m.DownloadTable),
  { loading: () => <Skeleton className="h-[360px] rounded-2xl" /> }
);
const StorageChart = dynamic(
  () => import("@/components/dashboard/storage-chart").then((m) => m.StorageChart),
  { loading: () => <Skeleton className="h-[360px] rounded-2xl" /> }
);
const LibrariesOverview = dynamic(
  () => import("@/components/dashboard/libraries-overview").then((m) => m.LibrariesOverview),
  { loading: () => <Skeleton className="h-[200px] rounded-2xl" /> }
);
const SystemHealth = dynamic(
  () => import("@/components/dashboard/system-health").then((m) => m.SystemHealth),
  { loading: () => <Skeleton className="h-[240px] rounded-2xl" /> }
);
const FloatingDownloads = dynamic(
  () => import("@/components/dashboard/floating-downloads").then((m) => m.FloatingDownloads),
  { ssr: false }
);

export default function HomePage() {
  const user = useUser();

  return (
    <div className="mx-auto max-w-[1600px] space-y-4 sm:space-y-5">
      <Hero username={user.username} />
      <StatsCards />

      <ContinueWatching />

      <div className="grid grid-cols-1 gap-4 sm:gap-5 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <DownloadTable />
        </div>
        <QuickActions />
      </div>

      <LibrariesOverview />

      <div className="grid grid-cols-1 gap-4 sm:gap-5 xl:grid-cols-3">
        <StorageChart />
        <div className="xl:col-span-2">
          <SystemHealth />
        </div>
      </div>

      <FloatingDownloads />
    </div>
  );
}
