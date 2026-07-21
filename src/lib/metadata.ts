import "server-only";
import { prisma } from "./prisma";

/**
 * Metadata providers. Movies & TV use TMDB with an OMDb fallback. Keys come
 * from the settings store (falling back to env vars). Everything is
 * best-effort: a missing key or a network error yields null rather than
 * throwing, so scanning/playback never depend on it.
 */

const TMDB = "https://api.themoviedb.org/3";
const TMDB_IMG = "https://image.tmdb.org/t/p";
const OMDB = "https://www.omdbapi.com";

export type MediaKind = "movie" | "tv";

export interface NormalizedMetadata {
  provider: string;
  providerId: string | null;
  mediaKind: MediaKind | null;
  title: string | null;
  overview: string | null;
  tagline: string | null;
  releaseDate: string | null;
  year: number | null;
  runtime: number | null;
  rating: number | null;
  genres: string[];
  cast: { name: string; character: string | null }[];
  director: string | null;
  studio: string | null;
  poster: string | null;
  backdrop: string | null;
  collection: string | null;
}

// ── Settings ────────────────────────────────────────────────────────

const SETTINGS_KEY = "metadata";

export interface MetadataSettings {
  tmdbKey: string;
  omdbKey: string;
}

export async function getMetadataSettings(): Promise<MetadataSettings> {
  let parsed: Partial<MetadataSettings> = {};
  try {
    const row = await prisma.setting.findUnique({ where: { key: SETTINGS_KEY } });
    if (row) parsed = JSON.parse(row.value);
  } catch {
    /* fall back to env */
  }
  return {
    tmdbKey: parsed.tmdbKey || process.env.TMDB_API_KEY || "",
    omdbKey: parsed.omdbKey || process.env.OMDB_API_KEY || "",
  };
}

export async function setMetadataSettings(patch: Partial<MetadataSettings>): Promise<MetadataSettings> {
  const current = await getMetadataSettings();
  const next = { ...current, ...patch };
  await prisma.setting.upsert({
    where: { key: SETTINGS_KEY },
    update: { value: JSON.stringify(next) },
    create: { key: SETTINGS_KEY, value: JSON.stringify(next) },
  });
  return next;
}

// ── Title cleaning ──────────────────────────────────────────────────

const RELEASE_TAGS = /\b(1080p|2160p|720p|480p|4k|uhd|bluray|blu-ray|brrip|bdrip|webrip|web-dl|webdl|hdtv|dvdrip|x264|x265|hevc|h264|h265|aac|ac3|dts|remux|proper|repack|extended|unrated)\b.*$/i;

/** Turn a messy filename-derived title into a searchable title + year. */
export function cleanTitle(raw: string): { title: string; year: number | null } {
  let s = raw.replace(/[._]/g, " ").trim();
  const yearMatch = s.match(/\b(19\d{2}|20\d{2})\b/);
  const year = yearMatch ? Number(yearMatch[1]) : null;
  if (yearMatch) {
    // Everything up to the year is the title; the rest is release junk.
    s = s.slice(0, yearMatch.index).trim();
  } else {
    s = s.replace(RELEASE_TAGS, "").trim();
  }
  s = s.replace(/[\s\-–—|(){}[\]]+$/g, "").replace(/\s{2,}/g, " ").trim();
  return { title: s || raw, year };
}

// ── TMDB ────────────────────────────────────────────────────────────

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

interface TmdbSearchResponse {
  results?: { id: number }[];
}

interface TmdbDetail {
  title?: string;
  name?: string;
  overview?: string;
  tagline?: string;
  release_date?: string;
  first_air_date?: string;
  runtime?: number;
  episode_run_time?: number[];
  vote_average?: number;
  genres?: { name: string }[];
  credits?: { cast?: { name: string; character?: string }[]; crew?: { name: string; job?: string }[] };
  created_by?: { name: string }[];
  production_companies?: { name: string }[];
  networks?: { name: string }[];
  poster_path?: string | null;
  backdrop_path?: string | null;
  belongs_to_collection?: { name: string } | null;
}

async function tmdbSearch(kind: MediaKind, title: string, year: number | null, key: string): Promise<number | null> {
  const params = new URLSearchParams({ api_key: key, query: title, include_adult: "false" });
  if (year) params.set(kind === "movie" ? "primary_release_year" : "first_air_date_year", String(year));
  const data = await fetchJson<TmdbSearchResponse>(`${TMDB}/search/${kind}?${params}`);
  return data?.results?.[0]?.id ?? null;
}

function img(path: string | null | undefined, size: string): string | null {
  return path ? `${TMDB_IMG}/${size}${path}` : null;
}

async function tmdbDetails(kind: MediaKind, id: number, key: string): Promise<NormalizedMetadata | null> {
  const d = await fetchJson<TmdbDetail>(`${TMDB}/${kind}/${id}?api_key=${key}&append_to_response=credits`);
  if (!d) return null;

  const releaseDate: string | null = d.release_date || d.first_air_date || null;
  const crew = d.credits?.crew ?? [];
  const director =
    kind === "movie"
      ? crew.find((c) => c.job === "Director")?.name ?? null
      : d.created_by?.[0]?.name ?? null;
  const runtime =
    kind === "movie" ? d.runtime ?? null : Array.isArray(d.episode_run_time) ? d.episode_run_time[0] ?? null : null;

  return {
    provider: "tmdb",
    providerId: String(id),
    mediaKind: kind,
    title: d.title || d.name || null,
    overview: d.overview || null,
    tagline: d.tagline || null,
    releaseDate,
    year: releaseDate ? Number(releaseDate.slice(0, 4)) || null : null,
    runtime: runtime ?? null,
    rating: typeof d.vote_average === "number" ? Math.round(d.vote_average * 10) / 10 : null,
    genres: (d.genres ?? []).map((g) => g.name).filter(Boolean),
    cast: (d.credits?.cast ?? []).slice(0, 12).map((c) => ({ name: c.name, character: c.character || null })),
    director,
    studio: d.production_companies?.[0]?.name ?? d.networks?.[0]?.name ?? null,
    poster: img(d.poster_path, "w500"),
    backdrop: img(d.backdrop_path, "w1280"),
    collection: d.belongs_to_collection?.name ?? null,
  };
}

// ── OMDb (fallback) ─────────────────────────────────────────────────

interface OmdbResponse {
  Response?: string;
  Type?: string;
  Title?: string;
  Plot?: string;
  Released?: string;
  Year?: string;
  Runtime?: string;
  imdbRating?: string;
  imdbID?: string;
  Genre?: string;
  Actors?: string;
  Director?: string;
  Production?: string;
  Poster?: string;
}

async function omdbLookup(title: string, year: number | null, key: string): Promise<NormalizedMetadata | null> {
  const params = new URLSearchParams({ apikey: key, t: title, plot: "full" });
  if (year) params.set("y", String(year));
  const d = await fetchJson<OmdbResponse>(`${OMDB}/?${params}`);
  if (!d || d.Response === "False") return null;

  const val = (v: string | undefined) => (v && v !== "N/A" ? v : null);
  const runtimeMin = val(d.Runtime)?.match(/\d+/)?.[0];

  return {
    provider: "omdb",
    providerId: val(d.imdbID),
    mediaKind: d.Type === "series" ? "tv" : "movie",
    title: val(d.Title),
    overview: val(d.Plot),
    tagline: null,
    releaseDate: val(d.Released),
    year: Number(String(d.Year).match(/\d{4}/)?.[0]) || null,
    runtime: runtimeMin ? Number(runtimeMin) : null,
    rating: Number(val(d.imdbRating)) || null,
    genres: val(d.Genre)?.split(",").map((s) => s.trim()) ?? [],
    cast: (val(d.Actors)?.split(",").map((s) => ({ name: s.trim(), character: null })) ?? []),
    director: val(d.Director),
    studio: val(d.Production),
    poster: val(d.Poster),
    backdrop: null,
    collection: null,
  };
}

// ── Orchestration & persistence ─────────────────────────────────────

function kindForCategory(category: string): MediaKind | null {
  if (category === "movies") return "movie";
  if (category === "tv") return "tv";
  return null;
}

/** Fetch metadata for an item from the best available provider and store it. */
export async function refreshMetadata(itemId: string): Promise<StoredMetadata | null> {
  const item = await prisma.libraryItem.findUnique({ where: { id: itemId } });
  if (!item) return null;

  const kind = kindForCategory(item.category) ?? "movie"; // default search as a movie
  const { tmdbKey, omdbKey } = await getMetadataSettings();
  if (!tmdbKey && !omdbKey) throw new Error("No metadata API key configured (Settings → Metadata).");

  const { title, year } = cleanTitle(item.title);

  let meta: NormalizedMetadata | null = null;
  if (tmdbKey) {
    const id = await tmdbSearch(kind, title, year, tmdbKey);
    if (id) meta = await tmdbDetails(kind, id, tmdbKey);
  }
  if (!meta && omdbKey) meta = await omdbLookup(title, year, omdbKey);
  if (!meta) return null;

  return persist(itemId, meta, false);
}

async function persist(itemId: string, meta: NormalizedMetadata, edited: boolean): Promise<StoredMetadata> {
  const data = {
    provider: meta.provider,
    providerId: meta.providerId,
    mediaKind: meta.mediaKind,
    title: meta.title,
    overview: meta.overview,
    tagline: meta.tagline,
    releaseDate: meta.releaseDate,
    year: meta.year,
    runtime: meta.runtime,
    rating: meta.rating,
    genres: JSON.stringify(meta.genres ?? []),
    cast: JSON.stringify(meta.cast ?? []),
    director: meta.director,
    studio: meta.studio,
    poster: meta.poster,
    backdrop: meta.backdrop,
    collection: meta.collection,
    edited,
  };
  const row = await prisma.itemMetadata.upsert({
    where: { itemId },
    update: data,
    create: { itemId, ...data },
  });
  return toStored(row);
}

export interface StoredMetadata {
  provider: string | null;
  mediaKind: string | null;
  title: string | null;
  overview: string | null;
  tagline: string | null;
  releaseDate: string | null;
  year: number | null;
  runtime: number | null;
  rating: number | null;
  genres: string[];
  cast: { name: string; character: string | null }[];
  director: string | null;
  studio: string | null;
  poster: string | null;
  backdrop: string | null;
  collection: string | null;
  edited: boolean;
}

function safeParse<T>(json: string | null, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

type MetadataRow = {
  provider: string | null;
  mediaKind: string | null;
  title: string | null;
  overview: string | null;
  tagline: string | null;
  releaseDate: string | null;
  year: number | null;
  runtime: number | null;
  rating: number | null;
  genres: string | null;
  cast: string | null;
  director: string | null;
  studio: string | null;
  poster: string | null;
  backdrop: string | null;
  collection: string | null;
  edited: boolean;
};

export function toStored(row: MetadataRow): StoredMetadata {
  return {
    provider: row.provider,
    mediaKind: row.mediaKind,
    title: row.title,
    overview: row.overview,
    tagline: row.tagline,
    releaseDate: row.releaseDate,
    year: row.year,
    runtime: row.runtime,
    rating: row.rating,
    genres: safeParse<string[]>(row.genres, []),
    cast: safeParse<{ name: string; character: string | null }[]>(row.cast, []),
    director: row.director,
    studio: row.studio,
    poster: row.poster,
    backdrop: row.backdrop,
    collection: row.collection,
    edited: row.edited,
  };
}

// Fields a user may edit by hand.
export interface MetadataEdit {
  title?: string;
  overview?: string;
  tagline?: string;
  year?: number | null;
  runtime?: number | null;
  rating?: number | null;
  genres?: string[];
  director?: string;
  studio?: string;
  poster?: string;
  collection?: string;
}

/** Apply a manual edit on top of any existing metadata row. */
export async function editMetadata(itemId: string, edit: MetadataEdit): Promise<StoredMetadata> {
  const data: Record<string, unknown> = { edited: true, provider: "manual" };
  if (edit.title !== undefined) data.title = edit.title;
  if (edit.overview !== undefined) data.overview = edit.overview;
  if (edit.tagline !== undefined) data.tagline = edit.tagline;
  if (edit.year !== undefined) data.year = edit.year;
  if (edit.runtime !== undefined) data.runtime = edit.runtime;
  if (edit.rating !== undefined) data.rating = edit.rating;
  if (edit.genres !== undefined) data.genres = JSON.stringify(edit.genres);
  if (edit.director !== undefined) data.director = edit.director;
  if (edit.studio !== undefined) data.studio = edit.studio;
  if (edit.poster !== undefined) data.poster = edit.poster;
  if (edit.collection !== undefined) data.collection = edit.collection;

  const row = await prisma.itemMetadata.upsert({
    where: { itemId },
    update: data,
    create: { itemId, ...data },
  });
  return toStored(row);
}

export async function getMetadata(itemId: string): Promise<StoredMetadata | null> {
  const row = await prisma.itemMetadata.findUnique({ where: { itemId } });
  return row ? toStored(row) : null;
}
