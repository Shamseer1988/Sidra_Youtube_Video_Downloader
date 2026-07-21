// Shared client-side types.

export interface CurrentUser {
  id: string;
  username: string;
  email: string;
  role: "admin" | "user";
  avatarColor: string;
}

export interface MediaState {
  favorite: boolean;
  watchLater: boolean;
  liked: boolean;
  position: number;
  finished: boolean;
}

export interface AudioTrack {
  id: number;
  label: string;
  language: string | null;
  channels?: number | null;
  isDefault?: boolean;
}

export interface SubtitleTrack {
  id: number;
  label: string;
  language: string | null;
  source: "embedded" | "external";
}

export interface LibraryItem {
  id: string;
  title: string;
  type: "video" | "audio";
  source: "download" | "nas";
  category: string;
  folder: string;
  libraryId: string | null;
  size: number;
  duration: number | null;
  width: number | null;
  height: number | null;
  ext: string | null;
  thumbnail: string | null;
  createdAt: string;
  mtime: string;
  state: MediaState;
}

export interface DownloadJob {
  id: string;
  url: string;
  title: string;
  thumbnail: string | null;
  platform: string;
  mediaType: "video" | "audio";
  status: "queued" | "downloading" | "completed" | "failed" | "canceled";
  progress: number;
  speed: string | null;
  eta: string | null;
  fileSize: number | null;
  duration: number | null;
  libraryId: string | null;
  error: string | null;
  createdAt: string;
}

export interface LibraryDTO {
  id: string;
  name: string;
  path: string;
  category: "movies" | "tv" | "videos" | "music";
  kind: "video" | "audio";
  itemCount: number;
}

export interface PlaylistSummary {
  id: string;
  name: string;
  count: number;
  updatedAt: string;
}

export interface DashboardData {
  stats: {
    totalDownloads: number;
    activeDownloads: number;
    totalVideos: number;
    totalAudios: number;
    storageUsed: number;
  };
  recentDownloaded: LibraryItem[];
  recentUploaded: LibraryItem[];
  continueWatching: LibraryItem[];
  activity: { date: string; videos: number; audios: number }[];
}
