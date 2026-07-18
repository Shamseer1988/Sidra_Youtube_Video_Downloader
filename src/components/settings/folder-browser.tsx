"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Folder, ArrowUp, Check, Loader2, HardDrive } from "lucide-react";
import { apiGet } from "@/lib/client-api";

interface BrowseData {
  current: string;
  parent: string | null;
  dirs: { name: string; path: string }[];
}

// Modal for picking a folder on the server (admin only).
export function FolderBrowserModal({
  title,
  startPath = "/",
  onSelect,
  onClose,
}: {
  title: string;
  startPath?: string;
  onSelect: (path: string) => void;
  onClose: () => void;
}) {
  const [path, setPath] = useState(startPath);
  const [manual, setManual] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["browse", path],
    queryFn: () => apiGet<BrowseData>(`/api/folders/browse?path=${encodeURIComponent(path)}`),
    retry: false,
  });

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-navy-950/80 p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="glass-card w-full sm:max-w-lg max-h-[85vh] flex flex-col rounded-b-none sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/30">
          <h3 className="text-base font-semibold text-slate-100">{title}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Current path */}
        <div className="px-5 py-3 border-b border-slate-700/20 flex items-center gap-2">
          <HardDrive className="h-4 w-4 text-slate-500 flex-shrink-0" />
          <code className="text-xs text-accent-blue truncate flex-1">{data?.current ?? path}</code>
        </div>

        {/* Directory list */}
        <div className="flex-1 overflow-y-auto min-h-[240px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-accent-blue" />
            </div>
          ) : isError ? (
            <p className="text-sm text-red-400 text-center py-10">Cannot read this directory.</p>
          ) : (
            <div className="divide-y divide-slate-700/10">
              {data?.parent && (
                <button
                  onClick={() => setPath(data.parent!)}
                  className="w-full flex items-center gap-3 px-5 py-3 text-sm text-slate-400 hover:bg-navy-700/40"
                >
                  <ArrowUp className="h-4 w-4" /> ..
                </button>
              )}
              {data?.dirs.map((d) => (
                <button
                  key={d.path}
                  onClick={() => setPath(d.path)}
                  className="w-full flex items-center gap-3 px-5 py-3 text-sm text-slate-200 hover:bg-navy-700/40 text-left"
                >
                  <Folder className="h-4 w-4 text-accent-amber flex-shrink-0" />
                  <span className="truncate">{d.name}</span>
                </button>
              ))}
              {data && data.dirs.length === 0 && (
                <p className="text-xs text-slate-600 text-center py-8">No subfolders here.</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-700/30 space-y-3">
          <div className="flex gap-2">
            <input
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              placeholder="…or type a path directly"
              className="flex-1 h-10 px-3 rounded-lg bg-navy-900/70 border border-slate-600/30 text-sm text-slate-200 placeholder-slate-600 focus:border-accent-blue/50"
            />
          </div>
          <button
            onClick={() => onSelect(manual.trim() || data?.current || path)}
            className="w-full h-11 rounded-xl bg-gradient-to-r from-accent-blue to-accent-purple text-white text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-95"
          >
            <Check className="h-4 w-4" />
            Use {manual.trim() ? "typed path" : "this folder"}
          </button>
        </div>
      </div>
    </div>
  );
}
