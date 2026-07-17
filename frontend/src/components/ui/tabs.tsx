"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";

interface TabsProps {
  tabs: { id: string; label: string; icon?: React.ReactNode; count?: number }[];
  activeTab: string;
  onTabChange: (id: string) => void;
  className?: string;
}

function Tabs({ tabs, activeTab, onTabChange, className }: TabsProps) {
  return (
    <div className={cn("flex items-center gap-1 p-1 rounded-xl bg-navy-800/50 border border-slate-700/30", className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
            activeTab === tab.id
              ? "bg-accent-blue/20 text-accent-blue border border-accent-blue/30"
              : "text-slate-400 hover:text-slate-200 hover:bg-navy-700/50 border border-transparent"
          )}
        >
          {tab.icon}
          {tab.label}
          {tab.count !== undefined && (
            <span
              className={cn(
                "text-xs px-1.5 py-0.5 rounded-full",
                activeTab === tab.id
                  ? "bg-accent-blue/30 text-accent-blue"
                  : "bg-slate-700/50 text-slate-500"
              )}
            >
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

interface TabPanelProps {
  children: React.ReactNode;
  className?: string;
}

function TabPanel({ children, className }: TabPanelProps) {
  return <div className={cn("mt-4", className)}>{children}</div>;
}

export { Tabs, TabPanel };
