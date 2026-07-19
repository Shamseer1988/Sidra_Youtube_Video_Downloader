"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Search, RefreshCw } from "lucide-react";
import { apiGet, apiSend } from "@/lib/client-api";
import { MediaGrid } from "./media-grid";
import { useToast } from "@/components/providers/toast-provider";
import { cn } from "@/lib/utils";
import type { LibraryItem } from "@/lib/types";

interface Params {
  type?: "video" | "audio";
  filter?: "favorites" | "watchLater";
  sort?: string;
}

export function LibraryBrowser({
  title,
  base,
  showSourceFilter = false,
  showScan = false,
  emptyText,
}: {
  title: string;
  base: Params;
  showSourceFilter?: boolean;
  showScan?: boolean;
  emptyText?: string;
}) {
  const toast = useToast();
  const urlQ = useSearchParams().get("q") || "";
  const [q, setQ] = useState(urlQ);
  const [source, setSource] = useState<"" | "download" | "nas">("");
  const [sort, setSort] = useState(base.sort || "recent");
  const [scanning, setScanning] = useState(false);

  const query = new URLSearchParams();
  if (base.type) query.set("type", base.type);
  if (base.filter) query.set("filter", base.filter);
  if (source) query.set("source", source);
  if (q.trim()) query.set("q", q.trim());
  query.set("sort", sort);

  const { data: items = [], isLoading, refetch } = useQuery({
    queryKey: ["library", query.toString()],
    queryFn: () => apiGet<LibraryItem[]>(`/api/library?${query.toString()}`),
  });

  async function scan() {
    setScanning(true);
    try {
      const res = await apiSend<{ added: number; removed: number }>("POST", "/api/library/scan");
      toast(`Scan complete — ${res.added} added, ${res.removed} removed`, "success");
      refetch();
    } catch {
      toast("Scan failed", "error");
    } finally {
      setScanning(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-100">{title}</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search…"
              className="h-9 w-40 sm:w-56 pl-9 pr-3 rounded-lg bg-navy-800/80 border border-slate-600/30 text-sm text-slate-200 placeholder-slate-500 focus:border-accent-blue/50 focus:outline-none"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="h-9 px-3 rounded-lg bg-navy-800/80 border border-slate-600/30 text-sm text-slate-300 focus:outline-none"
          >
            <option value="recent">Recently modified</option>
            <option value="added">Recently added</option>
            <option value="title">Title A–Z</option>
            <option value="size">Largest</option>
          </select>
          {showScan && (
            <button
              onClick={scan}
              disabled={scanning}
              className="h-9 px-3 rounded-lg bg-navy-800/80 border border-slate-600/30 text-sm text-slate-300 hover:text-foreground flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={cn("h-4 w-4", scanning && "animate-spin")} />
              <span className="hidden sm:inline">Scan</span>
            </button>
          )}
        </div>
      </div>

      {showSourceFilter && (
        <div className="flex gap-2">
          {[
            { v: "", label: "All" },
            { v: "download", label: "Downloaded" },
            { v: "nas", label: "Library" },
          ].map((opt) => (
            <button
              key={opt.v}
              onClick={() => setSource(opt.v as any)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm border transition-colors",
                source === opt.v
                  ? "bg-accent-blue/20 border-accent-blue/40 text-accent-blue"
                  : "bg-navy-800/60 border-slate-700/40 text-slate-400 hover:text-slate-200",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      <MediaGrid items={items} loading={isLoading} emptyText={emptyText} />
    </div>
  );
}
