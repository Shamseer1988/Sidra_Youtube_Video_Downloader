"use client";

// Thin client-side API helpers over the app's own /api routes.

async function unwrap<T>(res: Response): Promise<T> {
  // Bounce expired sessions to the login page — but never while on the
  // login flow itself, where a 401 means "wrong credentials" and must be
  // shown to the user instead of silently reloading the page.
  if (
    res.status === 401 &&
    typeof window !== "undefined" &&
    !res.url.includes("/api/auth/") &&
    window.location.pathname !== "/login"
  ) {
    window.location.href = "/login";
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    throw new Error(json.message || `Request failed (${res.status})`);
  }
  return json.data as T;
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(path, { credentials: "include" });
  return unwrap<T>(res);
}

export async function apiSend<T>(
  method: "POST" | "PATCH" | "PUT" | "DELETE",
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(path, {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return unwrap<T>(res);
}
