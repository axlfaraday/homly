import type { BadgeProps } from "@/components/ui/badge";

type BadgeVariant = NonNullable<BadgeProps["variant"]>;

export function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "N/A";
  }

  return new Date(value).toLocaleString();
}

export function formatStatusLabel(status: string) {
  return status.replaceAll("_", " ");
}

export function shortId(value: string, size = 8) {
  return value.slice(0, size);
}

export function bookingStatusBadge(status: string): BadgeVariant {
  switch (status) {
    case "completed":
      return "default";
    case "cancelled":
      return "destructive";
    case "confirmed":
      return "secondary";
    default:
      return "outline";
  }
}

export function verificationStatusBadge(status: string): BadgeVariant {
  switch (status) {
    case "approved":
      return "default";
    case "rejected":
      return "destructive";
    default:
      return "secondary";
  }
}

export function supportTicketStatusBadge(status: string): BadgeVariant {
  switch (status) {
    case "resolved":
      return "default";
    case "in_progress":
      return "secondary";
    default:
      return "outline";
  }
}

export function severityBadge(severity: string): BadgeVariant {
  switch (severity) {
    case "high":
      return "destructive";
    case "medium":
      return "secondary";
    default:
      return "outline";
  }
}

export function alertStatusBadge(status: string): BadgeVariant {
  switch (status) {
    case "resolved":
      return "default";
    case "acknowledged":
      return "secondary";
    default:
      return "outline";
  }
}

export function riskBadge(level: string): BadgeVariant {
  switch (level) {
    case "high":
      return "destructive";
    case "medium":
      return "secondary";
    default:
      return "default";
  }
}
