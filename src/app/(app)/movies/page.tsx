"use client";

import { PageHeader } from "@/components/layout/page-header";
import { CategoryExplorer } from "@/components/media/category-explorer";

export default function MoviesPage() {
  return (
    <div className="mx-auto max-w-[1600px] space-y-5">
      <PageHeader title="Movies" subtitle="Your movie libraries, organized by folder" />
      <CategoryExplorer category="movies" />
    </div>
  );
}
