"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Cpu, HardDrive, Info, User, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiGet, apiSend } from "@/lib/client-api";
import { useToast } from "@/components/providers/toast-provider";
import { useUser } from "@/components/providers/user-provider";
import { PageHeader } from "@/components/layout/page-header";
import { LibraryManager } from "@/components/settings/library-manager";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface SettingsData {
  role: string;
  nasName: string;
  downloadVideoPath: string;
  downloadAudioPath: string;
  browseRoots: { path: string; kind: string }[];
  playback: { hwAccel: "off" | "auto" | "nvenc" | "vaapi" | "qsv" };
}

const HWACCEL_OPTIONS: { value: SettingsData["playback"]["hwAccel"]; label: string; hint: string }[] = [
  { value: "off", label: "Off (CPU)", hint: "Software transcoding — most compatible" },
  { value: "auto", label: "Auto", hint: "Detect the best available GPU" },
  { value: "nvenc", label: "NVIDIA (NVENC)", hint: "NVIDIA GPUs" },
  { value: "vaapi", label: "VAAPI", hint: "Intel / AMD on Linux" },
  { value: "qsv", label: "Intel QSV", hint: "Intel Quick Sync" },
];

export default function SettingsPage() {
  const toast = useToast();
  const user = useUser();
  const qc = useQueryClient();
  const isAdmin = user.role === "admin";

  const { data, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: () => apiGet<SettingsData>("/api/settings"),
  });

  const hwMutation = useMutation({
    mutationFn: (hwAccel: SettingsData["playback"]["hwAccel"]) =>
      apiSend("POST", "/api/settings", { hwAccel }),
    onSuccess: () => {
      toast("Playback settings saved", "success");
      qc.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader title="Settings" subtitle={`SidraMedia on ${data?.nasName ?? "…"}`} />

      {/* Libraries */}
      <LibraryManager isAdmin={isAdmin} />

      {/* Playback / hardware acceleration */}
      <section aria-label="Playback" className="glass-card p-6">
        <div className="mb-4 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-warning/15 text-warning">
            <Zap className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-foreground">Playback & Performance</h2>
            <p className="text-xs text-muted-2">
              Hardware acceleration for transcoding incompatible or high-bitrate video.
            </p>
          </div>
        </div>

        {isLoading || !data ? (
          <Skeleton className="h-24 rounded-xl" />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {HWACCEL_OPTIONS.map((opt) => {
                const active = data.playback.hwAccel === opt.value;
                return (
                  <button
                    key={opt.value}
                    disabled={!isAdmin || hwMutation.isPending}
                    onClick={() => hwMutation.mutate(opt.value)}
                    aria-pressed={active}
                    className={cn(
                      "flex items-start gap-3 rounded-xl border p-3 text-left transition-all disabled:opacity-60",
                      active
                        ? "border-primary/50 bg-primary/10"
                        : "border-stroke bg-surface-2/60 hover:border-stroke-strong"
                    )}
                  >
                    <Cpu
                      className={cn("mt-0.5 h-4 w-4 shrink-0", active ? "text-primary" : "text-muted-2")}
                    />
                    <div>
                      <p className="text-sm font-medium text-foreground">{opt.label}</p>
                      <p className="text-[11px] text-muted-2">{opt.hint}</p>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-stroke bg-surface-2/60 p-3 text-xs text-muted">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <p>
                GPU transcoding requires the container to expose the device (e.g.{" "}
                <code className="text-foreground">/dev/dri</code> for VAAPI/QSV, or the NVIDIA
                runtime for NVENC). Files whose codec the browser already supports are streamed
                directly with no transcoding — always the fastest path.
              </p>
            </div>
          </>
        )}
      </section>

      {/* Download folders (read-only info) */}
      <section aria-label="Storage paths" className="glass-card p-6">
        <div className="mb-4 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15 text-accent">
            <HardDrive className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-foreground">Storage Paths</h2>
            <p className="text-xs text-muted-2">Configured via Docker volumes / environment.</p>
          </div>
        </div>
        {isLoading || !data ? (
          <Skeleton className="h-20 rounded-xl" />
        ) : (
          <div className="space-y-2 text-xs">
            <PathRow label="Downloads · Video" value={data.downloadVideoPath} />
            <PathRow label="Downloads · Audio" value={data.downloadAudioPath} />
            {data.browseRoots.map((r) => (
              <PathRow key={r.path} label={`Mounted · ${r.kind}`} value={r.path} />
            ))}
          </div>
        )}
      </section>

      {/* Account */}
      <section aria-label="Account" className="glass-card p-6">
        <div className="mb-4 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/15 text-secondary">
            <User className="h-5 w-5" />
          </span>
          <h2 className="text-base font-semibold text-foreground">Account</h2>
        </div>
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12 ring-2 ring-primary/30">
            <AvatarFallback style={{ background: user.avatarColor }} className="text-base">
              {user.username.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-semibold text-foreground">{user.username}</p>
            <p className="truncate text-sm text-muted">{user.email}</p>
            <Badge size="sm" className="mt-1 border-primary/30 bg-primary/10 capitalize text-primary">
              {user.role}
            </Badge>
          </div>
        </div>
      </section>
    </div>
  );
}

function PathRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-stroke py-2 last:border-0">
      <span className="w-36 shrink-0 text-muted">{label}</span>
      <code className="min-w-0 flex-1 truncate rounded-lg bg-surface-2 px-2.5 py-1 font-mono text-foreground">
        {value || "—"}
      </code>
    </div>
  );
}
