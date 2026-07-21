"use client";

import { memo } from "react";
import Link from "next/link";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAnalytics } from "@/hooks/use-dashboard";
import { ChartTooltip } from "@/components/charts/chart-tooltip";
import { DonutChart } from "@/components/charts/donut-chart";
import { MediaThumb } from "@/components/media/media-thumb";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

const AXIS_TICK = { fill: "#64748b", fontSize: 11 } as const;
const GRID_STROKE = "rgba(148,163,184,0.08)";

function Panel({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section aria-label={title} className={cn("glass-card p-5", className)}>
      <h3 className="mb-4 text-sm font-semibold text-foreground">{title}</h3>
      {children}
    </section>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-60 flex-col items-center justify-center text-center">
      <BarChart3 className="mb-2 h-7 w-7 text-muted-2" />
      <p className="text-sm text-muted">{label}</p>
    </div>
  );
}

/** Compact analytics summary for the analytics page header. */
export const AnalyticsOverview = memo(function AnalyticsOverview() {
  const { data, isLoading } = useAnalytics();

  if (isLoading || !data) {
    return (
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </section>
    );
  }

  const tiles = [
    { label: "Library Items", value: data.totals.libraryItems.toLocaleString() },
    { label: "Downloads This Week", value: data.totals.weekDownloads.toLocaleString() },
    { label: "Completed Downloads", value: data.totals.completedDownloads.toLocaleString() },
  ];

  return (
    <section aria-label="Analytics summary" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {tiles.map((t) => (
        <div key={t.label} className="glass-card card-interactive p-5">
          <p className="text-xs font-medium text-muted-2">{t.label}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{t.value}</p>
        </div>
      ))}
    </section>
  );
});

/** Full analytics chart grid — all real data. */
export const AnalyticsCharts = memo(function AnalyticsCharts() {
  const { data, isLoading } = useAnalytics();

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-72 rounded-2xl" />
        ))}
      </div>
    );
  }

  const hasDownloads = data.downloadsPerDay.some((d) => d.downloads > 0);
  const hasSources = data.sources.length > 0;
  const hasCategories = data.categories.length > 0;
  const hasGrowth = data.storageGrowth.some((m) => m.gb > 0);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Panel title="Downloads per Day">
        {hasDownloads ? (
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.downloadsPerDay} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
                <defs>
                  <linearGradient id="dl-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={GRID_STROKE} vertical={false} />
                <XAxis dataKey="day" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="downloads" name="Started" stroke="#7c3aed" strokeWidth={2} fill="url(#dl-grad)" />
                <Area type="monotone" dataKey="completed" name="Completed" stroke="#3b82f6" strokeWidth={2} fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyChart label="No downloads in the last 7 days" />
        )}
      </Panel>

      <Panel title="Storage Growth">
        {hasGrowth ? (
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.storageGrowth} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
                <defs>
                  <linearGradient id="sg-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={GRID_STROKE} vertical={false} />
                <XAxis dataKey="month" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} unit=" GB" />
                <Tooltip content={<ChartTooltip unit=" GB" />} />
                <Area type="monotone" dataKey="gb" name="Library size" stroke="#3b82f6" strokeWidth={2} fill="url(#sg-grad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyChart label="Not enough history yet" />
        )}
      </Panel>

      <Panel title="Media Categories">
        {hasCategories ? (
          <div className="flex items-center gap-6">
            <DonutChart
              data={data.categories.map((c) => ({ name: c.name, value: c.value, color: c.color }))}
              size={170}
              centerValue={String(data.categories.reduce((s, c) => s + c.value, 0))}
              centerLabel="items"
            />
            <ul className="flex-1 space-y-2.5">
              {data.categories.map((c) => (
                <li key={c.name} className="flex items-center gap-2.5 text-[13px]">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
                  <span className="capitalize text-muted">{c.name}</span>
                  <span className="ml-auto font-semibold tabular-nums text-foreground">{c.value}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <EmptyChart label="No media indexed yet" />
        )}
      </Panel>

      <Panel title="Top Download Sources">
        {hasSources ? (
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.sources} layout="vertical" margin={{ top: 4, right: 12, bottom: 0, left: 8 }}>
                <CartesianGrid stroke={GRID_STROKE} horizontal={false} />
                <XAxis type="number" tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ ...AXIS_TICK, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={82} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                <Bar dataKey="value" name="Downloads" radius={[0, 6, 6, 0]} maxBarSize={18}>
                  {data.sources.map((s) => (
                    <Cell key={s.name} fill={s.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyChart label="No downloads yet" />
        )}
      </Panel>

      <Panel title="Recently Watched" className="lg:col-span-2">
        {data.recentlyWatched.length > 0 ? (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {data.recentlyWatched.map((m) => (
              <li key={m.id} className="flex items-center gap-3">
                <Link href={`/watch/${m.id}`} className="h-11 w-16 shrink-0 overflow-hidden rounded-lg border border-stroke">
                  <MediaThumb id={m.id} title={m.title} type={m.type as "video" | "audio"} hasThumbnail={!!m.thumbnail} />
                </Link>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-foreground">{m.title}</p>
                  <Progress value={m.progress} className="mt-1.5 h-1" />
                </div>
                <span className="text-xs tabular-nums text-muted">{m.progress}%</span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyChart label="Nothing watched yet" />
        )}
      </Panel>
    </div>
  );
});
