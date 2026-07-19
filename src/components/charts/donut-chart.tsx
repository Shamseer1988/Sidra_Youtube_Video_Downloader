"use client";

import { memo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { ChartTooltip } from "@/components/charts/chart-tooltip";

interface DonutDatum {
  name: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DonutDatum[];
  /** Center label, e.g. "72%" */
  centerValue?: string;
  centerLabel?: string;
  size?: number;
  unit?: string;
}

/** Animated donut with an optional center statistic. */
export const DonutChart = memo(function DonutChart({
  data,
  centerValue,
  centerLabel,
  size = 190,
  unit = "",
}: DonutChartProps) {
  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip content={<ChartTooltip unit={unit} />} />
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="72%"
            outerRadius="92%"
            paddingAngle={3}
            cornerRadius={6}
            strokeWidth={0}
            isAnimationActive
            animationDuration={1100}
          >
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      {centerValue && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-foreground">{centerValue}</span>
          {centerLabel && <span className="text-xs text-muted">{centerLabel}</span>}
        </div>
      )}
    </div>
  );
});
