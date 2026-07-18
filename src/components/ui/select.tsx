"use client";

import React, { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, options, placeholder, ...props }, ref) => {
    return (
      <div className="w-full">
        <div className="relative">
          <select
            className={cn(
              "w-full h-10 rounded-lg bg-navy-800/80 border border-slate-600/30 text-slate-200 pl-4 pr-10 appearance-none transition-all duration-200 cursor-pointer",
              "focus:border-accent-blue/50 focus:ring-2 focus:ring-accent-blue/20 focus:outline-none",
              "hover:border-slate-500/50",
              error && "border-red-500/50",
              className
            )}
            ref={ref}
            {...props}
          >
            {placeholder && (
              <option value="" className="bg-navy-800 text-slate-400">
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-navy-800 text-slate-200">
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        </div>
        {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
      </div>
    );
  }
);
Select.displayName = "Select";

export { Select };
