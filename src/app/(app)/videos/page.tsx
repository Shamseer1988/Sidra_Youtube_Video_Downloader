"use client";

import { PageHeader } from "@/components/layout/page-header";
import { CategoryExplorer } from "@/components/media/category-explorer";

export default function VideosPage() {
  return (
    <div className="mx-auto max-w-[1600px] space-y-5">
      <PageHeader title="Videos" subtitle="Home videos, events and clips by folder" />
      <CategoryExplorer category="videos" />
    </div>
  );
}
