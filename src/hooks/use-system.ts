"use client";

import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/client-api";

/* ------------------------------------------------------------------ */
/*  Storage                                                            */
/* ------------------------------------------------------------------ */

export interface StorageInfo {
  nasName: string;
  totalBytes: number;
  freeBytes: number;
  usedBytes: number;
  usedPercent: number;
  volumes: {
    path: string;
    totalBytes: number;
    freeBytes: number;
    usedBytes: number;
    usedPercent: number;
  }[];
  library: { videoBytes: number; audioBytes: number };
}

/** Real NAS volume usage (statfs of every mounted media volume). */
export function useStorageInfo() {
  return useQuery({
    queryKey: ["system", "storage"],
    queryFn: () => apiGet<StorageInfo>("/api/system/storage"),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

/* ------------------------------------------------------------------ */
/*  Health                                                             */
/* ------------------------------------------------------------------ */

export interface SystemHealthData {
  cpu: { percent: number | null; cores: number; load1: number };
  memory: { totalBytes: number; usedBytes: number; usedPercent: number } | null;
  network: { rxPerSec: number | null; txPerSec: number | null };
  temperatureC: number | null;
  uptimeSec: number | null;
  hostname: string;
}

export interface LiveMetricSeries {
  cpu: number[];
  memory: number[];
  rx: number[];
  tx: number[];
  temp: number[];
}

const SERIES_LEN = 20;

function push(series: number[], value: number | null | undefined): number[] {
  if (value === null || value === undefined || !Number.isFinite(value)) return series;
  return [...series.slice(-(SERIES_LEN - 1)), value];
}

/**
 * Polls /api/system/health and accumulates a rolling series per metric on
 * the client so the mini charts show live history.
 */
export function useSystemHealth(intervalMs = 5000) {
  const seriesRef = useRef<LiveMetricSeries>({ cpu: [], memory: [], rx: [], tx: [], temp: [] });

  const query = useQuery({
    queryKey: ["system", "health"],
    queryFn: async () => {
      const data = await apiGet<SystemHealthData>("/api/system/health");
      const s = seriesRef.current;
      seriesRef.current = {
        cpu: push(s.cpu, data.cpu.percent),
        memory: push(s.memory, data.memory?.usedPercent),
        rx: push(s.rx, data.network.rxPerSec),
        tx: push(s.tx, data.network.txPerSec),
        temp: push(s.temp, data.temperatureC),
      };
      return data;
    },
    refetchInterval: intervalMs,
    refetchIntervalInBackground: false,
  });

  return { ...query, series: seriesRef.current };
}

/* ------------------------------------------------------------------ */

export function formatRate(bytesPerSec: number | null | undefined): string {
  if (bytesPerSec === null || bytesPerSec === undefined) return "—";
  const bits = bytesPerSec * 8;
  if (bits >= 1e9) return `${(bits / 1e9).toFixed(1)} Gbps`;
  if (bits >= 1e6) return `${(bits / 1e6).toFixed(0)} Mbps`;
  if (bits >= 1e3) return `${(bits / 1e3).toFixed(0)} Kbps`;
  return `${Math.round(bits)} bps`;
}

export function formatUptime(sec: number | null | undefined): string {
  if (!sec) return "—";
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  if (d > 0) return `${d}d ${h}h`;
  const m = Math.floor((sec % 3600) / 60);
  return `${h}h ${m}m`;
}
