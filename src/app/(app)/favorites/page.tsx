import { Suspense } from "react";
import { LibraryBrowser } from "@/components/media/library-browser";

export default function FavoritesPage() {
  return (
    <Suspense>
      <LibraryBrowser
        title="Favorites"
        base={{ filter: "favorites" }}
        emptyText="No favorites yet. Tap the heart on any video or track to save it here."
      />
    </Suspense>
  );
}
