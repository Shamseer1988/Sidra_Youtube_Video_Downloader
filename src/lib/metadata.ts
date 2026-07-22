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
  logo: string | null;
  artist: string | null;
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

async function fetchJson<T>(url: string, headers?: Record<string, string>): Promise<T | null> {
  try {
    const res = await fetch(url, { headers: { accept: "application/json", ...headers } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// TMDB issues two credential styles: a short v3 "API Key" (used as an
// api_key query param) and a long v4 "API Read Access Token" (a JWT used as
// a Bearer header). Users routinely paste the v4 token, so detect it and
// authenticate the right way instead of silently returning no results.
function isV4Token(key: string): boolean {
  return key.startsWith("eyJ") || (key.includes(".") && key.length > 40);
}
function tmdbAuth(key: string): { query: string; headers?: Record<string, string> } {
  return isV4Token(key)
    ? { query: "", headers: { Authorization: `Bearer ${key}` } }
    : { query: `api_key=${encodeURIComponent(key)}` };
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
  production_companies?: { name: string; logo_path?: string | null }[];
  networks?: { name: string; logo_path?: string | null }[];
  poster_path?: string | null;
  backdrop_path?: string | null;
  belongs_to_collection?: { name: string } | null;
}

async function tmdbSearch(kind: MediaKind, title: string, year: number | null, key: string): Promise<number | null> {
  const auth = tmdbAuth(key);
  const params = new URLSearchParams({ query: title, include_adult: "false" });
  if (year) params.set(kind === "movie" ? "primary_release_year" : "first_air_date_year", String(year));
  const qs = [auth.query, params.toString()].filter(Boolean).join("&");
  const data = await fetchJson<TmdbSearchResponse>(`${TMDB}/search/${kind}?${qs}`, auth.headers);
  return data?.results?.[0]?.id ?? null;
}

function img(path: string | null | undefined, size: string): string | null {
  return path ? `${TMDB_IMG}/${size}${path}` : null;
}

async function tmdbDetails(kind: MediaKind, id: number, key: string): Promise<NormalizedMetadata | null> {
  const auth = tmdbAuth(key);
  const qs = [auth.query, "append_to_response=credits"].filter(Boolean).join("&");
  const d = await fetchJson<TmdbDetail>(`${TMDB}/${kind}/${id}?${qs}`, auth.headers);
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
    logo: img(d.production_companies?.[0]?.logo_path ?? d.networks?.[0]?.logo_path, "w200"),
    artist: null,
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
    logo: null,
    artist: null,
    poster: val(d.Poster),
    backdrop: null,
    collection: null,
  };
}

// ── TVMaze (TV fallback, no key required) ───────────────────────────

interface TvMazeShow {
  name?: string;
  summary?: string;
  genres?: string[];
  premiered?: string;
  runtime?: number;
  rating?: { average?: number | null };
  network?: { name?: string } | null;
  webChannel?: { name?: string } | null;
  image?: { medium?: string; original?: string } | null;
  _embedded?: { cast?: { person?: { name?: string }; character?: { name?: string } }[] };
}

async function tvMazeLookup(title: string): Promise<NormalizedMetadata | null> {
  const d = await fetchJson<TvMazeShow>(
    `https://api.tvmaze.com/singlesearch/shows?q=${encodeURIComponent(title)}&embed=cast`,
  );
  if (!d?.name) return null;
  const overview = d.summary ? d.summary.replace(/<[^>]+>/g, "").trim() : null;
  return {
    provider: "tvmaze",
    providerId: null,
    mediaKind: "tv",
    title: d.name,
    overview,
    tagline: null,
    releaseDate: d.premiered ?? null,
    year: d.premiered ? Number(d.premiered.slice(0, 4)) || null : null,
    runtime: d.runtime ?? null,
    rating: d.rating?.average ?? null,
    genres: d.genres ?? [],
    cast: (d._embedded?.cast ?? [])
      .slice(0, 12)
      .map((c) => ({ name: c.person?.name ?? "", character: c.character?.name ?? null }))
      .filter((c) => c.name),
    director: null,
    studio: d.network?.name ?? d.webChannel?.name ?? null,
    logo: null,
    artist: null,
    poster: d.image?.original ?? d.image?.medium ?? null,
    backdrop: null,
    collection: null,
  };
}

// ── MusicBrainz + Cover Art Archive (music, no key required) ────────

interface MbRecording {
  title?: string;
  "first-release-date"?: string;
  "artist-credit"?: { name?: string }[];
  releases?: { id?: string; title?: string; "release-group"?: { id?: string } }[];
  tags?: { name?: string }[];
}
interface MbResponse {
  recordings?: MbRecording[];
}

async function musicBrainzLookup(title: string, artistHint: string | null): Promise<NormalizedMetadata | null> {
  const query = artistHint ? `recording:"${title}" AND artist:"${artistHint}"` : `recording:"${title}"`;
  let d: MbResponse | null = null;
  try {
    const res = await fetch(
      `https://musicbrainz.org/ws/2/recording?query=${encodeURIComponent(query)}&fmt=json&limit=1`,
      { headers: { "User-Agent": "SidraMedia/1.0 (self-hosted)", accept: "application/json" } },
    );
    if (res.ok) d = (await res.json()) as MbResponse;
  } catch {
    return null;
  }
  const rec = d?.recordings?.[0];
  if (!rec?.title) return null;

  const release = rec.releases?.[0];
  const groupId = release?.["release-group"]?.id;
  const poster = groupId ? `https://coverartarchive.org/release-group/${groupId}/front-500` : null;

  return {
    provider: "musicbrainz",
    providerId: null,
    mediaKind: null,
    title: rec.title,
    overview: null,
    tagline: null,
    releaseDate: rec["first-release-date"] ?? null,
    year: rec["first-release-date"] ? Number(rec["first-release-date"].slice(0, 4)) || null : null,
    runtime: null,
    rating: null,
    genres: (rec.tags ?? []).map((t) => t.name ?? "").filter(Boolean).slice(0, 6),
    cast: [],
    director: null,
    studio: release?.title ?? null,
    logo: null,
    artist: rec["artist-credit"]?.[0]?.name ?? null,
    poster,
    backdrop: null,
    collection: release?.title ?? null,
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

  const { title, year } = cleanTitle(item.title);
  let meta: NormalizedMetadata | null = null;

  if (item.type === "audio") {
    // Music → MusicBrainz + Cover Art Archive (no key needed). Titles are
    // often "Artist - Track"; split on the first dash as an artist hint.
    const dash = item.title.indexOf(" - ");
    const [artistHint, track] = dash > 0 ? [item.title.slice(0, dash), item.title.slice(dash + 3)] : [null, title];
    meta = await musicBrainzLookup(cleanTitle(track).title, artistHint);
  } else {
    const kind = kindForCategory(item.category) ?? "movie";
    const { tmdbKey, omdbKey } = await getMetadataSettings();

    if (tmdbKey) {
      const id = await tmdbSearch(kind, title, year, tmdbKey);
      if (id) meta = await tmdbDetails(kind, id, tmdbKey);
    }
    // TVMaze is a keyless fallback for TV; OMDb (with key) for anything else.
    if (!meta && kind === "tv") meta = await tvMazeLookup(title);
    if (!meta && omdbKey) meta = await omdbLookup(title, year, omdbKey);

    if (!meta && !tmdbKey && !omdbKey && kind !== "tv") {
      throw new Error("No metadata API key configured (Settings → Metadata).");
    }
  }

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
    logo: meta.logo,
    artist: meta.artist,
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
  logo: string | null;
  artist: string | null;
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
  logo: string | null;
  artist: string | null;
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
    logo: row.logo,
    artist: row.artist,
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
