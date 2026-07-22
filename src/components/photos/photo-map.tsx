"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { Loader2, MapPin } from "lucide-react";
import { usePhotoMap, type MapPhoto } from "@/hooks/use-photos";
import { PhotoLightbox } from "@/components/photos/photo-lightbox";
import type { PhotoItem } from "@/lib/types";

// Minimal PhotoItem from map data — enough for the lightbox to render.
function toItem(p: MapPhoto): PhotoItem {
  return {
    id: p.id, filename: p.filename, folder: "", ext: null, size: 0,
    width: null, height: null, takenAt: null, camera: null, lens: null,
    iso: null, fNumber: null, focalLength: null, exposure: null,
    gpsLat: p.lat, gpsLng: p.lng, favorite: false, archived: false,
    hidden: false, rating: 0, hasThumbnail: true,
  };
}

/** Interactive map of geotagged photos (Leaflet + OpenStreetMap tiles). */
export function PhotoMap() {
  const { data: photos = [], isLoading } = usePhotoMap(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const items = useMemo(() => photos.map(toItem), [photos]);
  const indexById = useMemo(() => new Map(photos.map((p, i) => [p.id, i])), [photos]);
  const openRef = useRef<(id: string) => void>(() => {});
  openRef.current = (id) => {
    const i = indexById.get(id);
    if (i !== undefined) setOpenIndex(i);
  };

  useEffect(() => {
    if (!containerRef.current || photos.length === 0) return;
    let cancelled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let map: any;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current) return;

      map = L.map(containerRef.current).setView([photos[0].lat, photos[0].lng], 4);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      const group = L.featureGroup();
      for (const p of photos) {
        const marker = L.circleMarker([p.lat, p.lng], {
          radius: 6, color: "#8b5cf6", fillColor: "#8b5cf6", fillOpacity: 0.85, weight: 2,
        });
        marker.on("click", () => openRef.current(p.id));
        marker.bindTooltip(p.filename, { direction: "top" });
        marker.addTo(group);
      }
      group.addTo(map);
      if (photos.length > 1) map.fitBounds(group.getBounds().pad(0.2));
    })();

    return () => {
      cancelled = true;
      if (map) map.remove();
    };
  }, [photos]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="glass-card flex flex-col items-center py-20 text-center">
        <MapPin className="mb-3 h-9 w-9 text-muted-2" />
        <p className="text-base font-semibold text-foreground">No geotagged photos</p>
        <p className="mt-1 max-w-sm text-sm text-muted">Photos with GPS EXIF data appear here on the map.</p>
      </div>
    );
  }

  return (
    <>
      <div
        ref={containerRef}
        className="h-[72vh] w-full overflow-hidden rounded-2xl border border-stroke"
        style={{ background: "#0b1020" }}
      />
      {openIndex !== null && (
        <PhotoLightbox
          photos={items}
          index={openIndex}
          onClose={() => setOpenIndex(null)}
          onIndexChange={setOpenIndex}
        />
      )}
    </>
  );
}
