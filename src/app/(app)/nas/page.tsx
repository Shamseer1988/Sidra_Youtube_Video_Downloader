"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Cpu, HardDrive, RefreshCw, Thermometer, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { nasDisks, nasVolumes, storageTotals, systemMetrics } from "@/lib/mock-data";
import { PageHeader } from "@/components/layout/page-header";
import { StorageChart } from "@/components/dashboard/storage-chart";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Sparkline } from "@/components/charts/sparkline";

export default function NasStoragePage() {
  const [scanning, setScanning] = useState(false);

  function scan() {
    setScanning(true);
    setTimeout(() => setScanning(false), 2500);
  }

  const nasMetrics = systemMetrics.filter((m) => ["cpu", "ram", "nas-temp", "disk-io"].includes(m.id));

  return (
    <div className="mx-auto max-w-[1600px] space-y-5">
      <PageHeader
        title="NAS Storage"
        subtitle={`${storageTotals.nasName} · ${storageTotals.usedTb} TB of ${storageTotals.capacityTb} TB used`}
        actions={
          <Button size="sm" onClick={scan} isLoading={scanning}>
            {!scanning && <RefreshCw className="h-4 w-4" />}
            {scanning ? "Scanning…" : "Scan NAS"}
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <StorageChart />

        {/* Volumes */}
        <section aria-label="Volumes" className="glass-card p-5 xl:col-span-2">
          <h2 className="mb-4 text-base font-semibold text-foreground">Volumes</h2>
          <div className="space-y-4">
            {nasVolumes.map((vol, i) => {
              const pct = Math.round((vol.usedTb / vol.capacityTb) * 100);
              return (
                <motion.div
                  key={vol.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="rounded-2xl border border-stroke bg-surface-2/60 p-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                      <HardDrive className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{vol.name}</p>
                      <p className="text-xs text-muted-2">
                        {vol.fs} · {vol.usedTb} TB / {vol.capacityTb} TB
                      </p>
                    </div>
                    <Badge size="sm" className="border-success/30 bg-success/10 text-success">
                      <CheckCircle2 className="h-3 w-3" /> {vol.status}
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <Progress
                      value={pct}
                      aria-label={`${vol.name} usage`}
                      indicatorClassName={cn(pct > 85 && "from-warning to-orange-500")}
                    />
                    <span className="text-xs tabular-nums text-muted">{pct}%</span>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* NAS vitals */}
          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {nasMetrics.map((m) => (
              <div key={m.id} className="rounded-2xl border border-stroke bg-surface-2/60 p-3.5">
                <p className="flex items-center gap-1.5 text-[11px] text-muted-2">
                  <Cpu className="h-3 w-3" /> {m.label}
                </p>
                <p className="mt-1 text-base font-bold tabular-nums text-foreground">{m.value}</p>
                <Sparkline data={m.series} color={m.color} height={26} fill={false} />
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Disks */}
      <section aria-label="Disks" className="glass-card p-5">
        <h2 className="mb-4 text-base font-semibold text-foreground">Drives</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {nasDisks.map((disk, i) => {
            const healthy = disk.health === "Healthy";
            return (
              <motion.div
                key={disk.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="card-interactive rounded-2xl border border-stroke bg-surface-2/60 p-4"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">{disk.name}</p>
                  <Badge
                    size="sm"
                    className={cn(
                      healthy
                        ? "border-success/30 bg-success/10 text-success"
                        : "border-warning/30 bg-warning/10 text-warning"
                    )}
                  >
                    {healthy ? <CheckCircle2 className="h-3 w-3" /> : <TriangleAlert className="h-3 w-3" />}
                    {disk.health}
                  </Badge>
                </div>
                <p className="mt-1 truncate text-xs text-muted-2">{disk.model}</p>
                <div className="mt-3 flex items-center justify-between text-xs text-muted">
                  <span className="flex items-center gap-1.5">
                    <Thermometer className="h-3.5 w-3.5" /> {disk.temp}°C
                  </span>
                  <span className="tabular-nums">{disk.hours.toLocaleString()} h powered on</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
