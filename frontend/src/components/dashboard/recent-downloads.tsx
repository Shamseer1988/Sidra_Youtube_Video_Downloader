"use client";

import React from "react";
import Link from "next/link";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useDownloads } from "@/hooks/use-downloads";
import { formatBytes, truncate, getStatusColor } from "@/lib/utils";
import type { Download, Platform, DownloadStatus } from "@/types";
import {
  Youtube,
  Video,
  Instagram,
  Facebook,
  Twitter,
  Globe,
  Clock,
  ExternalLink,
} from "lucide-react";

// Platform icon mapping
const platformIcons: Record<Platform, { icon: React.ElementType; color: string }> = {
  youtube: { icon: Youtube, color: "text-red-500" },
  vimeo: { icon: Video, color: "text-blue-400" },
  instagram: { icon: Instagram, color: "text-pink-500" },
  facebook: { icon: Facebook, color: "text-blue-500" },
  twitter: { icon: Twitter, color: "text-sky-400" },
  tiktok: { icon: Video, color: "text-slate-300" },
  other: { icon: Globe, color: "text-slate-400" },
};

// Status badge variant mapping
const statusVariants: Record<DownloadStatus, "blue" | "emerald" | "red" | "amber" | "purple" | "default"> = {
  pending: "amber",
  downloading: "blue",
  processing: "purple",
  completed: "emerald",
  failed: "red",
  cancelled: "default",
};

function DownloadRow({ download }: { download: Download }) {
  const platformInfo = platformIcons[download.platform] || platformIcons.other;
  const PlatformIcon = platformInfo.icon;

  return (
    <TableRow className="group cursor-pointer">
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <PlatformIcon className={`h-4 w-4 ${platformInfo.color}`} />
          </div>
          <Link
            href={`/downloads/${download.id}`}
            className="text-sm font-medium text-slate-200 group-hover:text-accent-blue transition-colors truncate max-w-[280px] block"
            title={download.title}
          >
            {truncate(download.title, 40)}
          </Link>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={statusVariants[download.status]} size="sm">
          {download.status === "downloading" && (
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-400" />
            </span>
          )}
          {download.status}
        </Badge>
      </TableCell>
      <TableCell>
        <span className="text-xs text-slate-400 uppercase font-medium">
          {download.format || download.mediaType}
        </span>
      </TableCell>
      <TableCell>
        <span className="text-sm text-slate-300 tabular-nums">
          {download.fileSize ? formatBytes(download.fileSize) : "—"}
        </span>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1.5 text-slate-500">
          <Clock className="h-3 w-3" />
          <span className="text-xs">
            {new Date(download.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </TableCell>
      <TableCell>
        <Link
          href={`/downloads/${download.id}`}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <ExternalLink className="h-4 w-4 text-slate-400 hover:text-accent-blue transition-colors" />
        </Link>
      </TableCell>
    </TableRow>
  );
}

function RecentDownloadsSkeleton() {
  return (
    <div className="space-y-0">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-4 py-3 border-b border-slate-700/20"
        >
          <Skeleton variant="circular" className="w-5 h-5 flex-shrink-0" />
          <Skeleton className="flex-1 h-4" />
          <Skeleton className="w-20 h-5" />
          <Skeleton className="w-12 h-4" />
          <Skeleton className="w-16 h-4" />
          <Skeleton className="w-24 h-4" />
        </div>
      ))}
    </div>
  );
}

export function RecentDownloads() {
  const { data, isLoading, isError } = useDownloads({
    page: 1,
    pageSize: 8,
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  const downloads = data?.data?.items ?? [];

  return (
    <div className="glass-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/30">
        <div>
          <h3 className="text-lg font-semibold text-slate-100">
            Recent Downloads
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Latest activity</p>
        </div>
        <Link
          href="/downloads"
          className="text-xs font-medium text-accent-blue hover:text-blue-300 transition-colors flex items-center gap-1"
        >
          View all
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      {/* Table content */}
      {isLoading ? (
        <RecentDownloadsSkeleton />
      ) : isError ? (
        <div className="px-6 py-12 text-center">
          <p className="text-sm text-slate-400">
            Failed to load recent downloads
          </p>
        </div>
      ) : downloads.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <Video className="h-10 w-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-400">No downloads yet</p>
          <p className="text-xs text-slate-500 mt-1">
            Start by pasting a video URL above
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Format</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {downloads.map((download: Download) => (
              <DownloadRow key={download.id} download={download} />
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
