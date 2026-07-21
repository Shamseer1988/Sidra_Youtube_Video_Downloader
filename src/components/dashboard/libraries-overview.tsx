"use client";

import { memo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, FolderPlus, Library } from "lucide-react";
import { useLibraries } from "@/hooks/use-library";
import { categoryIcon } from "@/lib/categories";
import { Skeleton } from "@/components/ui/skeleton";

const categoryHref: Record<string, string> = {
  movies: "/movies",
  tv: "/tv-shows",
  videos: "/videos",
  music: "/music",
};

/** Real libraries the user has configured, as quick-access cards. */
export const LibrariesOverview = memo(function LibrariesOverview() {
  const { data: libraries = [], isLoading } = useLibraries();

  return (
    <section aria-label="Your libraries" className="glass-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Library className="h-4 w-4 text-primary" /> Your Libraries
        </h2>
        <Link
          href="/settings"
          className="rounded-lg border border-stroke px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-primary/40 hover:text-foreground"
        >
          Manage
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : libraries.length === 0 ? (
        <Link
          href="/settings"
          className="flex items-center gap-3 rounded-2xl border border-dashed border-stroke bg-surface-2/40 p-5 transition-colors hover:border-primary/40"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/12 text-primary">
            <FolderPlus className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">Add your first library</p>
            <p className="text-xs text-muted-2">
              Assign a NAS folder in Settings — e.g. tag /media/videos/Movies as Movies.
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-2" />
        </Link>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {libraries.map((lib, i) => {
            const Icon = categoryIcon[lib.category] ?? Library;
            return (
              <motion.div
                key={lib.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link
                  href={categoryHref[lib.category] ?? "/videos"}
                  className="group flex h-full flex-col gap-3 rounded-2xl border border-stroke bg-surface-2/60 p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/12 text-primary transition-transform group-hover:scale-110">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="truncate text-sm font-semibold text-foreground">{lib.name}</p>
                    <p className="text-[11px] capitalize text-muted-2">
                      {lib.category} · {lib.itemCount} item{lib.itemCount === 1 ? "" : "s"}
                    </p>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </section>
  );
});
