"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { usePhotos } from "@/hooks/use-photos";
import { apiSend } from "@/lib/client-api";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PhotoItem } from "@/lib/types";

/** Full-screen multi-select picker to add photos to an album. */
export function PhotoPickerModal({
  albumId,
  onClose,
  onAdded,
}: {
  albumId: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const toast = useToast();
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = usePhotos();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const photos: PhotoItem[] = useMemo(() => (data?.pages ?? []).flatMap((p) => p.photos), [data]);

  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage();
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function add() {
    if (selected.size === 0) return;
    setSaving(true);
    try {
      await apiSend("POST", `/api/albums/${albumId}/photos`, { photoIds: [...selected] });
      toast(`Added ${selected.size} photo${selected.size === 1 ? "" : "s"}`, "success");
      onAdded();
      onClose();
    } catch (e) {
      toast((e as Error).message || "Could not add", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[105] flex flex-col bg-navy-900/95 backdrop-blur">
      <div className="flex items-center justify-between border-b border-stroke p-4">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="h-5 w-5" />
          </button>
          <h3 className="text-base font-semibold text-foreground">
            {selected.size ? `${selected.size} selected` : "Select photos"}
          </h3>
        </div>
        <Button size="sm" onClick={add} isLoading={saving} disabled={selected.size === 0}>
          Add to album
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-9">
              {photos.map((p) => {
                const on = selected.has(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => toggle(p.id)}
                    className={cn(
                      "relative aspect-square overflow-hidden rounded-lg bg-surface-2 ring-2 transition-all",
                      on ? "ring-primary" : "ring-transparent",
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/photos/${p.id}/thumbnail?size=200`}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                    {on && (
                      <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <div ref={sentinel} className="h-10" />
            {isFetchingNextPage && (
              <div className="flex justify-center py-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
