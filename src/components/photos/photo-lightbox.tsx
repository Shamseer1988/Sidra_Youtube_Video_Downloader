"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft, ChevronRight, Download, FolderPlus, Heart, Info, Play, RotateCw, Trash2, X, ZoomIn, ZoomOut, MapPin,
} from "lucide-react";
import { cn, formatBytes } from "@/lib/utils";
import { apiSend } from "@/lib/client-api";
import type { PhotoItem } from "@/lib/types";

export function PhotoLightbox({
  photos,
  index,
  onClose,
  onIndexChange,
  onFavoriteChange,
  onAddToAlbum,
  onRemove,
  onSlideshow,
  removeLabel = "Remove",
}: {
  photos: PhotoItem[];
  index: number;
  onClose: () => void;
  onIndexChange: (next: number) => void;
  onFavoriteChange?: (id: string, favorite: boolean) => void;
  onAddToAlbum?: (photoId: string) => void;
  onRemove?: (photoId: string) => void;
  onSlideshow?: (index: number) => void;
  removeLabel?: string;
}) {
  const photo = photos[index];
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [showInfo, setShowInfo] = useState(false);
  const [fav, setFav] = useState(photo?.favorite ?? false);
  const drag = useRef<{ x: number; y: number } | null>(null);

  const reset = useCallback(() => {
    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
  }, []);

  const go = useCallback(
    (delta: number) => {
      const next = index + delta;
      if (next >= 0 && next < photos.length) {
        onIndexChange(next);
        reset();
      }
    },
    [index, photos.length, onIndexChange, reset],
  );

  useEffect(() => {
    setFav(photo?.favorite ?? false);
  }, [photo?.id, photo?.favorite]);

  const toggleFav = useCallback(async () => {
    if (!photo) return;
    const next = !fav;
    setFav(next);
    onFavoriteChange?.(photo.id, next);
    try {
      await apiSend("PATCH", `/api/photos/${photo.id}`, { favorite: next });
    } catch {
      setFav(!next);
    }
  }, [photo, fav, onFavoriteChange]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "Escape") onClose();
      else if (e.key === "f") toggleFav();
      else if (e.key === "r") setRotation((r) => (r + 90) % 360);
      else if (e.key === "i") setShowInfo((s) => !s);
      else if (e.key === "+" || e.key === "=") setZoom((z) => Math.min(4, z + 0.5));
      else if (e.key === "-") setZoom((z) => Math.max(1, z - 0.5));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, onClose, toggleFav]);

  if (!photo) return null;

  return (
    <div className="fixed inset-0 z-[100] flex bg-black/95 backdrop-blur-sm">
      {/* Main viewer */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        {/* Top bar */}
        <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-2 bg-gradient-to-b from-black/70 to-transparent p-3">
          <span className="truncate px-2 text-sm text-white/80">{photo.filename}</span>
          <div className="flex items-center gap-1">
            <IconBtn label="Zoom out" onClick={() => setZoom((z) => Math.max(1, z - 0.5))}><ZoomOut className="h-5 w-5" /></IconBtn>
            <IconBtn label="Zoom in" onClick={() => setZoom((z) => Math.min(4, z + 0.5))}><ZoomIn className="h-5 w-5" /></IconBtn>
            <IconBtn label="Rotate" onClick={() => setRotation((r) => (r + 90) % 360)}><RotateCw className="h-5 w-5" /></IconBtn>
            {onSlideshow && (
              <IconBtn label="Slideshow" onClick={() => onSlideshow(index)}><Play className="h-5 w-5" /></IconBtn>
            )}
            <IconBtn label="Favorite" onClick={toggleFav} active={fav}>
              <Heart className={cn("h-5 w-5", fav && "fill-current")} />
            </IconBtn>
            {onAddToAlbum && (
              <IconBtn label="Add to album" onClick={() => onAddToAlbum(photo.id)}>
                <FolderPlus className="h-5 w-5" />
              </IconBtn>
            )}
            {onRemove && (
              <IconBtn label={removeLabel} onClick={() => onRemove(photo.id)}>
                <Trash2 className="h-5 w-5" />
              </IconBtn>
            )}
            <a
              href={`/api/photos/${photo.id}/full?download=1`}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-white/80 hover:bg-white/10 hover:text-white"
              title="Download"
            >
              <Download className="h-5 w-5" />
            </a>
            <IconBtn label="Info" onClick={() => setShowInfo((s) => !s)} active={showInfo}><Info className="h-5 w-5" /></IconBtn>
            <IconBtn label="Close" onClick={onClose}><X className="h-5 w-5" /></IconBtn>
          </div>
        </div>

        {/* Prev / next */}
        {index > 0 && (
          <button
            onClick={() => go(-1)}
            aria-label="Previous"
            className="absolute left-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}
        {index < photos.length - 1 && (
          <button
            onClick={() => go(1)}
            aria-label="Next"
            className="absolute right-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}

        {/* Image */}
        <AnimatePresence mode="wait">
          <motion.img
            key={photo.id}
            src={`/api/photos/${photo.id}/full`}
            alt={photo.filename}
            draggable={false}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onDoubleClick={() => (zoom > 1 ? reset() : setZoom(2))}
            onWheel={(e) => setZoom((z) => Math.min(4, Math.max(1, z - Math.sign(e.deltaY) * 0.3)))}
            onPointerDown={(e) => {
              if (zoom <= 1) return;
              drag.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
            }}
            onPointerMove={(e) => {
              if (!drag.current) return;
              setPan({ x: e.clientX - drag.current.x, y: e.clientY - drag.current.y });
            }}
            onPointerUp={() => (drag.current = null)}
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg)`,
              cursor: zoom > 1 ? "grab" : "default",
            }}
            className="max-h-[90vh] max-w-full select-none object-contain"
          />
        </AnimatePresence>
      </div>

      {/* Info sidebar */}
      {showInfo && <PhotoInfo photo={photo} />}
    </div>
  );
}

function IconBtn({
  children,
  label,
  onClick,
  active,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-lg hover:bg-white/10",
        active ? "text-primary" : "text-white/80 hover:text-white",
      )}
    >
      {children}
    </button>
  );
}

function PhotoInfo({ photo }: { photo: PhotoItem }) {
  const rows: [string, string | null][] = [
    ["Taken", photo.takenAt ? new Date(photo.takenAt).toLocaleString() : null],
    ["Dimensions", photo.width && photo.height ? `${photo.width} × ${photo.height}` : null],
    ["Size", photo.size ? formatBytes(photo.size) : null],
    ["Camera", photo.camera],
    ["Lens", photo.lens],
    ["Aperture", photo.fNumber ? `f/${photo.fNumber}` : null],
    ["Exposure", photo.exposure],
    ["ISO", photo.iso ? String(photo.iso) : null],
    ["Focal length", photo.focalLength ? `${photo.focalLength}mm` : null],
    ["File", photo.filename],
  ];
  return (
    <motion.aside
      initial={{ x: 40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="hidden w-80 shrink-0 overflow-y-auto border-l border-white/10 bg-black/60 p-5 text-sm text-white/80 sm:block"
    >
      <h3 className="mb-4 text-base font-semibold text-white">Details</h3>
      <dl className="space-y-2.5">
        {rows
          .filter(([, v]) => v)
          .map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3">
              <dt className="text-white/50">{k}</dt>
              <dd className="text-right text-white/90">{v}</dd>
            </div>
          ))}
      </dl>
      {photo.gpsLat != null && photo.gpsLng != null && (
        <a
          href={`https://www.openstreetmap.org/?mlat=${photo.gpsLat}&mlon=${photo.gpsLng}#map=15/${photo.gpsLat}/${photo.gpsLng}`}
          target="_blank"
          rel="noreferrer"
          className="mt-4 flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-primary hover:bg-white/10"
        >
          <MapPin className="h-4 w-4" /> View on map
        </a>
      )}
    </motion.aside>
  );
}
