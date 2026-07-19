"use client";

import { useEffect, useState } from "react";

export interface ClockState {
  time: string;
  date: string;
  greeting: string;
}

function compute(): ClockState {
  const now = new Date();
  const hour = now.getHours();
  const greeting =
    hour < 5 ? "Good Night" : hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
  return {
    time: now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    date: now.toLocaleDateString("en-US", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    greeting,
  };
}

/** Live clock that updates every 30s. Returns null until mounted (SSR-safe). */
export function useClock(): ClockState | null {
  const [state, setState] = useState<ClockState | null>(null);

  useEffect(() => {
    setState(compute());
    const id = setInterval(() => setState(compute()), 30_000);
    return () => clearInterval(id);
  }, []);

  return state;
}
