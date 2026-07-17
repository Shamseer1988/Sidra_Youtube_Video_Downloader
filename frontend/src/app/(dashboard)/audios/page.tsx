"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  Search,
  Play,
  Pause,
  Clock,
  HardDrive,
  Calendar,
  Music,
  Disc3,
} from "lucide-react";
import { useAudios } from "@/hooks/use-media";
import { useAudioPlayerStore } from "@/components/media/audio-player";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatBytes, formatDuration } from "@/lib/utils";
import type { MediaFile } from "@/types";

const SORT_OPTIONS = [
  { value: "name", label: "Name" },
  { value: "date", label: "Date" },
  { value: "size", label: "Size" },
];

function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

const FORMAT_BADGES: Record<string, "blue" | "purple" | "emerald" | "amber" | "default"> = {
  mp3: "blue",
  flac: "purple",
  wav: "emerald",
  aac: "amber",
  ogg: "default",
  m4a: "sky" as "blue",
  wma: "default",
};

export default function AudiosPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("date");

  const debouncedSearch = useDebounce(searchQuery, 300);

  const { data, isLoading } = useAudios({
    search: debouncedSearch || undefined,
    sort: sortBy,
  });

  const { currentTrack, isPlaying, play, pause, resume } =
    useAudioPlayerStore();

  const audios = useMemo(() => {
    const items = data?.data?.items ?? [];
    let filtered = items;

    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      filtered = filtered.filter((a) => a.name.toLowerCase().includes(q));
    }

    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "date":
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        case "size":
          return b.size - a.size;
        default:
          return 0;
      }
    });

    return sorted;
  }, [data, debouncedSearch, sortBy]);

  const totalCount = data?.data?.total ?? audios.length;

  const handlePlay = useCallback(
    (audio: MediaFile) => {
      const trackSrc = `/api/media/stream/${encodeURIComponent(audio.path)}`;

      if (currentTrack?.src === trackSrc) {
        if (isPlaying) {
          pause();
        } else {
          resume();
        }
      } else {
        play({
          src: trackSrc,
          title: audio.name,
        });
      }
    },
    [currentTrack, isPlaying, play, pause, resume]
  );

  const isCurrentlyPlaying = useCallback(
    (audio: MediaFile) => {
      const trackSrc = `/api/media/stream/${encodeURIComponent(audio.path)}`;
      return currentTrack?.src === trackSrc && isPlaying;
    },
    [currentTrack, isPlaying]
  );

  const isCurrentTrack = useCallback(
    (audio: MediaFile) => {
      const trackSrc = `/api/media/stream/${encodeURIComponent(audio.path)}`;
      return currentTrack?.src === trackSrc;
    },
    [currentTrack]
  );

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold gradient-text">Audio Library</h1>
          <p className="text-sm text-slate-400 mt-1">
            Browse and play your downloaded audio files
          </p>
        </div>
        {!isLoading && (
          <Badge variant="purple" size="lg">
            <Music className="h-3.5 w-3.5" />
            {totalCount} tracks
          </Badge>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="flex-1">
          <Input
            placeholder="Search audio files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={<Search className="h-4 w-4" />}
          />
        </div>
        <Select
          options={SORT_OPTIONS}
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="w-36"
        />
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-card p-4 flex items-center gap-4">
              <Skeleton variant="circular" className="w-12 h-12" />
              <div className="flex-1 space-y-2">
                <Skeleton className="w-1/3 h-4" />
                <Skeleton className="w-1/4 h-3" />
              </div>
              <Skeleton variant="circular" className="w-9 h-9" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && audios.length === 0 && (
        <div className="glass-card p-16 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-700/30 flex items-center justify-center mb-4">
            <Music className="h-8 w-8 text-slate-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-300 mb-2">
            No audio files found
          </h3>
          <p className="text-sm text-slate-500 max-w-sm">
            {searchQuery
              ? "Try adjusting your search terms"
              : "Download some audio to see them here"}
          </p>
        </div>
      )}

      {/* Audio list */}
      {!isLoading && audios.length > 0 && (
        <div className="space-y-2">
          {audios.map((audio, index) => {
            const playing = isCurrentlyPlaying(audio);
            const active = isCurrentTrack(audio);

            return (
              <div
                key={audio.path}
                className={cn(
                  "glass-card p-4 flex items-center gap-4 group cursor-pointer transition-all duration-300 hover:border-slate-600/50",
                  active &&
                    "border-accent-blue/30 bg-accent-blue/5 shadow-lg shadow-accent-blue/5"
                )}
                onClick={() => handlePlay(audio)}
              >
                {/* Index / Icon */}
                <div className="relative w-12 h-12 flex-shrink-0">
                  <div
                    className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300",
                      active
                        ? "bg-gradient-to-br from-accent-blue to-accent-purple"
                        : "bg-gradient-to-br from-slate-700/50 to-slate-800/50 group-hover:from-accent-blue/20 group-hover:to-accent-purple/20"
                    )}
                  >
                    {playing ? (
                      <div className="flex items-end gap-0.5 h-4">
                        <div className="w-1 bg-white rounded-full animate-[bounce_0.6s_ease-in-out_infinite]" style={{ height: "60%", animationDelay: "0ms" }} />
                        <div className="w-1 bg-white rounded-full animate-[bounce_0.6s_ease-in-out_infinite]" style={{ height: "100%", animationDelay: "150ms" }} />
                        <div className="w-1 bg-white rounded-full animate-[bounce_0.6s_ease-in-out_infinite]" style={{ height: "40%", animationDelay: "300ms" }} />
                        <div className="w-1 bg-white rounded-full animate-[bounce_0.6s_ease-in-out_infinite]" style={{ height: "80%", animationDelay: "450ms" }} />
                      </div>
                    ) : (
                      <Music
                        className={cn(
                          "h-5 w-5",
                          active ? "text-white" : "text-slate-400"
                        )}
                      />
                    )}
                  </div>
                </div>

                {/* Track info */}
                <div className="flex-1 min-w-0">
                  <h3
                    className={cn(
                      "text-sm font-medium truncate",
                      active ? "text-accent-blue" : "text-slate-200"
                    )}
                  >
                    {audio.name}
                  </h3>
                  <div className="flex items-center gap-3 mt-1">
                    <Badge
                      variant={
                        FORMAT_BADGES[audio.extension?.toLowerCase()] ||
                        "default"
                      }
                      size="sm"
                    >
                      {audio.extension?.toUpperCase() || "AUDIO"}
                    </Badge>
                    {audio.duration != null && (
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDuration(audio.duration)}
                      </span>
                    )}
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <HardDrive className="h-3 w-3" />
                      {formatBytes(audio.size)}
                    </span>
                    <span className="text-xs text-slate-500 flex items-center gap-1 hidden sm:flex">
                      <Calendar className="h-3 w-3" />
                      {formatDate(audio.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Play button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlay(audio);
                  }}
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200",
                    active
                      ? "bg-accent-blue text-white shadow-lg shadow-accent-blue/30"
                      : "border border-slate-600/30 text-slate-400 hover:border-accent-blue/50 hover:text-accent-blue hover:bg-accent-blue/10"
                  )}
                >
                  {playing ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4 ml-0.5" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
