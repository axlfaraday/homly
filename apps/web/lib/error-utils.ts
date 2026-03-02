const KNOWN_ERROR_MESSAGES: Record<string, string> = {
  network_error: "No hay conexión con el servidor. Revisa tu red e inténtalo nuevamente.",
  auth_required: "Tu sesión expiró o no tienes permisos. Inicia sesión nuevamente.",
  request_failed: "No fue posible completar la operación.",
  response_parse_error: "La respuesta del servidor no pudo procesarse. Intenta de nuevo."
};

function normalizeMessage(value: unknown): string | null {
  if (typeof value === "string") {
    const next = value.trim();
    return next.length > 0 ? next : null;
  }

  if (Array.isArray(value)) {
    const items = value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter((item) => item.length > 0);
    return items.length > 0 ? items.join(", ") : null;
  }

  return null;
}

export function parseApiErrorMessage(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed) as { message?: unknown; error?: unknown };
    return normalizeMessage(parsed.message) ?? normalizeMessage(parsed.error);
  } catch {
    return null;
  }
}

export function resolveErrorMessage(
  error: unknown,
  fallback = "No fue posible completar la operación."
) {
  if (!(error instanceof Error)) {
    return fallback;
  }

  const direct = error.message.trim();
  if (!direct) {
    return fallback;
  }

  if (KNOWN_ERROR_MESSAGES[direct]) {
    return KNOWN_ERROR_MESSAGES[direct];
  }

  return parseApiErrorMessage(direct) ?? direct;
}
