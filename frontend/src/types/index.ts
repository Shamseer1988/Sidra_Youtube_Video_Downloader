// ============================================================
// Sidra Video Downloader — TypeScript Type Definitions
// ============================================================

// ---- User & Auth ----
export interface User {
  id: string;
  username: string;
  email: string;
  role: "admin" | "user";
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

// ---- Downloads ----
export type DownloadStatus =
  | "pending"
  | "downloading"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export type MediaType = "video" | "audio" | "both";

export type Platform =
  | "youtube"
  | "vimeo"
  | "instagram"
  | "facebook"
  | "twitter"
  | "tiktok"
  | "other";

export interface Download {
  id: string;
  url: string;
  title: string;
  thumbnail?: string;
  platform: Platform;
  status: DownloadStatus;
  mediaType: MediaType;
  format: string;
  quality: string;
  resolution?: string;
  fileSize?: number;
  filePath?: string;
  duration?: number;
  progress: number;
  speed?: string;
  eta?: string;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

export interface DownloadRequest {
  url: string;
  formatId?: string;
  quality?: string;
  mediaType?: MediaType;
  outputPath?: string;
}

export interface DownloadProgress {
  id: string;
  progress: number;
  speed: string;
  eta: string;
  status: DownloadStatus;
  fileSize?: number;
}

// ---- Video Formats ----
export interface VideoFormat {
  formatId: string;
  extension: string;
  resolution?: string;
  fps?: number;
  videoCodec?: string;
  audioCodec?: string;
  fileSize?: number;
  bitrate?: number;
  hasVideo: boolean;
  hasAudio: boolean;
  quality: string;
  note?: string;
}

export interface VideoInfo {
  id: string;
  title: string;
  description?: string;
  thumbnail: string;
  duration: number;
  platform: Platform;
  uploader?: string;
  uploadDate?: string;
  viewCount?: number;
  formats: VideoFormat[];
  url: string;
}

export interface PlaylistInfo {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  platform: Platform;
  uploader?: string;
  itemCount: number;
  items: PlaylistItem[];
}

export interface PlaylistItem {
  id: string;
  title: string;
  thumbnail?: string;
  duration?: number;
  url: string;
  index: number;
}

// ---- Media Library ----
export interface MediaFile {
  name: string;
  path: string;
  type: "video" | "audio" | "image" | "other";
  size: number;
  extension: string;
  duration?: number;
  resolution?: string;
  thumbnail?: string;
  createdAt: string;
  modifiedAt: string;
}

export interface MediaDirectory {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: (MediaFile | MediaDirectory)[];
  size?: number;
  modifiedAt?: string;
}

// ---- Settings ----
export interface Setting {
  id: string;
  key: string;
  value: string;
  type: "string" | "number" | "boolean" | "path";
  category: "general" | "paths" | "advanced";
  label: string;
  description?: string;
}

export interface SettingsGroup {
  general: Setting[];
  paths: Setting[];
  advanced: Setting[];
}

// ---- Logs ----
export type LogLevel = "DEBUG" | "INFO" | "WARNING" | "ERROR";

export interface Log {
  id: string;
  timestamp: string;
  level: LogLevel;
  source: string;
  message: string;
}

// ---- API Response ----
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ---- Stats ----
export interface DashboardStats {
  totalDownloads: number;
  activeDownloads: number;
  storageUsed: number;
  totalVideos: number;
  totalAudios: number;
}

export interface ActivityData {
  date: string;
  downloads: number;
  videos: number;
  audios: number;
}

// ---- Notifications ----
export interface Notification {
  id: string;
  type: "info" | "success" | "warning" | "error";
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}
