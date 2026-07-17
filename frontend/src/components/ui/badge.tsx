"use client";

import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full font-medium border transition-colors duration-200",
  {
    variants: {
      variant: {
        default: "bg-slate-500/20 text-slate-300 border-slate-500/30",
        blue: "bg-blue-500/20 text-blue-400 border-blue-500/30",
        emerald: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
        purple: "bg-purple-500/20 text-purple-400 border-purple-500/30",
        amber: "bg-amber-500/20 text-amber-400 border-amber-500/30",
        red: "bg-red-500/20 text-red-400 border-red-500/30",
        sky: "bg-sky-500/20 text-sky-400 border-sky-500/30",
        pink: "bg-pink-500/20 text-pink-400 border-pink-500/30",
        youtube: "bg-red-500/20 text-red-400 border-red-500/30",
        vimeo: "bg-blue-500/20 text-blue-400 border-blue-500/30",
        instagram: "bg-pink-500/20 text-pink-400 border-pink-500/30",
        facebook: "bg-blue-600/20 text-blue-400 border-blue-600/30",
        twitter: "bg-sky-500/20 text-sky-400 border-sky-500/30",
        tiktok: "bg-slate-500/20 text-slate-300 border-slate-500/30",
      },
      size: {
        sm: "text-[10px] px-2 py-0.5",
        md: "text-xs px-2.5 py-0.5",
        lg: "text-sm px-3 py-1",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, size }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
