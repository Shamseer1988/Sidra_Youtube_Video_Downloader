"use client";

import { Suspense } from "react";
import { Upload } from "lucide-react";
import { movies } from "@/lib/mock-data";
import { PageHeader } from "@/components/layout/page-header";
import { MediaLibrary } from "@/components/media/media-library";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function MoviesPage() {
  return (
    <div className="mx-auto max-w-[1600px] space-y-5">
      <PageHeader
        title="Movies"
        subtitle={`${movies.length} films in your library`}
        actions={
          <Button variant="secondary" size="sm">
            <Upload className="h-4 w-4" /> Upload
          </Button>
        }
      />
      <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
        <MediaLibrary items={movies} searchPlaceholder="Search movies…" />
      </Suspense>
    </div>
  );
}
