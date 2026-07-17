"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  Grid3X3,
  List,
  Search,
  Play,
  Clock,
  HardDrive,
  Calendar,
  Film,
  SortAsc,
  Eye,
} from "lucide-react";
import { useVideos } from "@/hooks/use-media";
import { VideoPlayer } from "@/components/media/video-player";
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
  { value: "duration", label: "Duration" },
];

function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

export default function VideosPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedVideo, setSelectedVideo] = useState<MediaFile | null>(null);

  const debouncedSearch = useDebounce(searchQuery, 300);

  const { data, isLoading } = useVideos({
    search: debouncedSearch || undefined,
    sort: sortBy,
  });

  const videos = useMemo(() => {
    const items = data?.data?.items ?? [];
    let filtered = items;

    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      filtered = filtered.filter((v) => v.name.toLowerCase().includes(q));
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
        case "duration":
          return (b.duration ?? 0) - (a.duration ?? 0);
        default:
          return 0;
      }
    });

    return sorted;
  }, [data, debouncedSearch, sortBy]);

  const totalCount = data?.data?.total ?? videos.length;

  const handlePlay = useCallback((video: MediaFile) => {
    setSelectedVideo(video);
  }, []);

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
          <h1 className="text-2xl font-bold gradient-text">Video Library</h1>
          <p className="text-sm text-slate-400 mt-1">
            Browse and play your downloaded videos
          </p>
        </div>
        {!isLoading && (
          <Badge variant="blue" size="lg">
            <Film className="h-3.5 w-3.5" />
            {totalCount} videos
          </Badge>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="flex-1">
          <Input
            placeholder="Search videos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={<Search className="h-4 w-4" />}
          />
        </div>
        <div className="flex items-center gap-2">
          <Select
            options={SORT_OPTIONS}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-36"
          />
          <div className="flex items-center rounded-lg border border-slate-600/30 overflow-hidden">
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "p-2 transition-colors",
                viewMode === "grid"
                  ? "bg-accent-blue/20 text-accent-blue"
                  : "text-slate-400 hover:text-slate-200 hover:bg-navy-700/50"
              )}
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "p-2 transition-colors",
                viewMode === "list"
                  ? "bg-accent-blue/20 text-accent-blue"
                  : "text-slate-400 hover:text-slate-200 hover:bg-navy-700/50"
              )}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div
          className={cn(
            viewMode === "grid"
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
              : "space-y-3"
          )}
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="glass-card overflow-hidden">
              <Skeleton
                variant="rectangular"
                className={viewMode === "grid" ? "h-40 rounded-none" : "h-16"}
              />
              <div className="p-4 space-y-2">
                <Skeleton className="w-3/4 h-4" />
                <Skeleton className="w-1/2 h-3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && videos.length === 0 && (
        <div className="glass-card p-16 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-700/30 flex items-center justify-center mb-4">
            <Film className="h-8 w-8 text-slate-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-300 mb-2">
            No videos found
          </h3>
          <p className="text-sm text-slate-500 max-w-sm">
            {searchQuery
              ? "Try adjusting your search terms"
              : "Download some videos to see them here"}
          </p>
        </div>
      )}

      {/* Grid View */}
      {!isLoading && videos.length > 0 && viewMode === "grid" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {videos.map((video) => (
            <button
              key={video.path}
              onClick={() => handlePlay(video)}
              className="glass-card overflow-hidden group cursor-pointer text-left hover:border-slate-600/50 hover:shadow-lg hover:shadow-accent-blue/5 hover:-translate-y-0.5 transition-all duration-300"
            >
              {/* Thumbnail */}
              <div className="relative aspect-video bg-navy-800 overflow-hidden">
                {video.thumbnail ? (
                  <img
                    src={video.thumbnail}
                    alt={video.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-navy-800 to-navy-900">
                    <Film className="h-10 w-10 text-slate-600" />
                  </div>
                )}

                {/* Duration badge */}
                {video.duration != null && (
                  <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/70 text-white text-[11px] font-medium tabular-nums backdrop-blur-sm">
                    {formatDuration(video.duration)}
                  </div>
                )}

                {/* Resolution badge */}
                {video.resolution && (
                  <div className="absolute top-2 left-2">
                    <Badge variant="blue" size="sm">
                      {video.resolution}
                    </Badge>
                  </div>
                )}

                {/* Play overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all duration-300">
                    <Play className="h-6 w-6 text-white ml-0.5" />
                  </div>
                </div>
              </div>

              {/* Info */}
              <div className="p-3 space-y-2">
                <h3 className="text-sm font-medium text-slate-200 line-clamp-2 leading-snug">
                  {video.name}
                </h3>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <HardDrive className="h-3 w-3" />
                    {formatBytes(video.size)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(video.createdAt)}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* List View */}
      {!isLoading && videos.length > 0 && viewMode === "list" && (
        <div className="glass-card overflow-hidden divide-y divide-slate-700/20">
          {videos.map((video) => (
            <button
              key={video.path}
              onClick={() => handlePlay(video)}
              className="w-full flex items-center gap-4 p-3 hover:bg-navy-700/30 transition-colors group text-left"
            >
              {/* Thumbnail */}
              <div className="relative w-28 aspect-video rounded-lg overflow-hidden flex-shrink-0 bg-navy-800">
                {video.thumbnail ? (
                  <img
                    src={video.thumbnail}
                    alt={video.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Film className="h-5 w-5 text-slate-600" />
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
                  <Play className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-slate-200 truncate">
                  {video.name}
                </h3>
                <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                  {video.duration != null && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDuration(video.duration)}
                    </span>
                  )}
                  {video.resolution && (
                    <Badge variant="blue" size="sm">
                      {video.resolution}
                    </Badge>
                  )}
                  <span className="flex items-center gap-1">
                    <HardDrive className="h-3 w-3" />
                    {formatBytes(video.size)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(video.createdAt)}
                  </span>
                </div>
              </div>

              {/* Play button */}
              <div className="flex-shrink-0">
                <div className="w-9 h-9 rounded-full border border-slate-600/30 flex items-center justify-center text-slate-400 group-hover:border-accent-blue/50 group-hover:text-accent-blue group-hover:bg-accent-blue/10 transition-all">
                  <Play className="h-4 w-4 ml-0.5" />
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Video Player Modal */}
      {selectedVideo && (
        <VideoPlayer
          src={`/api/media/stream/${encodeURIComponent(selectedVideo.path)}`}
          title={selectedVideo.name}
          isOpen={!!selectedVideo}
          onClose={() => setSelectedVideo(null)}
        />
      )}
    </div>
  );
}
