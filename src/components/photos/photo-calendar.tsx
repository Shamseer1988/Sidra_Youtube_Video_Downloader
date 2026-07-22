"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, Loader2 } from "lucide-react";
import { usePhotoCalendar, usePhotos } from "@/hooks/use-photos";
import { PhotoGrid } from "@/components/photos/photo-grid";
import { PhotoLightbox } from "@/components/photos/photo-lightbox";
import { cn } from "@/lib/utils";
import type { PhotoItem } from "@/lib/types";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

export function PhotoCalendar() {
  const [year, setYear] = useState<number | null>(null);
  const [day, setDay] = useState<{ y: number; m: number; d: number } | null>(null);
  const { data, isLoading } = usePhotoCalendar(year);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of data?.days ?? []) map.set(`${d.month}-${d.day}`, d.count);
    return map;
  }, [data]);

  if (day) {
    return <DayView year={day.y} month={day.m} day={day.d} onBack={() => setDay(null)} />;
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!data || data.years.length === 0) {
    return (
      <div className="glass-card py-20 text-center text-sm text-muted">No dated photos yet.</div>
    );
  }

  const activeYear = data.year;
  let maxCount = 1;
  for (const c of counts.values()) maxCount = Math.max(maxCount, c);

  return (
    <div className="space-y-5">
      {/* Year selector */}
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        {data.years.map((y) => (
          <button
            key={y}
            onClick={() => setYear(y)}
            className={cn(
              "shrink-0 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
              y === activeYear
                ? "border-primary/40 bg-primary/15 text-primary"
                : "border-stroke bg-surface-2/60 text-muted hover:text-foreground",
            )}
          >
            {y}
          </button>
        ))}
      </div>

      {/* Month grids */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {MONTH_NAMES.map((name, mi) => {
          const month = mi + 1;
          const total = daysInMonth(activeYear, month);
          const firstDow = new Date(activeYear, mi, 1).getDay(); // 0=Sun
          const cells: (number | null)[] = Array(firstDow).fill(null);
          for (let d = 1; d <= total; d++) cells.push(d);

          const monthCount = [...counts.entries()]
            .filter(([k]) => k.startsWith(`${month}-`))
            .reduce((a, [, v]) => a + v, 0);

          return (
            <div key={name} className="glass-card p-3">
              <div className="mb-2 flex items-baseline justify-between">
                <h3 className="text-sm font-semibold text-foreground">{name}</h3>
                {monthCount > 0 && <span className="text-[11px] text-muted-2">{monthCount}</span>}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                  <span key={i} className="text-center text-[9px] text-muted-2">{d}</span>
                ))}
                {cells.map((d, i) => {
                  if (d === null) return <span key={`e${i}`} />;
                  const count = counts.get(`${month}-${d}`) ?? 0;
                  const intensity = count ? 0.25 + 0.75 * (count / maxCount) : 0;
                  return (
                    <button
                      key={d}
                      disabled={!count}
                      onClick={() => setDay({ y: activeYear, m: month, d })}
                      title={count ? `${count} photo${count === 1 ? "" : "s"}` : undefined}
                      className={cn(
                        "flex aspect-square items-center justify-center rounded text-[10px] transition-colors",
                        count ? "text-white hover:ring-1 hover:ring-primary" : "text-muted-2/40",
                      )}
                      style={count ? { backgroundColor: `rgba(139, 92, 246, ${intensity})` } : undefined}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DayView({ year, month, day, onBack }: { year: number; month: number; day: number; onBack: () => void }) {
  const { data, isLoading } = usePhotos({ year, month, day });
  const [lightbox, setLightbox] = useState<number | null>(null);
  const photos: PhotoItem[] = useMemo(() => (data?.pages ?? []).flatMap((p) => p.photos), [data]);

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Back to calendar
      </button>
      <h2 className="text-lg font-semibold text-foreground">
        {MONTH_NAMES[month - 1]} {day}, {year}
      </h2>
      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <PhotoGrid photos={photos} onOpen={setLightbox} />
      )}
      {lightbox !== null && (
        <PhotoLightbox photos={photos} index={lightbox} onClose={() => setLightbox(null)} onIndexChange={setLightbox} />
      )}
    </div>
  );
}
