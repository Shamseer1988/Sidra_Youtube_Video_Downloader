/**
 * Small constants used by non-data UI: the app version, the media-kind type
 * used for generated artwork, and a decorative poster wall for the login
 * screen. No dashboard/demo data lives here — every dashboard, list and chart
 * reads real data from the API.
 */

export type MediaKind = "movie" | "tv" | "music";

export const appVersion = "v2.0.0";

/** Decorative gradient posters for the login backdrop (not real content). */
export interface PosterTile {
  id: string;
  title: string;
  kind: MediaKind;
  art: [string, string];
}

export const posterWall: PosterTile[] = [
  { id: "p1", title: "Aurora", kind: "movie", art: ["#1e1b4b", "#4c1d95"] },
  { id: "p2", title: "Interstellar", kind: "movie", art: ["#0c4a6e", "#1e293b"] },
  { id: "p3", title: "Dune", kind: "movie", art: ["#78350f", "#1c1917"] },
  { id: "p4", title: "Oppenheimer", kind: "movie", art: ["#7c2d12", "#0f0f0f"] },
  { id: "p5", title: "Endgame", kind: "movie", art: ["#312e81", "#831843"] },
  { id: "p6", title: "Skyline", kind: "movie", art: ["#b45309", "#450a0a"] },
  { id: "p7", title: "Chapter", kind: "movie", art: ["#164e63", "#312e81"] },
  { id: "p8", title: "Blade", kind: "movie", art: ["#9a3412", "#111827"] },
  { id: "p9", title: "Inception", kind: "movie", art: ["#334155", "#0f172a"] },
  { id: "p10", title: "Spider-Verse", kind: "movie", art: ["#701a75", "#1e3a8a"] },
  { id: "p11", title: "Fury Road", kind: "movie", art: ["#c2410c", "#422006"] },
  { id: "p12", title: "The Night", kind: "movie", art: ["#450a0a", "#09090b"] },
  { id: "t1", title: "Wildlife", kind: "tv", art: ["#065f46", "#0c4a6e"] },
  { id: "t2", title: "Severance", kind: "tv", art: ["#0e7490", "#111827"] },
  { id: "t3", title: "The Last", kind: "tv", art: ["#3f6212", "#292524"] },
  { id: "t4", title: "Dragon", kind: "tv", art: ["#7f1d1d", "#18181b"] },
  { id: "t5", title: "Stranger", kind: "tv", art: ["#7f1d1d", "#312e81"] },
  { id: "t6", title: "Shōgun", kind: "tv", art: ["#7c2d12", "#1c1917"] },
];
