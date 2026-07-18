"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { FolderOpen, RefreshCw, HardDrive, Info } from "lucide-react";
import { apiGet, apiSend } from "@/lib/client-api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/providers/toast-provider";
import { useUser } from "@/components/providers/user-provider";

interface SettingsData {
  role: string;
  downloadVideoPath: string;
  downloadAudioPath: string;
  mediaVideoPaths: string[];
  mediaAudioPaths: string[];
}

function PathRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 py-2.5 border-b border-slate-700/20 last:border-0">
      <span className="text-sm text-slate-400 w-40 flex-shrink-0">{label}</span>
      <code className="text-xs text-slate-300 bg-navy-900/60 px-2 py-1 rounded break-all">{value || "—"}</code>
    </div>
  );
}

export default function SettingsPage() {
  const toast = useToast();
  const user = useUser();
  const [scanning, setScanning] = useState(false);

  const { data } = useQuery({
    queryKey: ["settings"],
    queryFn: () => apiGet<SettingsData>("/api/settings"),
  });

  async function scan() {
    setScanning(true);
    try {
      const res = await apiSend<{ added: number; removed: number; scanned: number }>("POST", "/api/library/scan");
      toast(`Scanned ${res.scanned} files — ${res.added} added, ${res.removed} removed`, "success");
    } catch {
      toast("Scan failed", "error");
    } finally {
      setScanning(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-100">Settings</h1>

      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <HardDrive className="h-5 w-5 text-accent-blue" />
          <h2 className="text-base font-semibold text-slate-100">Media Folders</h2>
        </div>
        <PathRow label="Download · Video" value={data?.downloadVideoPath || ""} />
        <PathRow label="Download · Audio" value={data?.downloadAudioPath || ""} />
        {(data?.mediaVideoPaths || []).map((p, i) => (
          <PathRow key={`v${i}`} label={`Library · Video ${i + 1}`} value={p} />
        ))}
        {(data?.mediaAudioPaths || []).map((p, i) => (
          <PathRow key={`a${i}`} label={`Library · Audio ${i + 1}`} value={p} />
        ))}

        <div className="mt-4 flex items-start gap-2 text-xs text-slate-500 bg-navy-900/40 rounded-lg p-3">
          <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <p>
            Folders are configured via environment variables / Docker volumes
            (<code className="text-slate-400">MEDIA_VIDEO_PATH</code>,{" "}
            <code className="text-slate-400">MEDIA_AUDIO_PATH</code>, …). Point them at your
            Synology media shares and rescan to import them.
          </p>
        </div>
      </div>

      <div className="glass-card p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-accent-emerald" />
            <div>
              <h2 className="text-base font-semibold text-slate-100">Library Scan</h2>
              <p className="text-xs text-slate-500">Re-index all media folders for new or removed files.</p>
            </div>
          </div>
          <Button onClick={scan} isLoading={scanning} variant="secondary">
            <RefreshCw className="h-4 w-4" /> Scan now
          </Button>
        </div>
      </div>

      <div className="glass-card p-6">
        <h2 className="text-base font-semibold text-slate-100 mb-3">Account</h2>
        <div className="text-sm text-slate-400 space-y-1">
          <p>Signed in as <span className="text-slate-200">{user.username}</span></p>
          <p>Email: <span className="text-slate-200">{user.email}</span></p>
          <p>Role: <span className="text-accent-blue capitalize">{user.role}</span></p>
        </div>
      </div>
    </div>
  );
}
