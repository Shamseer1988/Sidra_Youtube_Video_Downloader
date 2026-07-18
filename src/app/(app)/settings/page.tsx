"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Clapperboard, Music, DownloadCloud, FolderPlus, Trash2, RefreshCw,
  AlertTriangle, Info, FolderOpen,
} from "lucide-react";
import { apiGet, apiSend } from "@/lib/client-api";
import { FolderBrowserModal } from "@/components/settings/folder-browser";
import { useToast } from "@/components/providers/toast-provider";
import { useUser } from "@/components/providers/user-provider";
import { cn } from "@/lib/utils";
import type { MediaFolder } from "@/lib/types";

type PickTarget = { kind: "video" | "audio"; role: "library" | "download" } | null;

const SECTIONS: {
  kind: "video" | "audio";
  role: "library" | "download";
  title: string;
  desc: string;
  icon: any;
  tone: string;
}[] = [
  {
    kind: "video", role: "library", icon: Clapperboard, tone: "text-accent-blue",
    title: "Video Library Folders",
    desc: "Existing movies & shows to browse and stream (e.g. your NAS video share).",
  },
  {
    kind: "audio", role: "library", icon: Music, tone: "text-accent-emerald",
    title: "Music Library Folders",
    desc: "Existing music to browse and play.",
  },
  {
    kind: "video", role: "download", icon: DownloadCloud, tone: "text-accent-purple",
    title: "Video Download Folder",
    desc: "Where new video downloads are saved. The first folder is used.",
  },
  {
    kind: "audio", role: "download", icon: DownloadCloud, tone: "text-accent-amber",
    title: "Audio Download Folder",
    desc: "Where new audio downloads are saved. The first folder is used.",
  },
];

export default function SettingsPage() {
  const toast = useToast();
  const user = useUser();
  const qc = useQueryClient();
  const isAdmin = user.role === "admin";
  const [picking, setPicking] = useState<PickTarget>(null);
  const [scanning, setScanning] = useState(false);

  const { data: folders = [] } = useQuery({
    queryKey: ["folders"],
    queryFn: () => apiGet<MediaFolder[]>("/api/folders"),
  });

  async function addFolder(path: string) {
    if (!picking) return;
    try {
      await apiSend("POST", "/api/folders", { path, kind: picking.kind, role: picking.role });
      toast("Folder added — running a scan is recommended", "success");
      qc.invalidateQueries({ queryKey: ["folders"] });
    } catch (e: any) {
      toast(e.message || "Could not add folder", "error");
    } finally {
      setPicking(null);
    }
  }

  async function removeFolder(id: string) {
    if (!confirm("Remove this folder from the app? Files on disk are never deleted.")) return;
    try {
      await apiSend("DELETE", `/api/folders/${id}`);
      toast("Folder removed", "success");
      qc.invalidateQueries({ queryKey: ["folders"] });
    } catch {
      toast("Could not remove folder", "error");
    }
  }

  async function scan() {
    setScanning(true);
    try {
      const res = await apiSend<{ scanned: number; added: number; removed: number }>(
        "POST",
        "/api/library/scan",
      );
      toast(`Scanned ${res.scanned} files — ${res.added} added, ${res.removed} removed`, "success");
      qc.invalidateQueries({ queryKey: ["library"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    } catch {
      toast("Scan failed", "error");
    } finally {
      setScanning(false);
    }
  }

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-100">Settings</h1>
        <button
          onClick={scan}
          disabled={scanning}
          className="flex items-center gap-2 h-10 px-4 rounded-xl bg-gradient-to-r from-accent-blue to-accent-purple text-white text-sm font-semibold hover:opacity-95 disabled:opacity-60"
        >
          <RefreshCw className={cn("h-4 w-4", scanning && "animate-spin")} />
          {scanning ? "Scanning…" : "Scan Library"}
        </button>
      </div>

      {!isAdmin && (
        <div className="glass-card p-4 flex items-start gap-3 text-sm text-slate-400">
          <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-accent-blue" />
          Folders are managed by an administrator. You can still run a library scan.
        </div>
      )}

      {SECTIONS.map((section) => {
        const rows = folders.filter((f) => f.kind === section.kind && f.role === section.role);
        const Icon = section.icon;
        return (
          <div key={`${section.kind}-${section.role}`} className="glass-card p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3 mb-1">
              <div className="flex items-center gap-2.5">
                <Icon className={`h-5 w-5 ${section.tone}`} />
                <h2 className="text-base font-semibold text-slate-100">{section.title}</h2>
              </div>
              {isAdmin && (
                <button
                  onClick={() => setPicking({ kind: section.kind, role: section.role })}
                  className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-navy-700/60 border border-slate-600/30 text-xs font-medium text-slate-200 hover:bg-navy-600/60"
                >
                  <FolderPlus className="h-3.5 w-3.5" /> Add
                </button>
              )}
            </div>
            <p className="text-xs text-slate-500 mb-4">{section.desc}</p>

            {rows.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-slate-600 py-3">
                <FolderOpen className="h-4 w-4" /> No folders yet.
              </div>
            ) : (
              <div className="space-y-2">
                {rows.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-navy-900/50 border border-slate-700/25"
                  >
                    <code className="flex-1 text-xs text-slate-300 break-all">{f.path}</code>
                    {!f.exists && (
                      <span className="flex items-center gap-1 text-[10px] text-amber-400 flex-shrink-0">
                        <AlertTriangle className="h-3 w-3" /> missing
                      </span>
                    )}
                    {isAdmin && (
                      <button
                        onClick={() => removeFolder(f.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 flex-shrink-0"
                        title="Remove"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      <div className="glass-card p-4 flex items-start gap-3 text-xs text-slate-500">
        <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-accent-blue" />
        <p>
          Running in Docker? The app can only see folders mounted into the container.
          Map your Synology shares as volumes (e.g. <code className="text-slate-400">/volume1/video → /media/videos</code>),
          then add them here and scan.
        </p>
      </div>

      {picking && (
        <FolderBrowserModal
          title={`Add ${picking.kind} ${picking.role} folder`}
          startPath="/"
          onSelect={addFolder}
          onClose={() => setPicking(null)}
        />
      )}
    </div>
  );
}
