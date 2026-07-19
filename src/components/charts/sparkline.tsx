"use client";

import { memo, useId } from "react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";

interface SparklineProps {
  data: number[];
  color: string;
  height?: number;
  /** Fill the area under the line (default true) */
  fill?: boolean;
}

/** Tiny decorative area chart used inside stat cards & KPI tiles. */
export const Sparkline = memo(function Sparkline({
  data,
  color,
  height = 40,
  fill = true,
}: SparklineProps) {
  const id = useId().replace(/:/g, "");
  const points = data.map((v, i) => ({ i, v }));

  return (
    <div style={{ height }} className="w-full" aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.75}
            fill={fill ? `url(#spark-${id})` : "transparent"}
            isAnimationActive
            animationDuration={900}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
});
