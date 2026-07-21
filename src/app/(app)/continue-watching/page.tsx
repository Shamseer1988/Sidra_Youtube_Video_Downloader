import { Suspense } from "react";
import { LibraryBrowser } from "@/components/media/library-browser";

export default function ContinueWatchingPage() {
  return (
    <Suspense>
      <LibraryBrowser
        title="Continue Watching"
        base={{ filter: "continue" }}
        emptyText="Nothing in progress. Start a video and your resume point will appear here."
      />
    </Suspense>
  );
}
