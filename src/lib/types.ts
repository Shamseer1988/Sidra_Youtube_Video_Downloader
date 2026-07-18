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

export interface LibraryItem {
  id: string;
  title: string;
  type: "video" | "audio";
  source: "download" | "nas";
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
