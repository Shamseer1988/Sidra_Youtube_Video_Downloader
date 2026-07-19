"use client";

import { memo } from "react";
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
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  analyticsSummary,
  bandwidthUsage,
  downloadsPerDay,
  mediaCategories,
  mostWatched,
  storageGrowth,
  topSources,
} from "@/lib/mock-data";
import { Sparkline } from "@/components/charts/sparkline";
import { ChartTooltip } from "@/components/charts/chart-tooltip";
import { DonutChart } from "@/components/charts/donut-chart";
import { PosterArt } from "@/components/media/poster-art";
import { Progress } from "@/components/ui/progress";

const AXIS_TICK = { fill: "#64748b", fontSize: 11 } as const;
const GRID_STROKE = "rgba(148,163,184,0.08)";

/* ------------------------------------------------------------------ */
/*  Compact overview (dashboard bottom-left)                           */
/* ------------------------------------------------------------------ */

export const AnalyticsOverview = memo(function AnalyticsOverview({
  compact = false,
}: {
  /** 2-up tile layout that height-matches a neighbouring card (dashboard) */
  compact?: boolean;
}) {
  const topCategory = mediaCategories[0];

  return (
    <section aria-label="Analytics overview" className="glass-card flex h-full flex-col p-5">
      <h2 className="mb-4 text-base font-semibold text-foreground">Analytics Overview</h2>

      <div
        className={cn(
          "grid flex-1 auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2",
          !compact && "xl:grid-cols-4"
        )}
      >
        {analyticsSummary.map((kpi) => {
          const up = kpi.delta >= 0;
          return (
            <div
              key={kpi.label}
              className="card-interactive rounded-2xl border border-stroke bg-surface-2/60 p-4"
            >
              <p className="text-[11px] font-medium text-muted-2">{kpi.label}</p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-xl font-bold tabular-nums text-foreground">{kpi.value}</span>
                <span
                  className={cn(
                    "flex items-center gap-0.5 text-[11px] font-semibold",
                    up ? "text-success" : "text-danger"
                  )}
                >
                  {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {Math.abs(kpi.delta)}%
                </span>
              </div>
              <div className="mt-2">
                <Sparkline data={kpi.series} color={kpi.color} height={38} />
              </div>
            </div>
          );
        })}

        {/* Most downloaded category */}
        <div className="card-interactive rounded-2xl border border-stroke bg-surface-2/60 p-4">
          <p className="text-[11px] font-medium text-muted-2">Most Downloaded Category</p>
          <div className="mt-1 flex items-center justify-between gap-3">
            <div>
              <p className="text-xl font-bold text-foreground">{topCategory.name}</p>
              <p className="text-[11px] text-muted-2">{topCategory.value}% of downloads</p>
            </div>
            <DonutChart
              data={mediaCategories}
              size={64}
              unit="%"
            />
          </div>
        </div>
      </div>
    </section>
  );
});

/* ------------------------------------------------------------------ */
/*  Full chart grid (analytics page)                                   */
/* ------------------------------------------------------------------ */

function Panel({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section aria-label={title} className={cn("glass-card p-5", className)}>
      <h3 className="mb-4 text-sm font-semibold text-foreground">{title}</h3>
      {children}
    </section>
  );
}

export const AnalyticsCharts = memo(function AnalyticsCharts() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Panel title="Downloads per Day">
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={downloadsPerDay} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
              <defs>
                <linearGradient id="dl-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="dl-grad-2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={GRID_STROKE} vertical={false} />
              <XAxis dataKey="day" tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="downloads" name="Started" stroke="#7c3aed" strokeWidth={2} fill="url(#dl-grad)" />
              <Area type="monotone" dataKey="completed" name="Completed" stroke="#3b82f6" strokeWidth={2} fill="url(#dl-grad-2)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel title="Storage Growth">
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={storageGrowth} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
              <defs>
                <linearGradient id="sg-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={GRID_STROKE} vertical={false} />
              <XAxis dataKey="month" tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} unit=" TB" domain={[4, 8]} />
              <Tooltip content={<ChartTooltip unit=" TB" />} />
              <Area type="monotone" dataKey="tb" name="Library size" stroke="#3b82f6" strokeWidth={2} fill="url(#sg-grad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel title="Bandwidth Usage (24h)">
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bandwidthUsage} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
              <CartesianGrid stroke={GRID_STROKE} vertical={false} />
              <XAxis dataKey="hour" tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} unit=" Gb" />
              <Tooltip content={<ChartTooltip unit=" Gbps" />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
              <Bar dataKey="gbps" name="Throughput" radius={[6, 6, 0, 0]} fill="#10b981" maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel title="Top Download Sources">
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={topSources}
              layout="vertical"
              margin={{ top: 4, right: 12, bottom: 0, left: 8 }}
            >
              <CartesianGrid stroke={GRID_STROKE} horizontal={false} />
              <XAxis type="number" tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ ...AXIS_TICK, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
                width={82}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
              <Bar dataKey="value" name="Downloads" radius={[0, 6, 6, 0]} maxBarSize={18}>
                {topSources.map((s) => (
                  <Cell key={s.name} fill={s.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel title="Media Categories">
        <div className="flex items-center gap-6">
          <DonutChart data={mediaCategories} size={170} unit="%" centerValue={`${mediaCategories[0].value}%`} centerLabel={mediaCategories[0].name} />
          <ul className="flex-1 space-y-2.5">
            {mediaCategories.map((c) => (
              <li key={c.name} className="flex items-center gap-2.5 text-[13px]">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
                <span className="text-muted">{c.name}</span>
                <span className="ml-auto font-semibold tabular-nums text-foreground">{c.value}%</span>
              </li>
            ))}
          </ul>
        </div>
      </Panel>

      <Panel title="Most Watched">
        <ul className="space-y-3.5">
          {mostWatched.map((m, i) => (
            <li key={m.title} className="flex items-center gap-3">
              <span className="w-4 text-xs font-bold tabular-nums text-muted-2">{i + 1}</span>
              <span className="h-10 w-7 shrink-0 overflow-hidden rounded-md border border-stroke">
                <PosterArt title={m.title} colors={m.art} showTitle={false} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-foreground">{m.title}</p>
                <Progress
                  value={(m.plays / mostWatched[0].plays) * 100}
                  className="mt-1.5 h-1"
                  aria-label={`${m.title} plays`}
                />
              </div>
              <span className="text-xs tabular-nums text-muted">{m.plays} plays</span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
});
