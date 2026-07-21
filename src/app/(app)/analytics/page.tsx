"use client";

import dynamic from "next/dynamic";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";

const AnalyticsOverview = dynamic(
  () => import("@/components/dashboard/analytics").then((m) => m.AnalyticsOverview),
  { loading: () => <Skeleton className="h-[110px] rounded-2xl" /> }
);
const AnalyticsCharts = dynamic(
  () => import("@/components/dashboard/analytics").then((m) => m.AnalyticsCharts),
  { loading: () => <Skeleton className="h-[600px] rounded-2xl" /> }
);
const SystemHealth = dynamic(
  () => import("@/components/dashboard/system-health").then((m) => m.SystemHealth),
  { loading: () => <Skeleton className="h-[260px] rounded-2xl" /> }
);

export default function AnalyticsPage() {
  return (
    <div className="mx-auto max-w-[1600px] space-y-5">
      <PageHeader
        title="Analytics"
        subtitle="Downloads, storage and watch activity across your media server"
      />
      <AnalyticsOverview />
      <AnalyticsCharts />
      <SystemHealth />
    </div>
  );
}
