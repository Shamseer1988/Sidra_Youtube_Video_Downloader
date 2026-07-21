"use client";

import { PageHeader } from "@/components/layout/page-header";
import { CategoryExplorer } from "@/components/media/category-explorer";

export default function MusicPage() {
  return (
    <div className="mx-auto max-w-[1600px] space-y-5">
      <PageHeader title="Music" subtitle="Your music libraries and playlists" />
      <CategoryExplorer category="music" />
    </div>
  );
}
