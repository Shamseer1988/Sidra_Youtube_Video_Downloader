"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "circular" | "rectangular" | "card";
}

function Skeleton({ className, variant = "text", ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "bg-navy-700/50 shimmer",
        variant === "text" && "h-4 rounded-md",
        variant === "circular" && "rounded-full",
        variant === "rectangular" && "rounded-lg",
        variant === "card" && "rounded-xl h-48",
        className
      )}
      {...props}
    />
  );
}

function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("glass-card p-6 space-y-4", className)}>
      <div className="flex items-center gap-4">
        <Skeleton variant="circular" className="w-12 h-12" />
        <div className="flex-1 space-y-2">
          <Skeleton className="w-3/4" />
          <Skeleton className="w-1/2 h-3" />
        </div>
      </div>
      <Skeleton variant="rectangular" className="h-32" />
      <div className="flex gap-2">
        <Skeleton className="w-20" />
        <Skeleton className="w-16" />
      </div>
    </div>
  );
}

function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-4 px-4 py-3">
        <Skeleton className="w-1/4" />
        <Skeleton className="w-1/4" />
        <Skeleton className="w-1/4" />
        <Skeleton className="w-1/4" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 px-4 py-3 border-t border-slate-700/20">
          <Skeleton className="w-1/4 h-5" />
          <Skeleton className="w-1/4 h-5" />
          <Skeleton className="w-1/4 h-5" />
          <Skeleton className="w-1/4 h-5" />
        </div>
      ))}
    </div>
  );
}

export { Skeleton, SkeletonCard, SkeletonTable };
