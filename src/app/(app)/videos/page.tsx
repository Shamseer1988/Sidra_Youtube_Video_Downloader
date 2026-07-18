import { Suspense } from "react";
import { LibraryBrowser } from "@/components/media/library-browser";

export default function VideosPage() {
  return (
    <Suspense>
      <LibraryBrowser
        title="Videos"
        base={{ type: "video" }}
        showSourceFilter
        showScan
        emptyText="No videos found. Add a download or point MEDIA_VIDEO_PATH at your NAS folder and run a scan."
      />
    </Suspense>
  );
}
