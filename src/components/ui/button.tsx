"use client";

import React, { forwardRef, type ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-navy-900 disabled:opacity-50 disabled:pointer-events-none cursor-pointer",
  {
    variants: {
      variant: {
        primary:
          "bg-gradient-to-r from-accent-blue to-accent-purple text-white hover:opacity-90 focus:ring-accent-blue shadow-lg shadow-accent-blue/20",
        secondary:
          "bg-navy-700/50 text-slate-200 border border-slate-600/30 hover:bg-navy-700 hover:border-slate-500/50 focus:ring-slate-500",
        ghost:
          "text-slate-300 hover:bg-navy-700/50 hover:text-foreground focus:ring-slate-500",
        danger:
          "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 focus:ring-red-500",
        success:
          "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 focus:ring-emerald-500",
        outline:
          "border border-slate-600/50 text-slate-300 hover:bg-navy-700/50 hover:text-foreground focus:ring-accent-blue",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-base",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, children, disabled, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
