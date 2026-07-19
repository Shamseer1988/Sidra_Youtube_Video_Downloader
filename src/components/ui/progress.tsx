"use client";

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@/lib/utils";

interface ProgressProps
  extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  value: number;
  /** Tailwind classes for the indicator, defaults to the brand gradient */
  indicatorClassName?: string;
  /** Adds an animated stripe overlay (for in-flight downloads) */
  active?: boolean;
}

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, value, indicatorClassName, active, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      "relative h-1.5 w-full overflow-hidden rounded-full bg-surface-3",
      className
    )}
    value={value}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className={cn(
        "relative h-full w-full flex-1 rounded-full bg-gradient-to-r from-primary to-secondary transition-transform duration-700 ease-out",
        indicatorClassName
      )}
      style={{ transform: `translateX(-${100 - Math.min(100, Math.max(0, value))}%)` }}
    >
      {active && <span className="progress-stripes absolute inset-0 rounded-full" />}
    </ProgressPrimitive.Indicator>
  </ProgressPrimitive.Root>
));
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
