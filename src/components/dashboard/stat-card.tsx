"use client";

import type { LucideIcon } from "lucide-react";

export function StatCard({
  title,
  value,
  sub,
  icon: Icon,
  gradient,
}: {
  title: string;
  value: string | number;
  sub?: string;
  icon: LucideIcon;
  gradient: string;
}) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-start justify-between">
        <div className={`flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} shadow-lg`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold text-slate-100 tabular-nums">{value}</p>
        <p className="text-sm text-slate-400 mt-0.5">{title}</p>
        {sub && <p className="text-xs text-slate-600 mt-1">{sub}</p>}
      </div>
    </div>
  );
}
