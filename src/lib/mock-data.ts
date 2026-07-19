/**
 * Realistic demo data for the SidraMedia dashboard.
 * Everything is deterministic so server & client render identically.
 */

export type MediaKind = "movie" | "tv" | "music";

export interface MediaItem {
  id: string;
  title: string;
  kind: MediaKind;
  year: number;
  genre: string;
  runtime: string;
  rating: number;
  resolution: "4K" | "1080p" | "720p";
  hdr?: boolean;
  /** Two hex colors used to render deterministic poster art */
  art: [string, string];
}

export interface ContinueWatchingItem extends MediaItem {
  progress: number; // 0-100
  remaining: string;
  episode?: string;
}

export type DownloadStatus =
  | "downloading"
  | "completed"
  | "paused"
  | "queued"
  | "failed";

export interface DownloadItem {
  id: string;
  title: string;
  quality: string;
  hdr?: boolean;
  size: string;
  sizeBytes: number;
  progress: number;
  speed: string;
  eta: string;
  status: DownloadStatus;
  finishedAt?: string;
  source: string;
  art: [string, string];
}

export interface StatCardData {
  id: string;
  label: string;
  value: number;
  suffix?: string;
  delta: number;
  deltaLabel: string;
  spark: number[];
  color: "purple" | "blue" | "emerald" | "amber" | "indigo";
}

export interface SystemMetric {
  id: string;
  label: string;
  value: string;
  sub: string;
  status: "good" | "warn" | "crit";
  series: number[];
  color: string;
}

/* ------------------------------------------------------------------ */
/*  Library                                                            */
/* ------------------------------------------------------------------ */

export const movies: MediaItem[] = [
  { id: "m1", title: "The Dark Knight", kind: "movie", year: 2008, genre: "Action", runtime: "2h 32m", rating: 9.0, resolution: "4K", hdr: true, art: ["#1e1b4b", "#4c1d95"] },
  { id: "m2", title: "Interstellar", kind: "movie", year: 2014, genre: "Sci-Fi", runtime: "2h 49m", rating: 8.7, resolution: "4K", hdr: true, art: ["#0c4a6e", "#1e293b"] },
  { id: "m3", title: "Dune: Part Two", kind: "movie", year: 2024, genre: "Sci-Fi", runtime: "2h 46m", rating: 8.6, resolution: "4K", hdr: true, art: ["#78350f", "#1c1917"] },
  { id: "m4", title: "Oppenheimer", kind: "movie", year: 2023, genre: "Drama", runtime: "3h 00m", rating: 8.4, resolution: "4K", hdr: true, art: ["#7c2d12", "#0f0f0f"] },
  { id: "m5", title: "Avengers: Endgame", kind: "movie", year: 2019, genre: "Action", runtime: "3h 01m", rating: 8.4, resolution: "4K", art: ["#312e81", "#831843"] },
  { id: "m6", title: "The Lion King", kind: "movie", year: 2019, genre: "Family", runtime: "1h 58m", rating: 6.8, resolution: "1080p", art: ["#b45309", "#450a0a"] },
  { id: "m7", title: "John Wick: Chapter 4", kind: "movie", year: 2023, genre: "Action", runtime: "2h 49m", rating: 7.7, resolution: "4K", hdr: true, art: ["#164e63", "#312e81"] },
  { id: "m8", title: "Blade Runner 2049", kind: "movie", year: 2017, genre: "Sci-Fi", runtime: "2h 44m", rating: 8.0, resolution: "4K", hdr: true, art: ["#9a3412", "#111827"] },
  { id: "m9", title: "Inception", kind: "movie", year: 2010, genre: "Thriller", runtime: "2h 28m", rating: 8.8, resolution: "1080p", art: ["#334155", "#0f172a"] },
  { id: "m10", title: "Spider-Man: Across the Spider-Verse", kind: "movie", year: 2023, genre: "Animation", runtime: "2h 20m", rating: 8.6, resolution: "4K", hdr: true, art: ["#701a75", "#1e3a8a"] },
  { id: "m11", title: "Mad Max: Fury Road", kind: "movie", year: 2015, genre: "Action", runtime: "2h 00m", rating: 8.1, resolution: "4K", art: ["#c2410c", "#422006"] },
  { id: "m12", title: "The Batman", kind: "movie", year: 2022, genre: "Crime", runtime: "2h 56m", rating: 7.8, resolution: "4K", hdr: true, art: ["#450a0a", "#09090b"] },
];

export const tvShows: MediaItem[] = [
  { id: "t1", title: "Breaking Bad", kind: "tv", year: 2008, genre: "Crime", runtime: "5 Seasons", rating: 9.5, resolution: "1080p", art: ["#365314", "#1c1917"] },
  { id: "t2", title: "Planet Earth II", kind: "tv", year: 2016, genre: "Documentary", runtime: "1 Season", rating: 9.5, resolution: "4K", hdr: true, art: ["#065f46", "#0c4a6e"] },
  { id: "t3", title: "Severance", kind: "tv", year: 2022, genre: "Sci-Fi", runtime: "2 Seasons", rating: 8.7, resolution: "4K", hdr: true, art: ["#0e7490", "#111827"] },
  { id: "t4", title: "The Last of Us", kind: "tv", year: 2023, genre: "Drama", runtime: "2 Seasons", rating: 8.7, resolution: "4K", hdr: true, art: ["#3f6212", "#292524"] },
  { id: "t5", title: "House of the Dragon", kind: "tv", year: 2022, genre: "Fantasy", runtime: "2 Seasons", rating: 8.4, resolution: "4K", hdr: true, art: ["#7f1d1d", "#18181b"] },
  { id: "t6", title: "Stranger Things", kind: "tv", year: 2016, genre: "Sci-Fi", runtime: "4 Seasons", rating: 8.7, resolution: "4K", art: ["#7f1d1d", "#312e81"] },
  { id: "t7", title: "The Bear", kind: "tv", year: 2022, genre: "Drama", runtime: "3 Seasons", rating: 8.5, resolution: "1080p", art: ["#1e3a8a", "#0f172a"] },
  { id: "t8", title: "Shōgun", kind: "tv", year: 2024, genre: "History", runtime: "1 Season", rating: 8.6, resolution: "4K", hdr: true, art: ["#7c2d12", "#1c1917"] },
];

export const trending: MediaItem[] = [
  movies[2], movies[9], tvShows[7], movies[3], tvShows[2], movies[6], tvShows[3], movies[7], tvShows[4], movies[10],
];

export const continueWatching: ContinueWatchingItem[] = [
  { ...movies[0], progress: 38, remaining: "1h 32m remaining" },
  { ...movies[1], progress: 74, remaining: "45m remaining" },
  { ...tvShows[0], progress: 62, remaining: "22m remaining", episode: "S03 E07" },
  { ...movies[4], progress: 28, remaining: "2h 10m remaining" },
  { ...tvShows[3], progress: 12, remaining: "48m remaining", episode: "S02 E01" },
  { ...movies[7], progress: 55, remaining: "1h 14m remaining" },
];

/* ------------------------------------------------------------------ */
/*  Downloads                                                          */
/* ------------------------------------------------------------------ */

export const downloads: DownloadItem[] = [
  { id: "d1", title: "John Wick: Chapter 4 (2023)", quality: "4K", hdr: true, size: "12.4 GB", sizeBytes: 13314398618, progress: 85, speed: "12.5 MB/s", eta: "2m 15s left", status: "downloading", source: "YouTube", art: ["#164e63", "#312e81"] },
  { id: "d2", title: "Planet Earth II — S01 E03", quality: "1080p", size: "2.1 GB", sizeBytes: 2254857830, progress: 100, speed: "—", eta: "—", status: "completed", finishedAt: "Today, 6:20 PM", source: "Vimeo", art: ["#065f46", "#0c4a6e"] },
  { id: "d3", title: "Alan Walker – Faded (Official Video)", quality: "4K", size: "89.3 MB", sizeBytes: 93637836, progress: 100, speed: "—", eta: "—", status: "completed", finishedAt: "Today, 5:48 PM", source: "YouTube", art: ["#155e75", "#1e1b4b"] },
  { id: "d4", title: "The Lion King (2019)", quality: "1080p", size: "3.7 GB", sizeBytes: 3972844748, progress: 45, speed: "8.7 MB/s", eta: "4m 30s left", status: "downloading", source: "Direct", art: ["#b45309", "#450a0a"] },
  { id: "d5", title: "Shōgun — S01 E05", quality: "4K", hdr: true, size: "5.9 GB", sizeBytes: 6335076761, progress: 12, speed: "paused", eta: "—", status: "paused", source: "Direct", art: ["#7c2d12", "#1c1917"] },
  { id: "d6", title: "Hans Zimmer — Live in Prague", quality: "1080p", size: "4.2 GB", sizeBytes: 4509715660, progress: 0, speed: "—", eta: "queued", status: "queued", source: "YouTube", art: ["#3730a3", "#0f172a"] },
  { id: "d7", title: "Top Gear — Bolivia Special", quality: "720p", size: "1.4 GB", sizeBytes: 1503238553, progress: 66, speed: "—", eta: "—", status: "failed", source: "Direct", art: ["#334155", "#1c1917"] },
];

export const activeDownloads = downloads.filter((d) => d.status === "downloading");

/* ------------------------------------------------------------------ */
/*  Stats                                                              */
/* ------------------------------------------------------------------ */

export const stats: StatCardData[] = [
  { id: "movies", label: "Movies", value: 1246, delta: 12, deltaLabel: "this week", spark: [30, 34, 32, 40, 38, 44, 48, 46, 52, 58, 56, 64], color: "purple" },
  { id: "tv", label: "TV Shows", value: 342, delta: 8, deltaLabel: "this week", spark: [12, 14, 13, 16, 18, 17, 20, 22, 21, 24, 26, 28], color: "blue" },
  { id: "music", label: "Music Tracks", value: 1875, delta: 32, deltaLabel: "this week", spark: [40, 42, 45, 44, 50, 54, 52, 58, 62, 60, 66, 72], color: "emerald" },
  { id: "downloads", label: "Active Downloads", value: 23, delta: -3, deltaLabel: "vs yesterday", spark: [8, 12, 10, 14, 18, 15, 20, 17, 22, 19, 25, 23], color: "amber" },
  { id: "storage", label: "Library Size", value: 7.2, suffix: " TB", delta: 4, deltaLabel: "72% of 10 TB", spark: [55, 56, 58, 57, 60, 62, 63, 65, 66, 68, 70, 72], color: "indigo" },
];

/* ------------------------------------------------------------------ */
/*  Storage                                                            */
/* ------------------------------------------------------------------ */

export const storageBreakdown = [
  { name: "Movies", value: 4.1, color: "#7c3aed" },
  { name: "TV Shows", value: 1.6, color: "#3b82f6" },
  { name: "Music", value: 0.68, color: "#10b981" },
  { name: "Others", value: 0.88, color: "#f59e0b" },
];

export const storageTotals = {
  usedTb: 7.2,
  capacityTb: 10,
  freeTb: 2.8,
  usedPercent: 72,
  nasName: "SIDRA-NAS",
};

/* ------------------------------------------------------------------ */
/*  Analytics                                                          */
/* ------------------------------------------------------------------ */

export const downloadsPerDay = [
  { day: "Mon", downloads: 142, completed: 128 },
  { day: "Tue", downloads: 186, completed: 171 },
  { day: "Wed", downloads: 164, completed: 158 },
  { day: "Thu", downloads: 221, completed: 204 },
  { day: "Fri", downloads: 198, completed: 190 },
  { day: "Sat", downloads: 254, completed: 236 },
  { day: "Sun", downloads: 189, completed: 180 },
];

export const storageGrowth = [
  { month: "Feb", tb: 5.1 },
  { month: "Mar", tb: 5.5 },
  { month: "Apr", tb: 5.9 },
  { month: "May", tb: 6.2 },
  { month: "Jun", tb: 6.9 },
  { month: "Jul", tb: 7.2 },
];

export const bandwidthUsage = [
  { hour: "00", gbps: 0.2 }, { hour: "03", gbps: 0.1 }, { hour: "06", gbps: 0.4 },
  { hour: "09", gbps: 0.8 }, { hour: "12", gbps: 0.7 }, { hour: "15", gbps: 1.0 },
  { hour: "18", gbps: 1.2 }, { hour: "21", gbps: 0.9 },
];

export const mediaCategories = [
  { name: "Action", value: 45, color: "#7c3aed" },
  { name: "Sci-Fi", value: 22, color: "#3b82f6" },
  { name: "Drama", value: 14, color: "#10b981" },
  { name: "Docs", value: 11, color: "#f59e0b" },
  { name: "Other", value: 8, color: "#64748b" },
];

export const mostWatched = [
  { title: "Breaking Bad", plays: 94, art: ["#365314", "#1c1917"] as [string, string] },
  { title: "The Dark Knight", plays: 76, art: ["#1e1b4b", "#4c1d95"] as [string, string] },
  { title: "Interstellar", plays: 68, art: ["#0c4a6e", "#1e293b"] as [string, string] },
  { title: "Severance", plays: 61, art: ["#0e7490", "#111827"] as [string, string] },
  { title: "Dune: Part Two", plays: 54, art: ["#78350f", "#1c1917"] as [string, string] },
];

export const topSources = [
  { name: "YouTube", value: 620, color: "#ef4444" },
  { name: "Vimeo", value: 214, color: "#3b82f6" },
  { name: "Direct URL", value: 188, color: "#7c3aed" },
  { name: "NAS Scan", value: 141, color: "#10b981" },
  { name: "Other", value: 91, color: "#64748b" },
];

export const analyticsSummary = [
  { label: "Downloads (This Week)", value: "1,254", delta: 18.6, series: [24, 30, 28, 38, 34, 44, 52, 48, 58, 64, 60, 72], color: "#7c3aed" },
  { label: "Storage Growth", value: "+320 GB", delta: 12.4, series: [10, 14, 12, 18, 22, 20, 26, 30, 28, 34, 38, 42], color: "#3b82f6" },
  { label: "Bandwidth Usage", value: "1.2 TB", delta: -8.3, series: [40, 36, 42, 38, 30, 34, 28, 32, 26, 30, 24, 27], color: "#10b981" },
];

/* ------------------------------------------------------------------ */
/*  System health                                                      */
/* ------------------------------------------------------------------ */

export const systemMetrics: SystemMetric[] = [
  { id: "cpu", label: "CPU", value: "18%", sub: "8 cores · 3.6 GHz", status: "good", series: [12, 16, 14, 22, 18, 26, 20, 24, 16, 19, 15, 18], color: "#7c3aed" },
  { id: "ram", label: "RAM", value: "46%", sub: "14.7 / 32 GB", status: "good", series: [40, 42, 44, 43, 46, 48, 45, 47, 44, 46, 45, 46], color: "#3b82f6" },
  { id: "gpu", label: "GPU", value: "31%", sub: "NVENC · 2 sessions", status: "good", series: [10, 24, 18, 34, 28, 40, 30, 36, 26, 32, 28, 31], color: "#6366f1" },
  { id: "docker", label: "Docker", value: "12", sub: "containers running", status: "good", series: [12, 12, 12, 11, 12, 12, 12, 12, 12, 12, 12, 12], color: "#0ea5e9" },
  { id: "nas-temp", label: "NAS Temp", value: "32°C", sub: "Good", status: "good", series: [30, 31, 31, 32, 33, 32, 31, 32, 33, 32, 32, 32], color: "#10b981" },
  { id: "disk-io", label: "Disk I/O", value: "184 MB/s", sub: "read + write", status: "good", series: [120, 160, 140, 200, 180, 220, 170, 210, 150, 190, 165, 184], color: "#f59e0b" },
  { id: "network", label: "Network", value: "1.2 Gbps", sub: "↑ up / 980 Mbps ↓", status: "good", series: [0.6, 0.8, 0.7, 1.0, 0.9, 1.2, 1.0, 1.1, 0.8, 1.0, 0.9, 1.2], color: "#10b981" },
  { id: "bandwidth", label: "Bandwidth", value: "312 GB", sub: "used today", status: "warn", series: [80, 120, 110, 160, 150, 200, 190, 240, 230, 280, 300, 312], color: "#ef4444" },
];

/* ------------------------------------------------------------------ */
/*  Live streams / NAS / notifications                                 */
/* ------------------------------------------------------------------ */

export const liveStreams = [
  { id: "l1", name: "Lofi Beats 24/7", platform: "YouTube", viewers: "38K watching", uptime: "142h", art: ["#7c3aed", "#312e81"] as [string, string] },
  { id: "l2", name: "NASA ISS Live", platform: "YouTube", viewers: "12K watching", uptime: "2,400h", art: ["#0c4a6e", "#020617"] as [string, string] },
  { id: "l3", name: "EarthCam — NYC", platform: "EarthCam", viewers: "4.1K watching", uptime: "890h", art: ["#334155", "#111827"] as [string, string] },
  { id: "l4", name: "Deep Focus Radio", platform: "YouTube", viewers: "9.6K watching", uptime: "310h", art: ["#065f46", "#022c22"] as [string, string] },
];

export const nasVolumes = [
  { id: "v1", name: "Volume 1 — Media", fs: "Btrfs", usedTb: 6.4, capacityTb: 8, status: "Healthy" },
  { id: "v2", name: "Volume 2 — Backups", fs: "Btrfs", usedTb: 0.8, capacityTb: 2, status: "Healthy" },
];

export const nasDisks = [
  { id: "hd1", name: "Drive 1", model: "WD Red Plus 4TB", temp: 31, health: "Healthy", hours: 18204 },
  { id: "hd2", name: "Drive 2", model: "WD Red Plus 4TB", temp: 32, health: "Healthy", hours: 18204 },
  { id: "hd3", name: "Drive 3", model: "Seagate IronWolf 4TB", temp: 34, health: "Healthy", hours: 9120 },
  { id: "hd4", name: "Drive 4", model: "Seagate IronWolf 4TB", temp: 33, health: "Warning", hours: 9120 },
];

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  time: string;
  kind: "success" | "info" | "warning" | "error";
  unread?: boolean;
}

export const notifications: AppNotification[] = [
  { id: "n1", title: "Download complete", body: "Planet Earth II — S01 E03 finished (2.1 GB).", time: "2m ago", kind: "success", unread: true },
  { id: "n2", title: "New episode available", body: "Severance S02 E08 was added to your library.", time: "18m ago", kind: "info", unread: true },
  { id: "n3", title: "Storage warning", body: "SIDRA-NAS is 72% full. 2.8 TB remaining.", time: "1h ago", kind: "warning", unread: true },
  { id: "n4", title: "NAS scan finished", body: "214 new items indexed from /volume1/media.", time: "3h ago", kind: "success" },
  { id: "n5", title: "Download failed", body: "Top Gear — Bolivia Special: connection reset.", time: "5h ago", kind: "error" },
];

export const recentSearches = ["Interstellar", "Hans Zimmer", "Breaking Bad S05", "4K HDR movies"];
export const trendingSearches = ["Dune Part Two", "Shōgun", "Severance", "Oppenheimer IMAX"];

export const demoWeather = { tempC: 28, condition: "Partly Cloudy", city: "Doha" };

export const appVersion = "v2.0.0";
