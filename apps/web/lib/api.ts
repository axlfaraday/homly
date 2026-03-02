import { clearSession } from "@/lib/session";
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export type ApiState = "idle" | "loading" | "success" | "empty" | "error";

export function getToken() {
  if (typeof window === "undefined") {
    return "";
  }
  return localStorage.getItem("homly_access_token") ?? "";
}

function redirectToLoginOnAuthError() {
  if (typeof window === "undefined") {
    return;
  }

  const currentPath = window.location.pathname;
  if (currentPath === "/app/login" || currentPath === "/app/registro") {
    return;
  }

  clearSession();

  const next = `${window.location.pathname}${window.location.search}`;
  window.location.assign(`/app/login?next=${encodeURIComponent(next)}`);
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(init.headers);

  if (!headers.get("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }

  if (token && !headers.get("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers,
      cache: "no-store"
    });
  } catch {
    throw new Error("network_error");
  }

  const text = await response.text();
  let data = {} as T;
  if (text) {
    try {
      data = JSON.parse(text) as T;
    } catch {
      throw new Error("response_parse_error");
    }
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      redirectToLoginOnAuthError();
      throw new Error("auth_required");
    }
    throw new Error(typeof data === "object" ? JSON.stringify(data) : "request_failed");
  }

  return data;
}

export async function trackEvent(
  name: string,
  payload: Record<string, string | number | boolean | null> = {}
) {
  try {
    await apiFetch("/analytics/events", {
      method: "POST",
      body: JSON.stringify({ name, payload })
    });
  } catch {
    // Non-blocking telemetry.
  }
}
