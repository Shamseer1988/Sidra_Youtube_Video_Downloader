import { Suspense } from "react";
import { LibraryBrowser } from "@/components/media/library-browser";

export default function MusicPage() {
  return (
    <Suspense>
      <LibraryBrowser
        title="Music"
        base={{ type: "audio" }}
        showSourceFilter
        showScan
        emptyText="No audio found. Download some audio or point MEDIA_AUDIO_PATH at your NAS music folder and run a scan."
      />
    </Suspense>
  );
}
