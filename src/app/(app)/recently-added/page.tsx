"use client";

import { Suspense } from "react";
import { movies, tvShows } from "@/lib/mock-data";
import { PageHeader } from "@/components/layout/page-header";
import { MediaLibrary } from "@/components/media/media-library";
import { Skeleton } from "@/components/ui/skeleton";

const recentlyAdded = [...movies, ...tvShows]
  .sort((a, b) => b.year - a.year)
  .slice(0, 14);

export default function RecentlyAddedPage() {
  return (
    <div className="mx-auto max-w-[1600px] space-y-5">
      <PageHeader
        title="Recently Added"
        subtitle="The newest arrivals across movies, shows and music"
      />
      <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
        <MediaLibrary items={recentlyAdded} searchPlaceholder="Search recent items…" />
      </Suspense>
    </div>
  );
}
