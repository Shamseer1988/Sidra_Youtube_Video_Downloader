"use client";

import React, { useState, useEffect } from "react";
import { Folder, FolderPlus, ArrowLeft, Loader2, Check } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { MediaDirectory } from "@/types";

interface PathPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (path: string) => void;
  currentPath?: string;
  title?: string;
}

export function PathPicker({
  isOpen,
  onClose,
  onSelect,
  currentPath = "",
  title = "Select Folder",
}: PathPickerProps) {
  const [path, setPath] = useState(currentPath);
  const [loading, setLoading] = useState(false);
  const [directory, setDirectory] = useState<MediaDirectory | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPath(currentPath);
      loadDirectory(currentPath);
    }
  }, [isOpen, currentPath]);

  const loadDirectory = async (targetPath: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.browsePath(targetPath);
      if (res.success && res.data) {
        setDirectory(res.data);
        setPath(res.data.path);
      } else {
        setError(res.message || "Failed to load directory.");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load directory.");
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = (subPath: string) => {
    loadDirectory(subPath);
  };

  const handleGoUp = () => {
    if (!directory || !directory.path) return;
    // Simple parent directory calculation (works for windows/linux style paths)
    const parts = directory.path.split(/[/\\]/);
    if (parts.length <= 1) return;
    parts.pop();
    const parentPath = parts.join("/") || "/";
    loadDirectory(parentPath);
  };

  const handleSelect = () => {
    onSelect(path);
    onClose();
  };

  // Filter children to show directories only
  const directories = directory?.children?.filter(
    (child: any) => child.isDirectory || child.type === "directory"
  ) || [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description="Navigate server folders and select the destination path"
      size="md"
    >
      <div className="flex flex-col h-[50vh] bg-navy-900 text-slate-100 p-6">
        {/* Path breadcrumb bar */}
        <div className="flex items-center gap-2 mb-4 bg-navy-800/80 px-3 py-2.5 rounded-xl border border-slate-700/30">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleGoUp}
            disabled={loading || !path || path === "/" || path.endsWith(":\\")}
            className="h-8 w-8 p-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="text-xs font-mono truncate text-slate-300 flex-1">
            {path || "Root"}
          </div>
        </div>

        {/* Directory Contents */}
        <div className="flex-1 overflow-y-auto border border-slate-700/30 rounded-xl bg-navy-950/40 p-2 space-y-1 scrollbar-thin">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-2">
              <Loader2 className="h-6 w-6 text-accent-blue animate-spin" />
              <span className="text-xs text-slate-400">Scanning folders...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <p className="text-sm text-red-400 font-medium mb-1">Access Error</p>
              <p className="text-xs text-slate-500 max-w-xs">{error}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => loadDirectory(path)}
                className="mt-3 text-accent-blue hover:text-accent-blue/80"
              >
                Retry
              </Button>
            </div>
          ) : directories.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 p-4">
              <Folder className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-xs">No subfolders found here.</p>
            </div>
          ) : (
            directories.map((dir: any) => (
              <button
                key={dir.path}
                onClick={() => handleNavigate(dir.path)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-300 hover:text-slate-100 hover:bg-navy-800/60 transition-all text-left group"
              >
                <Folder className="h-4 w-4 text-accent-blue group-hover:scale-105 transition-transform" />
                <span className="text-sm truncate">{dir.name}</span>
              </button>
            ))
          )}
        </div>

        {/* Action Panel */}
        <div className="flex items-center justify-between gap-4 mt-6 pt-4 border-t border-slate-700/30">
          <div className="text-xs text-slate-400 truncate max-w-[200px]">
            Selected: <span className="font-mono text-slate-200">{path}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSelect}
              disabled={loading || !path}
              className="bg-gradient-to-r from-accent-blue to-accent-purple text-white gap-2"
            >
              <Check className="h-4 w-4" />
              Confirm Path
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
