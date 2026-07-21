"use client";

import { PageHeader } from "@/components/layout/page-header";
import { CategoryExplorer } from "@/components/media/category-explorer";

export default function TvShowsPage() {
  return (
    <div className="mx-auto max-w-[1600px] space-y-5">
      <PageHeader title="TV Shows" subtitle="Series and episodes, browsed by folder" />
      <CategoryExplorer category="tv" />
    </div>
  );
}
