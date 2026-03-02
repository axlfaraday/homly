export type AppRole = "customer" | "provider" | "admin";

export interface StoredSession {
  token: string;
  userId: string;
  role: AppRole;
}

const ROLE_HOME: Record<AppRole, string> = {
  customer: "/app/dashboard",
  provider: "/proveedor/dashboard",
  admin: "/admin/ordenes"
};

function isRole(value: string): value is AppRole {
  return value === "customer" || value === "provider" || value === "admin";
}

function normalizeNextPath(next?: string | null): string | null {
  if (!next || !next.startsWith("/")) {
    return null;
  }

  if (next.startsWith("//") || next.startsWith("/app/login") || next.startsWith("/app/registro")) {
    return null;
  }

  return next;
}

export function getRoleHome(role: AppRole) {
  return ROLE_HOME[role];
}

export function resolvePostAuthPath(role: AppRole, next?: string | null) {
  const normalized = normalizeNextPath(next);
  if (!normalized) {
    return getRoleHome(role);
  }
  return normalized;
}

export function readStoredSession(): StoredSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const token = localStorage.getItem("homly_access_token") ?? "";
  const userId = localStorage.getItem("homly_user_id") ?? "";
  const roleRaw = localStorage.getItem("homly_user_role") ?? "";

  if (!token || !userId || !isRole(roleRaw)) {
    return null;
  }

  return {
    token,
    userId,
    role: roleRaw
  };
}

export function persistSession(session: StoredSession) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem("homly_access_token", session.token);
  localStorage.setItem("homly_user_id", session.userId);
  localStorage.setItem("homly_user_role", session.role);
}

export function clearSession() {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem("homly_access_token");
  localStorage.removeItem("homly_user_id");
  localStorage.removeItem("homly_user_role");
}
