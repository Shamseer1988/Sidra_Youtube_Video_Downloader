"use client";

import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  type TooltipProps,
} from "recharts";

interface ActivityData {
  date: string;
  downloads: number;
}

interface ActivityChartProps {
  data: ActivityData[];
}

function CustomTooltip({
  active,
  payload,
  label,
}: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="glass-card px-4 py-3 shadow-xl border border-slate-600/30">
      <p className="text-xs text-slate-400 font-medium mb-1">{label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <p className="text-sm font-semibold text-slate-100">
            {entry.value}{" "}
            <span className="text-slate-400 font-normal">downloads</span>
          </p>
        </div>
      ))}
    </div>
  );
}

function CustomDot(props: {
  cx?: number;
  cy?: number;
  payload?: ActivityData;
  index?: number;
  dataLength?: number;
}) {
  const { cx, cy, index, dataLength } = props;
  if (cx === undefined || cy === undefined) return null;

  // Only show dot on the last data point
  if (index !== (dataLength ?? 0) - 1) return null;

  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={6}
        fill="#3b82f6"
        stroke="#0f172a"
        strokeWidth={3}
      />
      <circle cx={cx} cy={cy} r={10} fill="#3b82f6" opacity={0.2}>
        <animate
          attributeName="r"
          values="8;14;8"
          dur="2s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          values="0.3;0;0.3"
          dur="2s"
          repeatCount="indefinite"
        />
      </circle>
    </g>
  );
}

export function ActivityChart({ data }: ActivityChartProps) {
  const chartId = React.useId();

  // Format date labels to be shorter
  const formattedData = data.map((item) => ({
    ...item,
    shortDate: new Date(item.date).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    }),
  }));

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-100">
            Download Activity
          </h3>
          <p className="text-sm text-slate-400 mt-0.5">Last 7 days</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent-blue/10 border border-accent-blue/20">
          <div className="w-2 h-2 rounded-full bg-accent-blue" />
          <span className="text-xs font-medium text-accent-blue">
            Downloads
          </span>
        </div>
      </div>

      <div className="w-full h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={formattedData}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient
                id={`${chartId}-gradient`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
                <stop offset="50%" stopColor="#3b82f6" stopOpacity={0.1} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient
                id={`${chartId}-stroke`}
                x1="0"
                y1="0"
                x2="1"
                y2="0"
              >
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(148, 163, 184, 0.06)"
              vertical={false}
            />
            <XAxis
              dataKey="shortDate"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#64748b", fontSize: 12, fontWeight: 500 }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#64748b", fontSize: 12 }}
              allowDecimals={false}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{
                stroke: "rgba(59, 130, 246, 0.2)",
                strokeWidth: 1,
                strokeDasharray: "4 4",
              }}
            />
            <Area
              type="monotone"
              dataKey="downloads"
              stroke={`url(#${chartId}-stroke)`}
              strokeWidth={2.5}
              fill={`url(#${chartId}-gradient)`}
              dot={(dotProps) => (
                <CustomDot
                  key={dotProps.index}
                  {...dotProps}
                  dataLength={formattedData.length}
                />
              )}
              activeDot={{
                r: 6,
                fill: "#3b82f6",
                stroke: "#0f172a",
                strokeWidth: 3,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
