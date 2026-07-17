import type { ApiResponse } from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

class ApiError extends Error {
  status: number;
  data?: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.status === 401) {
    if (typeof window !== "undefined" && window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
    throw new ApiError("Unauthorized", 401);
  }

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      errorData = { message: response.statusText };
    }
    throw new ApiError(
      errorData?.message || errorData?.error || "An error occurred",
      response.status,
      errorData
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

function buildUrl(endpoint: string, params?: Record<string, string | number | boolean | undefined>): string {
  const url = new URL(`${API_BASE_URL}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, String(value));
      }
    });
  }
  return url.toString();
}

export async function get<T>(
  endpoint: string,
  params?: Record<string, string | number | boolean | undefined>
): Promise<T> {
  const url = buildUrl(endpoint, params);
  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  });
  return handleResponse<T>(response);
}

export async function post<T>(endpoint: string, body?: unknown): Promise<T> {
  const url = buildUrl(endpoint);
  const response = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(response);
}

export async function put<T>(endpoint: string, body?: unknown): Promise<T> {
  const url = buildUrl(endpoint);
  const response = await fetch(url, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(response);
}

export async function del<T>(endpoint: string): Promise<T> {
  const url = buildUrl(endpoint);
  const response = await fetch(url, {
    method: "DELETE",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  });
  return handleResponse<T>(response);
}

// ---- Typed API methods ----
export const api = {
  // Auth
  login: (username: string, password: string) =>
    post<ApiResponse<{ user: import("@/types").User; token: string }>>("/api/auth/login", { username, password }),
  logout: () => post<ApiResponse<null>>("/api/auth/logout"),
  getMe: () => get<ApiResponse<import("@/types").User>>("/api/auth/me"),

  // Downloads
  getDownloads: (params?: Record<string, string | number | boolean | undefined>) =>
    get<ApiResponse<import("@/types").PaginatedResponse<import("@/types").Download>>>("/api/downloads", params),
  getDownload: (id: string) =>
    get<ApiResponse<import("@/types").Download>>(`/api/downloads/${id}`),
  createDownload: (data: import("@/types").DownloadRequest) =>
    post<ApiResponse<import("@/types").Download>>("/api/downloads", data),
  cancelDownload: (id: string) =>
    post<ApiResponse<null>>(`/api/downloads/${id}/cancel`),
  retryDownload: (id: string) =>
    post<ApiResponse<import("@/types").Download>>(`/api/downloads/${id}/retry`),
  deleteDownload: (id: string) =>
    del<ApiResponse<null>>(`/api/downloads/${id}`),
  extractInfo: (url: string) =>
    post<ApiResponse<import("@/types").VideoInfo>>("/api/downloads/extract", { url }),

  // Media
  getVideos: (params?: Record<string, string | number | boolean | undefined>) =>
    get<ApiResponse<import("@/types").PaginatedResponse<import("@/types").MediaFile>>>("/api/media/videos", params),
  getAudios: (params?: Record<string, string | number | boolean | undefined>) =>
    get<ApiResponse<import("@/types").PaginatedResponse<import("@/types").MediaFile>>>("/api/media/audios", params),
  browseMedia: (path?: string) =>
    get<ApiResponse<any>>("/api/media/browse", { path }),

  // Settings
  getSettings: () =>
    get<ApiResponse<import("@/types").Setting[]>>("/api/settings"),
  updateSettings: (data: Record<string, any>) =>
    put<ApiResponse<Record<string, any>>>("/api/settings", data),
  browsePath: (path?: string) =>
    get<ApiResponse<any>>("/api/settings/paths/browse", { path }),

  // Users
  getUsers: () =>
    get<ApiResponse<import("@/types").User[]>>("/api/users"),
  createUser: (data: { username: string; email: string; password: string; role: string }) =>
    post<ApiResponse<import("@/types").User>>("/api/users", data),
  updateUser: (id: string, data: Partial<import("@/types").User>) =>
    put<ApiResponse<import("@/types").User>>(`/api/users/${id}`, data),
  deleteUser: (id: string) =>
    del<ApiResponse<null>>(`/api/users/${id}`),

  // Logs
  getLogs: (params?: Record<string, string | number | boolean | undefined>) =>
    get<ApiResponse<import("@/types").Log[]>>("/api/logs", params),
  clearLogs: () =>
    del<ApiResponse<null>>("/api/logs"),

  // Stats
  getStats: () =>
    get<ApiResponse<import("@/types").DashboardStats>>("/api/stats"),
  getActivity: (days?: number) =>
    get<ApiResponse<import("@/types").ActivityData[]>>("/api/stats/activity", { days }),
};

export { ApiError };
export default api;
