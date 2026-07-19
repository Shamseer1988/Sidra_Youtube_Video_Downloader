"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Cpu, Gauge, HardDrive, MemoryStick, RefreshCw, Thermometer, TriangleAlert } from "lucide-react";
import { cn, formatBytes } from "@/lib/utils";
import { apiSend } from "@/lib/client-api";
import { formatRate, formatUptime, useStorageInfo, useSystemHealth } from "@/hooks/use-system";
import { useToast } from "@/components/providers/toast-provider";
import { PageHeader } from "@/components/layout/page-header";
import { StorageChart } from "@/components/dashboard/storage-chart";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

export default function NasStoragePage() {
  const toast = useToast();
  const [scanning, setScanning] = useState(false);
  const { data: storage, isLoading: storageLoading } = useStorageInfo();
  const { data: health } = useSystemHealth();

  async function scan() {
    setScanning(true);
    try {
      const res = await apiSend<{ added: number; removed: number; scanned: number }>(
        "POST",
        "/api/library/scan"
      );
      toast(`Scanned ${res.scanned} files — ${res.added} added, ${res.removed} removed`, "success");
    } catch {
      toast("Scan failed", "error");
    } finally {
      setScanning(false);
    }
  }

  const vitals = [
    {
      label: "CPU",
      icon: Cpu,
      value: health?.cpu.percent !== null && health ? `${health.cpu.percent}%` : "…",
      sub: health ? `${health.cpu.cores} cores · load ${health.cpu.load1}` : "",
    },
    {
      label: "RAM",
      icon: MemoryStick,
      value: health?.memory ? `${health.memory.usedPercent}%` : "—",
      sub: health?.memory
        ? `${formatBytes(health.memory.usedBytes, 1)} / ${formatBytes(health.memory.totalBytes, 1)}`
        : "",
    },
    {
      label: "Temperature",
      icon: Thermometer,
      value: health?.temperatureC != null ? `${Math.round(health.temperatureC)}°C` : "n/a",
      sub: health?.temperatureC != null ? (health.temperatureC < 60 ? "Good" : "Elevated") : "sensor not exposed",
    },
    {
      label: "Network",
      icon: Gauge,
      value: formatRate(health?.network.rxPerSec),
      sub: `↑ ${formatRate(health?.network.txPerSec)} · up ${formatUptime(health?.uptimeSec)}`,
    },
  ];

  return (
    <div className="mx-auto max-w-[1600px] space-y-5">
      <PageHeader
        title="NAS Storage"
        subtitle={
          storage
            ? `${storage.nasName} · ${formatBytes(storage.usedBytes, 1)} of ${formatBytes(storage.totalBytes, 1)} used`
            : "Reading volume information…"
        }
        actions={
          <Button size="sm" onClick={scan} isLoading={scanning}>
            {!scanning && <RefreshCw className="h-4 w-4" />}
            {scanning ? "Scanning…" : "Scan NAS"}
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <StorageChart />

        {/* Mounted volumes */}
        <section aria-label="Mounted volumes" className="glass-card p-5 xl:col-span-2">
          <h2 className="mb-4 text-base font-semibold text-foreground">Mounted Volumes</h2>

          {storageLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 rounded-2xl" />
              <Skeleton className="h-20 rounded-2xl" />
            </div>
          ) : !storage?.volumes.length ? (
            <p className="rounded-2xl border border-stroke bg-surface-2/60 p-6 text-center text-sm text-muted">
              No volumes detected. Mount your media shares into the container and restart.
            </p>
          ) : (
            <div className="space-y-4">
              {storage.volumes.map((vol, i) => {
                const warn = vol.usedPercent > 85;
                return (
                  <motion.div
                    key={vol.path}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="rounded-2xl border border-stroke bg-surface-2/60 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                        <HardDrive className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-mono text-sm font-semibold text-foreground">
                          {vol.path}
                        </p>
                        <p className="text-xs text-muted-2">
                          {formatBytes(vol.usedBytes, 1)} / {formatBytes(vol.totalBytes, 1)} ·{" "}
                          {formatBytes(vol.freeBytes, 1)} free
                        </p>
                      </div>
                      <Badge
                        size="sm"
                        className={cn(
                          warn
                            ? "border-warning/30 bg-warning/10 text-warning"
                            : "border-success/30 bg-success/10 text-success"
                        )}
                      >
                        {warn ? <TriangleAlert className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                        {warn ? "Filling up" : "Healthy"}
                      </Badge>
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <Progress
                        value={vol.usedPercent}
                        aria-label={`${vol.path} usage`}
                        indicatorClassName={cn(warn && "from-warning to-orange-500")}
                      />
                      <span className="text-xs tabular-nums text-muted">{vol.usedPercent}%</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* NAS vitals */}
          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {vitals.map((m) => (
              <div key={m.label} className="rounded-2xl border border-stroke bg-surface-2/60 p-3.5">
                <p className="flex items-center gap-1.5 text-[11px] text-muted-2">
                  <m.icon className="h-3 w-3" /> {m.label}
                </p>
                <p className="mt-1 text-base font-bold tabular-nums text-foreground">{m.value}</p>
                <p className="truncate text-[10px] text-muted-2">{m.sub}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
