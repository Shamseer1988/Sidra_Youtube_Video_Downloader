import "server-only";
import type { Prisma } from "@prisma/client";

/**
 * Lightweight natural-language + structured photo search. Parses a free-text
 * query (e.g. "beach photos from june 2024 favorites") into structured
 * filters and turns them into a Prisma where clause. Object/person/colour
 * search is deferred to the future AI slice; free-text currently matches
 * filename / camera / lens.
 */

const MONTHS: Record<string, number> = {
  january: 1, jan: 1, february: 2, feb: 2, march: 3, mar: 3, april: 4, apr: 4,
  may: 5, june: 6, jun: 6, july: 7, jul: 7, august: 8, aug: 8,
  september: 9, sep: 9, sept: 9, october: 10, oct: 10, november: 11, nov: 11, december: 12, dec: 12,
};

// Words that carry no filtering meaning.
const STOPWORDS = new Set([
  "show", "me", "photos", "photo", "pictures", "pics", "from", "in", "on", "of",
  "the", "a", "taken", "with", "and", "my", "all", "get", "find", "at",
]);

const EXT_ALIASES: Record<string, string[]> = {
  jpg: ["jpg", "jpeg"],
  jpeg: ["jpg", "jpeg"],
  png: ["png"],
  heic: ["heic", "heif"],
  gif: ["gif"],
  webp: ["webp"],
  tiff: ["tif", "tiff"],
};

export interface ParsedFilters {
  year: number | null;
  month: number | null;
  favorite: boolean;
  hasGps: boolean;
  exts: string[];
  minRating: number | null;
  terms: string[];
}

export function parseQuery(q: string): ParsedFilters {
  const filters: ParsedFilters = {
    year: null, month: null, favorite: false, hasGps: false, exts: [], minRating: null, terms: [],
  };
  const tokens = q.toLowerCase().replace(/[^\w\s+]/g, " ").split(/\s+/).filter(Boolean);

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];

    if (/^(19|20)\d{2}$/.test(t)) {
      filters.year = Number(t);
      continue;
    }
    if (MONTHS[t]) {
      filters.month = MONTHS[t];
      continue;
    }
    if (/^fav(ou?rites?|s)?$/.test(t) || t === "favourite" || t === "favorite") {
      filters.favorite = true;
      continue;
    }
    if (["geotagged", "gps", "located", "location", "map", "geo"].includes(t)) {
      filters.hasGps = true;
      continue;
    }
    if (EXT_ALIASES[t]) {
      filters.exts.push(...EXT_ALIASES[t]);
      continue;
    }
    // "4+ stars", "5star", "rated 4"
    const star = t.match(/^([1-5])\+?$/);
    if (star && (tokens[i + 1]?.startsWith("star") || tokens[i - 1] === "rated")) {
      filters.minRating = Number(star[1]);
      continue;
    }
    if (t === "stars" || t === "star" || t === "rated") continue;
    if (STOPWORDS.has(t)) continue;

    filters.terms.push(t);
  }

  filters.exts = [...new Set(filters.exts)];
  return filters;
}

export interface PhotoSearchParams {
  q?: string;
  libraryId?: string;
  favorite?: boolean;
  scope?: string; // "archive" | "all"
  year?: number;
  month?: number;
  day?: number;
  camera?: string;
  ext?: string;
}

/** Build the Prisma where clause for a photo query (base + parsed search). */
export function buildPhotoWhere(params: PhotoSearchParams): Prisma.PhotoWhereInput {
  const and: Prisma.PhotoWhereInput[] = [];

  // Base visibility (archive/hidden handling).
  if (params.scope === "archive") and.push({ archived: true });
  else if (params.scope !== "all") and.push({ archived: false });
  if (params.scope !== "all") and.push({ hidden: false });

  if (params.libraryId) and.push({ libraryId: params.libraryId });

  // Explicit structured filters (from filter chips).
  if (params.favorite) and.push({ favorite: true });
  if (params.year) and.push({ takenYear: params.year });
  if (params.month) and.push({ takenMonth: params.month });
  if (params.day) and.push({ takenDay: params.day });
  if (params.camera) and.push({ camera: { contains: params.camera } });
  if (params.ext) and.push({ ext: params.ext.toLowerCase() });

  // Natural-language query.
  if (params.q?.trim()) {
    const f = parseQuery(params.q);
    if (f.year) and.push({ takenYear: f.year });
    if (f.month) and.push({ takenMonth: f.month });
    if (f.favorite) and.push({ favorite: true });
    if (f.hasGps) and.push({ NOT: { gpsLat: null } });
    if (f.minRating) and.push({ rating: { gte: f.minRating } });
    if (f.exts.length) and.push({ ext: { in: f.exts } });
    for (const term of f.terms) {
      and.push({
        OR: [
          { filename: { contains: term } },
          { camera: { contains: term } },
          { lens: { contains: term } },
          { folder: { contains: term } },
        ],
      });
    }
  }

  return and.length ? { AND: and } : {};
}
