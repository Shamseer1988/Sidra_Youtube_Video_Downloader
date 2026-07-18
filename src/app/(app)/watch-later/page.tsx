import { Suspense } from "react";
import { LibraryBrowser } from "@/components/media/library-browser";

export default function WatchLaterPage() {
  return (
    <Suspense>
      <LibraryBrowser
        title="Watch Later"
        base={{ filter: "watchLater" }}
        emptyText="Nothing saved for later. Use the ⋯ menu on any item to add it."
      />
    </Suspense>
  );
}
