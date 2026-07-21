"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Pencil, Star, X, Loader2 } from "lucide-react";
import { apiSend } from "@/lib/client-api";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { formatDuration } from "@/lib/utils";
import type { ItemMetadata } from "@/lib/types";

export function MediaMetadata({
  itemId,
  metadata,
  canEdit,
}: {
  itemId: string;
  metadata: ItemMetadata | null | undefined;
  canEdit: boolean;
}) {
  const toast = useToast();
  const qc = useQueryClient();
  const [meta, setMeta] = useState<ItemMetadata | null>(metadata ?? null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);

  async function refresh() {
    setBusy(true);
    try {
      const next = await apiSend<ItemMetadata>("POST", `/api/library/${itemId}/metadata`);
      setMeta(next);
      qc.invalidateQueries({ queryKey: ["library", itemId] });
      toast("Metadata updated", "success");
    } catch (e) {
      toast((e as Error).message || "Could not fetch metadata", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="glass-card overflow-hidden">
      {meta?.backdrop && (
        <div className="relative h-40 w-full sm:h-52">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={meta.backdrop} alt="" className="h-full w-full object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--surface-1,#0b1020)] to-transparent" />
        </div>
      )}

      <div className="flex gap-5 p-5">
        {meta?.poster && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={meta.poster}
            alt=""
            className="hidden w-28 shrink-0 rounded-xl border border-stroke object-cover sm:block"
          />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-foreground">
                {meta?.title || "No metadata yet"}
                {meta?.year ? <span className="ml-2 font-normal text-muted-2">({meta.year})</span> : null}
              </h2>
              {meta?.tagline && <p className="mt-0.5 text-sm italic text-muted-2">{meta.tagline}</p>}
              {meta?.artist && <p className="mt-0.5 text-sm text-muted">{meta.artist}</p>}
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-2">
                {meta?.rating ? (
                  <span className="flex items-center gap-1 text-amber-400">
                    <Star className="h-3.5 w-3.5 fill-current" /> {meta.rating.toFixed(1)}
                  </span>
                ) : null}
                {meta?.runtime ? <span>{formatDuration(meta.runtime * 60)}</span> : null}
                {meta?.studio ? <span>{meta.studio}</span> : null}
                {meta?.provider && meta.provider !== "manual" ? (
                  <span className="uppercase tracking-wide text-muted-2/70">via {meta.provider}</span>
                ) : null}
                {meta?.edited ? <span className="text-primary">edited</span> : null}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Button size="sm" variant="secondary" onClick={refresh} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                <span className="hidden sm:inline">Refresh</span>
              </Button>
              {canEdit && (
                <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
                  <Pencil className="h-4 w-4" />
                  <span className="hidden sm:inline">Edit</span>
                </Button>
              )}
            </div>
          </div>

          {meta?.genres && meta.genres.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {meta.genres.map((g) => (
                <span key={g} className="rounded-full border border-stroke bg-surface-2/60 px-2.5 py-0.5 text-xs text-muted">
                  {g}
                </span>
              ))}
            </div>
          )}

          {meta?.overview && <p className="mt-3 text-sm leading-relaxed text-muted">{meta.overview}</p>}

          {meta?.director && (
            <p className="mt-3 text-xs text-muted-2">
              <span className="text-muted">Director:</span> {meta.director}
            </p>
          )}

          {meta?.cast && meta.cast.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-muted">Cast</p>
              <p className="mt-0.5 text-xs text-muted-2">
                {meta.cast.map((c) => c.name).slice(0, 8).join(", ")}
              </p>
            </div>
          )}

          {!meta && (
            <p className="mt-2 text-sm text-muted-2">
              Fetch posters, cast and overview from TMDB. Add an API key in Settings → Metadata, then hit Refresh.
            </p>
          )}
        </div>
      </div>

      {editing && meta !== undefined && (
        <EditMetadataModal
          itemId={itemId}
          initial={meta}
          onClose={() => setEditing(false)}
          onSaved={(next) => {
            setMeta(next);
            qc.invalidateQueries({ queryKey: ["library", itemId] });
            setEditing(false);
          }}
        />
      )}
    </section>
  );
}

function EditMetadataModal({
  itemId,
  initial,
  onClose,
  onSaved,
}: {
  itemId: string;
  initial: ItemMetadata | null;
  onClose: () => void;
  onSaved: (next: ItemMetadata) => void;
}) {
  const toast = useToast();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [year, setYear] = useState(initial?.year ? String(initial.year) : "");
  const [rating, setRating] = useState(initial?.rating != null ? String(initial.rating) : "");
  const [genres, setGenres] = useState((initial?.genres ?? []).join(", "));
  const [director, setDirector] = useState(initial?.director ?? "");
  const [studio, setStudio] = useState(initial?.studio ?? "");
  const [poster, setPoster] = useState(initial?.poster ?? "");
  const [overview, setOverview] = useState(initial?.overview ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        title: title.trim(),
        overview: overview.trim(),
        director: director.trim(),
        studio: studio.trim(),
        genres: genres.split(",").map((g) => g.trim()).filter(Boolean),
        year: year.trim() ? Number(year) : null,
        rating: rating.trim() ? Number(rating) : null,
      };
      if (poster.trim()) body.poster = poster.trim();
      const next = await apiSend<ItemMetadata>("PATCH", `/api/library/${itemId}/metadata`, body);
      toast("Metadata saved", "success");
      onSaved(next);
    } catch (e) {
      toast((e as Error).message || "Could not save", "error");
    } finally {
      setSaving(false);
    }
  }

  const inputCls =
    "w-full h-9 px-3 rounded-lg bg-navy-800/80 border border-slate-600/30 text-sm text-slate-200 placeholder-slate-500 focus:border-accent-blue/50 focus:outline-none";

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-navy-900/70 p-4" onClick={onClose}>
      <div className="glass-card max-h-[90vh] w-full max-w-lg overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-100">Edit Metadata</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          <Field label="Title">
            <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Year">
              <input className={inputCls} value={year} onChange={(e) => setYear(e.target.value)} inputMode="numeric" />
            </Field>
            <Field label="Rating (0–10)">
              <input className={inputCls} value={rating} onChange={(e) => setRating(e.target.value)} inputMode="decimal" />
            </Field>
          </div>
          <Field label="Genres (comma separated)">
            <input className={inputCls} value={genres} onChange={(e) => setGenres(e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Director">
              <input className={inputCls} value={director} onChange={(e) => setDirector(e.target.value)} />
            </Field>
            <Field label="Studio">
              <input className={inputCls} value={studio} onChange={(e) => setStudio(e.target.value)} />
            </Field>
          </div>
          <Field label="Poster URL">
            <input className={inputCls} value={poster} onChange={(e) => setPoster(e.target.value)} placeholder="https://…" />
          </Field>
          <Field label="Overview">
            <textarea
              className={`${inputCls} h-24 resize-none py-2`}
              value={overview}
              onChange={(e) => setOverview(e.target.value)}
            />
          </Field>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button size="sm" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={save} isLoading={saving}>
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-400">{label}</span>
      {children}
    </label>
  );
}
