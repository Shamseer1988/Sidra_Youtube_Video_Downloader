"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Link2, Search, Video, Music, Loader2, Play, RotateCw, Trash2, X,
  CheckCircle2, AlertCircle, DownloadCloud,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiGet, apiSend } from "@/lib/client-api";
import { cn, formatBytes, formatDuration } from "@/lib/utils";
import { useToast } from "@/components/providers/toast-provider";
import type { DownloadJob } from "@/lib/types";

interface Info {
  title: string;
  thumbnail: string | null;
  duration: number | null;
  uploader: string | null;
  isPlaylist: boolean;
  formats: { formatId: string; ext: string; resolution: string | null; note: string | null; filesize: number | null }[];
}

export default function DownloadsPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [url, setUrl] = useState("");
  const [mediaType, setMediaType] = useState<"video" | "audio">("video");
  const [formatId, setFormatId] = useState<string>("best");
  const [info, setInfo] = useState<Info | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { data: downloads = [] } = useQuery({
    queryKey: ["downloads"],
    queryFn: () => apiGet<DownloadJob[]>("/api/downloads"),
    refetchInterval: (query) => {
      const data = query.state.data as DownloadJob[] | undefined;
      const active = data?.some((d) => d.status === "downloading" || d.status === "queued");
      return active ? 1500 : 8000;
    },
  });

  async function analyze() {
    if (!url.trim()) return;
    setAnalyzing(true);
    setInfo(null);
    try {
      const data = await apiSend<Info>("POST", "/api/downloads/info", { url: url.trim() });
      setInfo(data);
      setFormatId("best");
    } catch (e: any) {
      toast(e.message || "Could not analyze URL", "error");
    } finally {
      setAnalyzing(false);
    }
  }

  async function startDownload() {
    if (!url.trim()) return;
    setSubmitting(true);
    try {
      await apiSend("POST", "/api/downloads", {
        url: url.trim(),
        mediaType,
        formatId: mediaType === "video" ? formatId : undefined,
      });
      toast("Download queued", "success");
      setUrl("");
      setInfo(null);
      setFormatId("best");
      qc.invalidateQueries({ queryKey: ["downloads"] });
    } catch (e: any) {
      toast(e.message || "Could not start download", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function act(id: string, kind: "retry" | "delete") {
    try {
      if (kind === "retry") await apiSend("POST", `/api/downloads/${id}`);
      else await apiSend("DELETE", `/api/downloads/${id}`);
      qc.invalidateQueries({ queryKey: ["downloads"] });
    } catch {
      toast("Action failed", "error");
    }
  }

  const videoFormats = info?.formats.filter((f) => f.resolution && f.resolution !== "audio only") ?? [];

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Add panel */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-accent-blue to-accent-emerald shadow-lg">
            <DownloadCloud className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-100">New Download</h2>
            <p className="text-xs text-slate-400">
              Paste a link from YouTube, Vimeo, SoundCloud, and hundreds more.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && analyze()}
              placeholder="https://…"
              className="w-full h-12 pl-11 pr-4 rounded-xl bg-navy-800/80 border border-slate-600/30 text-slate-200 placeholder-slate-500 focus:border-accent-blue/50 focus:outline-none"
            />
          </div>
          <Button size="lg" variant="secondary" onClick={analyze} isLoading={analyzing} disabled={!url.trim()}>
            {!analyzing && <Search className="h-4 w-4" />} Analyze
          </Button>
        </div>

        {/* Type toggle */}
        <div className="flex items-center gap-2 mt-4">
          <button
            onClick={() => setMediaType("video")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm border transition-colors",
              mediaType === "video"
                ? "bg-accent-blue/20 border-accent-blue/40 text-accent-blue"
                : "bg-navy-800/60 border-slate-700/40 text-slate-400 hover:text-slate-200",
            )}
          >
            <Video className="h-4 w-4" /> Video
          </button>
          <button
            onClick={() => setMediaType("audio")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm border transition-colors",
              mediaType === "audio"
                ? "bg-accent-emerald/20 border-accent-emerald/40 text-accent-emerald"
                : "bg-navy-800/60 border-slate-700/40 text-slate-400 hover:text-slate-200",
            )}
          >
            <Music className="h-4 w-4" /> Audio (MP3)
          </button>
        </div>

        {/* Analyzed preview */}
        {info && (
          <div className="mt-4 p-4 rounded-xl bg-navy-800/50 border border-slate-700/30">
            <div className="flex gap-4">
              {info.thumbnail && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={info.thumbnail} alt="" className="w-40 aspect-video object-cover rounded-lg flex-shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-200 line-clamp-2">{info.title}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {info.uploader}
                  {info.duration ? ` · ${formatDuration(info.duration)}` : ""}
                  {info.isPlaylist ? " · Playlist" : ""}
                </p>

                {mediaType === "video" && videoFormats.length > 0 && (
                  <select
                    value={formatId}
                    onChange={(e) => setFormatId(e.target.value)}
                    className="mt-3 h-9 px-3 rounded-lg bg-navy-900/70 border border-slate-600/30 text-sm text-slate-300 focus:outline-none max-w-full"
                  >
                    <option value="best">Best quality (auto)</option>
                    {videoFormats.map((f) => (
                      <option key={f.formatId} value={f.formatId}>
                        {f.resolution} · {f.ext}
                        {f.filesize ? ` · ${formatBytes(f.filesize)}` : ""}
                        {f.note ? ` · ${f.note}` : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="mt-4">
          <Button size="lg" onClick={startDownload} isLoading={submitting} disabled={!url.trim()}>
            {!submitting && <DownloadCloud className="h-4 w-4" />} Download
          </Button>
        </div>
      </div>

      {/* Queue */}
      <div>
        <h3 className="text-lg font-semibold text-slate-100 mb-3">Queue &amp; History</h3>
        {downloads.length === 0 ? (
          <div className="glass-card py-16 text-center text-sm text-slate-500">
            No downloads yet — paste a link above to begin.
          </div>
        ) : (
          <div className="space-y-2">
            {downloads.map((d) => (
              <DownloadRow key={d.id} d={d} onAct={act} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DownloadRow({
  d,
  onAct,
}: {
  d: DownloadJob;
  onAct: (id: string, kind: "retry" | "delete") => void;
}) {
  const statusMeta: Record<string, { variant: any; label: string }> = {
    queued: { variant: "amber", label: "Queued" },
    downloading: { variant: "blue", label: "Downloading" },
    completed: { variant: "emerald", label: "Completed" },
    failed: { variant: "red", label: "Failed" },
    canceled: { variant: "default", label: "Canceled" },
  };
  const meta = statusMeta[d.status] || statusMeta.queued;

  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-4">
        <div className="w-24 aspect-video rounded-lg overflow-hidden bg-navy-800 flex-shrink-0 flex items-center justify-center">
          {d.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={d.thumbnail} alt="" className="w-full h-full object-cover" />
          ) : d.mediaType === "audio" ? (
            <Music className="h-6 w-6 text-slate-600" />
          ) : (
            <Video className="h-6 w-6 text-slate-600" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-slate-200 truncate">{d.title}</p>
            <Badge variant={meta.variant} size="sm">{meta.label}</Badge>
          </div>
          <p className="text-xs text-slate-500 truncate mt-0.5 capitalize">
            {d.platform} · {d.mediaType}
          </p>

          {d.status === "downloading" && (
            <div className="mt-2">
              <div className="h-1.5 rounded-full bg-navy-700 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-accent-blue to-accent-purple transition-all"
                  style={{ width: `${d.progress}%` }}
                />
              </div>
              <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500 tabular-nums">
                <span>{d.progress.toFixed(1)}%</span>
                {d.speed && <span>{d.speed}</span>}
                {d.eta && <span>ETA {d.eta}</span>}
              </div>
            </div>
          )}

          {d.status === "failed" && d.error && (
            <p className="mt-1 text-[11px] text-red-400 line-clamp-2">{d.error}</p>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {d.status === "completed" && d.libraryId && (
            <Link
              href={`/watch/${d.libraryId}`}
              className="p-2 rounded-lg text-accent-blue hover:bg-navy-700/50"
              title="Play"
            >
              <Play className="h-4 w-4" />
            </Link>
          )}
          {(d.status === "failed" || d.status === "canceled") && (
            <button
              onClick={() => onAct(d.id, "retry")}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-navy-700/50"
              title="Retry"
            >
              <RotateCw className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => onAct(d.id, "delete")}
            className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-navy-700/50"
            title={d.status === "downloading" ? "Cancel" : "Remove"}
          >
            {d.status === "downloading" ? <X className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
