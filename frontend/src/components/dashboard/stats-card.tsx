"use client";

import React, { useEffect, useRef } from "react";
import { motion, useInView, useMotionValue, useSpring } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  gradient?: string;
}

function AnimatedCounter({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, {
    damping: 40,
    stiffness: 120,
    duration: 1.2,
  });
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  useEffect(() => {
    if (isInView) {
      motionValue.set(value);
    }
  }, [motionValue, value, isInView]);

  useEffect(() => {
    const unsubscribe = springValue.on("change", (latest) => {
      if (ref.current) {
        const formatted =
          latest >= 1_000_000
            ? `${(latest / 1_000_000).toFixed(1)}M`
            : latest >= 1_000
              ? `${(latest / 1_000).toFixed(1)}K`
              : Math.round(latest).toLocaleString();
        ref.current.textContent = formatted;
      }
    });
    return unsubscribe;
  }, [springValue]);

  return <span ref={ref}>0</span>;
}

const trendConfig = {
  up: {
    icon: TrendingUp,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
  },
  down: {
    icon: TrendingDown,
    color: "text-red-400",
    bgColor: "bg-red-500/10",
  },
  neutral: {
    icon: Minus,
    color: "text-slate-400",
    bgColor: "bg-slate-500/10",
  },
};

export function StatsCard({
  title,
  value,
  icon: Icon,
  trend = "neutral",
  trendValue,
  gradient = "from-accent-blue to-accent-purple",
}: StatsCardProps) {
  const trendInfo = trendConfig[trend];
  const TrendIcon = trendInfo.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass-card p-6 group hover:border-slate-600/30 hover:shadow-lg hover:shadow-accent-blue/5 transition-all duration-300"
    >
      <div className="flex items-start justify-between">
        {/* Icon with gradient background */}
        <div
          className={cn(
            "flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br shadow-lg transition-transform duration-300 group-hover:scale-110",
            gradient
          )}
        >
          <Icon className="h-6 w-6 text-white" />
        </div>

        {/* Trend indicator */}
        {trendValue && (
          <div
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
              trendInfo.bgColor,
              trendInfo.color
            )}
          >
            <TrendIcon className="h-3 w-3" />
            <span>{trendValue}</span>
          </div>
        )}
      </div>

      {/* Value with animated counter */}
      <div className="mt-4">
        <h3 className="text-3xl font-bold text-white tracking-tight">
          <AnimatedCounter value={value} />
        </h3>
        <p className="text-sm text-slate-400 mt-1 font-medium">{title}</p>
      </div>

      {/* Subtle bottom gradient line */}
      <div className="mt-4 h-0.5 w-full rounded-full overflow-hidden bg-navy-700/50">
        <motion.div
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }}
          className={cn("h-full rounded-full bg-gradient-to-r", gradient)}
          style={{ opacity: 0.6 }}
        />
      </div>
    </motion.div>
  );
}
