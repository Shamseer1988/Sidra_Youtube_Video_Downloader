"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Crop, FlipHorizontal, FlipVertical, Loader2, RotateCw, Sliders, Sparkles, Stamp, X,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PhotoItem } from "@/lib/types";

const PRESETS: { id: string; label: string; filter: string }[] = [
  { id: "none", label: "Original", filter: "" },
  { id: "bw", label: "B&W", filter: "grayscale(100%)" },
  { id: "noir", label: "Noir", filter: "grayscale(100%) contrast(140%) brightness(95%)" },
  { id: "sepia", label: "Sepia", filter: "sepia(75%)" },
  { id: "vintage", label: "Vintage", filter: "sepia(35%) contrast(110%) brightness(105%) saturate(120%)" },
  { id: "cool", label: "Cool", filter: "hue-rotate(-12deg) saturate(115%)" },
  { id: "warm", label: "Warm", filter: "sepia(22%) saturate(130%) hue-rotate(8deg)" },
  { id: "vivid", label: "Vivid", filter: "saturate(165%) contrast(112%)" },
];

const WM_POSITIONS = ["bottom-right", "bottom-left", "top-right", "top-left", "center"] as const;
type WmPos = (typeof WM_POSITIONS)[number];

interface Crop01 { x: number; y: number; w: number; h: number }

export function PhotoEditor({ photo, onClose, onSaved }: { photo: PhotoItem; onClose: () => void; onSaved?: (p: PhotoItem) => void }) {
  const toast = useToast();
  const qc = useQueryClient();
  const imgRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cropBoxRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"adjust" | "filters" | "transform" | "crop" | "watermark">("adjust");

  // Edit state.
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [blur, setBlur] = useState(0);
  const [sharpen, setSharpen] = useState(0);
  const [vignette, setVignette] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [preset, setPreset] = useState("none");
  const [crop, setCrop] = useState<Crop01 | null>(null);
  const [aspect, setAspect] = useState<number | null>(null);
  const [wmText, setWmText] = useState("");
  const [wmPos, setWmPos] = useState<WmPos>("bottom-right");
  const [wmOpacity, setWmOpacity] = useState(60);
  const [maxDim, setMaxDim] = useState(2560);

  const filterString = useCallback(() => {
    const p = PRESETS.find((x) => x.id === preset)?.filter ?? "";
    return `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) blur(${blur}px) ${p}`.trim();
  }, [brightness, contrast, saturation, blur, preset]);

  // Render the (rotated/flipped/filtered/vignette/watermark) image — no crop.
  const drawBase = useCallback(
    (canvas: HTMLCanvasElement, cap: number) => {
      const img = imgRef.current;
      if (!img) return;
      const rot = ((rotation % 360) + 360) % 360;
      const swap = rot === 90 || rot === 270;
      const rw = swap ? img.naturalHeight : img.naturalWidth;
      const rh = swap ? img.naturalWidth : img.naturalHeight;
      const scale = Math.min(1, cap / Math.max(rw, rh));
      const outW = Math.max(1, Math.round(rw * scale));
      const outH = Math.max(1, Math.round(rh * scale));
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, outW, outH);
      ctx.save();
      ctx.translate(outW / 2, outH / 2);
      ctx.rotate((rot * Math.PI) / 180);
      ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
      ctx.filter = filterString();
      const dw = img.naturalWidth * scale;
      const dh = img.naturalHeight * scale;
      ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
      ctx.restore();

      if (vignette > 0) {
        const g = ctx.createRadialGradient(outW / 2, outH / 2, Math.min(outW, outH) * 0.35, outW / 2, outH / 2, Math.max(outW, outH) * 0.72);
        g.addColorStop(0, "rgba(0,0,0,0)");
        g.addColorStop(1, `rgba(0,0,0,${vignette / 100})`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, outW, outH);
      }

      if (wmText.trim()) {
        const size = Math.max(14, Math.round(outW * 0.032));
        ctx.font = `600 ${size}px system-ui, sans-serif`;
        ctx.fillStyle = `rgba(255,255,255,${wmOpacity / 100})`;
        ctx.shadowColor = "rgba(0,0,0,0.5)";
        ctx.shadowBlur = size / 4;
        const pad = size;
        const m = ctx.measureText(wmText);
        let x = outW - m.width - pad, y = outH - pad;
        if (wmPos === "bottom-left") { x = pad; }
        else if (wmPos === "top-right") { y = pad + size; }
        else if (wmPos === "top-left") { x = pad; y = pad + size; }
        else if (wmPos === "center") { x = (outW - m.width) / 2; y = outH / 2; }
        ctx.fillText(wmText, x, y);
        ctx.shadowBlur = 0;
      }
    },
    [rotation, flipH, flipV, filterString, vignette, wmText, wmOpacity, wmPos],
  );

  // Load the source image once.
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setReady(true);
    };
    img.onerror = () => toast("Could not load image", "error");
    img.src = `/api/photos/${photo.id}/full`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photo.id]);

  // Live preview.
  useEffect(() => {
    if (ready && canvasRef.current) drawBase(canvasRef.current, 1400);
  }, [ready, drawBase]);

  function sharpenCanvas(ctx: CanvasRenderingContext2D, w: number, h: number, amount: number) {
    if (amount <= 0) return;
    const src = ctx.getImageData(0, 0, w, h);
    const dst = ctx.createImageData(w, h);
    const s = src.data, d = dst.data;
    const center = 1 + 4 * amount, side = -amount;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        for (let c = 0; c < 3; c++) {
          let v = s[i + c] * center;
          if (x > 0) v += s[i - 4 + c] * side;
          if (x < w - 1) v += s[i + 4 + c] * side;
          if (y > 0) v += s[i - w * 4 + c] * side;
          if (y < h - 1) v += s[i + w * 4 + c] * side;
          d[i + c] = v < 0 ? 0 : v > 255 ? 255 : v;
        }
        d[i + 3] = s[i + 3];
      }
    }
    ctx.putImageData(dst, 0, 0);
  }

  async function save() {
    setSaving(true);
    try {
      const base = document.createElement("canvas");
      drawBase(base, maxDim);

      let out = base;
      if (crop && crop.w > 0.02 && crop.h > 0.02) {
        const cw = Math.max(1, Math.round(crop.w * base.width));
        const ch = Math.max(1, Math.round(crop.h * base.height));
        const cx = Math.round(crop.x * base.width);
        const cy = Math.round(crop.y * base.height);
        const cropped = document.createElement("canvas");
        cropped.width = cw;
        cropped.height = ch;
        cropped.getContext("2d")!.drawImage(base, cx, cy, cw, ch, 0, 0, cw, ch);
        out = cropped;
      }
      const octx = out.getContext("2d")!;
      if (sharpen > 0) sharpenCanvas(octx, out.width, out.height, sharpen / 100);

      const blob = await new Promise<Blob | null>((res) => out.toBlob(res, "image/jpeg", 0.92));
      if (!blob) throw new Error("Render failed");

      const fd = new FormData();
      fd.append("file", blob, "edited.jpg");
      fd.append("width", String(out.width));
      fd.append("height", String(out.height));
      const res = await fetch(`/api/photos/${photo.id}/edit`, { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || json.success === false) throw new Error(json.message || "Save failed");

      toast("Saved a copy — original untouched", "success");
      qc.invalidateQueries({ queryKey: ["photos"] });
      qc.invalidateQueries({ queryKey: ["photo-dashboard"] });
      onSaved?.(json.data as PhotoItem);
      onClose();
    } catch (e) {
      toast((e as Error).message || "Could not save", "error");
    } finally {
      setSaving(false);
    }
  }

  // Crop drag (in the preview box's pixel space → normalized).
  const drag = useRef<{ x: number; y: number } | null>(null);
  function onCropDown(e: React.PointerEvent) {
    const box = cropBoxRef.current;
    if (!box) return;
    const r = box.getBoundingClientRect();
    drag.current = { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
    setCrop({ x: drag.current.x, y: drag.current.y, w: 0, h: 0 });
  }
  function onCropMove(e: React.PointerEvent) {
    if (!drag.current) return;
    const box = cropBoxRef.current;
    if (!box) return;
    const r = box.getBoundingClientRect();
    let cx = (e.clientX - r.left) / r.width;
    let cy = (e.clientY - r.top) / r.height;
    cx = Math.min(1, Math.max(0, cx));
    cy = Math.min(1, Math.max(0, cy));
    const w = cx - drag.current.x;
    let h = cy - drag.current.y;
    if (aspect) {
      // Constrain using the box's real pixel aspect.
      const boxAspect = r.width / r.height;
      const targetH = (Math.abs(w) * boxAspect) / aspect;
      h = Math.sign(h || 1) * targetH;
    }
    const x = Math.min(drag.current.x, drag.current.x + w);
    const y = Math.min(drag.current.y, drag.current.y + h);
    setCrop({ x, y, w: Math.abs(w), h: Math.abs(h) });
  }
  function onCropUp() {
    drag.current = null;
  }

  return (
    <div className="fixed inset-0 z-[120] flex flex-col bg-navy-900 lg:flex-row">
      {/* Canvas area */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-black p-4">
        {!ready && <Loader2 className="h-8 w-8 animate-spin text-primary" />}
        <div ref={cropBoxRef} className="relative inline-block max-h-full max-w-full">
          <canvas ref={canvasRef} className="max-h-[80vh] max-w-full object-contain" style={{ display: ready ? "block" : "none" }} />
          {/* Crop overlay */}
          {tab === "crop" && ready && (
            <div
              className="absolute inset-0 cursor-crosshair touch-none"
              onPointerDown={onCropDown}
              onPointerMove={onCropMove}
              onPointerUp={onCropUp}
            >
              {crop && crop.w > 0 && (
                <div
                  className="absolute border-2 border-primary"
                  style={{
                    left: `${crop.x * 100}%`,
                    top: `${crop.y * 100}%`,
                    width: `${crop.w * 100}%`,
                    height: `${crop.h * 100}%`,
                    boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
                  }}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sidebar */}
      <aside className="flex w-full flex-col border-t border-stroke bg-surface-1 lg:h-full lg:w-80 lg:border-l lg:border-t-0">
        <div className="flex items-center justify-between border-b border-stroke p-4">
          <h3 className="text-base font-semibold text-foreground">Edit photo</h3>
          <button onClick={onClose} className="text-muted-2 hover:text-foreground"><X className="h-5 w-5" /></button>
        </div>

        {/* Tabs */}
        <div className="no-scrollbar flex gap-1 overflow-x-auto border-b border-stroke p-2">
          {[
            { id: "adjust", label: "Adjust", icon: Sliders },
            { id: "filters", label: "Filters", icon: Sparkles },
            { id: "transform", label: "Transform", icon: RotateCw },
            { id: "crop", label: "Crop", icon: Crop },
            { id: "watermark", label: "Mark", icon: Stamp },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id as typeof tab)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium",
                  tab === t.id ? "bg-primary/15 text-primary" : "text-muted hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" /> {t.label}
              </button>
            );
          })}
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {tab === "adjust" && (
            <>
              <Slider label="Brightness" value={brightness} min={0} max={200} onChange={setBrightness} onReset={() => setBrightness(100)} />
              <Slider label="Contrast" value={contrast} min={0} max={200} onChange={setContrast} onReset={() => setContrast(100)} />
              <Slider label="Saturation" value={saturation} min={0} max={200} onChange={setSaturation} onReset={() => setSaturation(100)} />
              <Slider label="Sharpness" value={sharpen} min={0} max={100} onChange={setSharpen} onReset={() => setSharpen(0)} />
              <Slider label="Blur" value={blur} min={0} max={20} onChange={setBlur} onReset={() => setBlur(0)} />
              <Slider label="Vignette" value={vignette} min={0} max={100} onChange={setVignette} onReset={() => setVignette(0)} />
            </>
          )}

          {tab === "filters" && (
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPreset(p.id)}
                  className={cn(
                    "rounded-lg border px-3 py-2.5 text-xs font-medium",
                    preset === p.id ? "border-primary/50 bg-primary/15 text-primary" : "border-stroke text-muted hover:text-foreground",
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}

          {tab === "transform" && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <ToolBtn onClick={() => setRotation((r) => r - 90)} label="Rotate left"><RotateCw className="h-4 w-4 -scale-x-100" /></ToolBtn>
                <ToolBtn onClick={() => setRotation((r) => r + 90)} label="Rotate right"><RotateCw className="h-4 w-4" /></ToolBtn>
                <ToolBtn onClick={() => setFlipH((f) => !f)} label="Flip horizontal" active={flipH}><FlipHorizontal className="h-4 w-4" /></ToolBtn>
                <ToolBtn onClick={() => setFlipV((f) => !f)} label="Flip vertical" active={flipV}><FlipVertical className="h-4 w-4" /></ToolBtn>
              </div>
              <label className="block text-xs text-muted">
                Output size
                <select
                  value={maxDim}
                  onChange={(e) => setMaxDim(Number(e.target.value))}
                  className="mt-1 h-9 w-full rounded-lg border border-stroke bg-surface-2 px-2 text-sm text-foreground"
                >
                  <option value={4096}>Large (4096px)</option>
                  <option value={2560}>Medium (2560px)</option>
                  <option value={1920}>1080p (1920px)</option>
                  <option value={1280}>Small (1280px)</option>
                </select>
              </label>
            </div>
          )}

          {tab === "crop" && (
            <div className="space-y-3">
              <p className="text-xs text-muted">Drag on the image to select a crop area.</p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: "Free", v: null },
                  { label: "1:1", v: 1 },
                  { label: "4:3", v: 4 / 3 },
                  { label: "3:2", v: 3 / 2 },
                  { label: "16:9", v: 16 / 9 },
                ].map((a) => (
                  <button
                    key={a.label}
                    onClick={() => setAspect(a.v)}
                    className={cn(
                      "rounded-lg border px-2.5 py-1 text-xs",
                      aspect === a.v ? "border-primary/50 bg-primary/15 text-primary" : "border-stroke text-muted hover:text-foreground",
                    )}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
              {crop && (
                <button onClick={() => setCrop(null)} className="text-xs text-primary hover:underline">
                  Reset crop
                </button>
              )}
            </div>
          )}

          {tab === "watermark" && (
            <div className="space-y-3">
              <input
                value={wmText}
                onChange={(e) => setWmText(e.target.value)}
                placeholder="Watermark text"
                className="h-10 w-full rounded-lg border border-stroke bg-surface-2 px-3 text-sm text-foreground placeholder:text-muted-2 focus:border-primary/50 focus:outline-none"
              />
              <label className="block text-xs text-muted">
                Position
                <select
                  value={wmPos}
                  onChange={(e) => setWmPos(e.target.value as WmPos)}
                  className="mt-1 h-9 w-full rounded-lg border border-stroke bg-surface-2 px-2 text-sm text-foreground"
                >
                  {WM_POSITIONS.map((p) => (
                    <option key={p} value={p}>{p.replace("-", " ")}</option>
                  ))}
                </select>
              </label>
              <Slider label="Opacity" value={wmOpacity} min={10} max={100} onChange={setWmOpacity} onReset={() => setWmOpacity(60)} />
            </div>
          )}
        </div>

        <div className="flex gap-2 border-t border-stroke p-4">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" onClick={save} isLoading={saving} disabled={!ready}>
            Save copy
          </Button>
        </div>
      </aside>
    </div>
  );
}

function Slider({ label, value, min, max, onChange, onReset }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void; onReset: () => void }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-muted">{label}</span>
        <button onClick={onReset} className="tabular-nums text-muted-2 hover:text-foreground">{value}</button>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-surface-3 accent-primary"
      />
    </div>
  );
}

function ToolBtn({ children, onClick, label, active }: { children: React.ReactNode; onClick: () => void; label: string; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "flex h-10 flex-1 items-center justify-center rounded-lg border transition-colors",
        active ? "border-primary/50 bg-primary/15 text-primary" : "border-stroke text-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
