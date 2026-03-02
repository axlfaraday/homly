"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { StatePanel } from "@/components/shared/state-panel";
import { ApiState, apiFetch } from "@/lib/api";

type NotificationFilter = "all" | "unread" | "read";
type RoleScope = "customer" | "provider";

interface NotificationItem {
  id: string;
  kind: string;
  status: string;
  payload: unknown;
  createdAt: string;
  sentAt: string | null;
  unread: boolean;
}

interface UnreadCounter {
  total: number;
}

interface NotificationsInboxProps {
  role: RoleScope;
}

function formatStatus(status: string) {
  return status.replaceAll("_", " ");
}

function asPayload(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return {};
  }
  return payload as Record<string, unknown>;
}

function payloadMessage(item: NotificationItem) {
  const payload = asPayload(item.payload);
  if (typeof payload.message === "string" && payload.message.trim().length > 0) {
    return payload.message;
  }

  if (typeof payload.bookingId === "string") {
    return `Reserva ${payload.bookingId.slice(0, 8)} · ${formatStatus(item.kind)}`;
  }

  if (typeof payload.ticketId === "string") {
    return `Ticket ${payload.ticketId.slice(0, 8)} · ${formatStatus(item.kind)}`;
  }

  return formatStatus(item.kind);
}

function notificationActionHref(item: NotificationItem, role: RoleScope) {
  const payload = asPayload(item.payload);
  if (typeof payload.bookingId === "string") {
    if (role === "customer") {
      return `/app/reservas?bookingId=${payload.bookingId}`;
    }
    return "/proveedor/reservas";
  }

  if (typeof payload.ticketId === "string") {
    return role === "customer" ? "/app/soporte" : "/proveedor/soporte";
  }

  if (item.kind.startsWith("payment_") && role === "customer") {
    return "/app/reservas";
  }

  return null;
}

export function NotificationsInbox({ role }: NotificationsInboxProps) {
  const [state, setState] = useState<ApiState>("loading");
  const [actionState, setActionState] = useState<ApiState>("idle");
  const [actionMessage, setActionMessage] = useState("");
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const [unreadCount, setUnreadCount] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const unreadItems = useMemo(() => items.filter((item) => item.unread).length, [items]);

  async function loadData(silent = false) {
    if (!silent) {
      setState("loading");
    } else {
      setIsRefreshing(true);
    }

    try {
      const [counter, notifications] = await Promise.all([
        apiFetch<UnreadCounter>("/notifications/unread-count"),
        apiFetch<NotificationItem[]>(`/notifications/mine?status=${filter}&limit=100`)
      ]);
      setUnreadCount(counter.total);
      setItems(notifications);
      setState(notifications.length === 0 ? "empty" : "success");
    } catch {
      setState("error");
    } finally {
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [filter]);

  async function markRead(notificationId: string) {
    setBusyId(notificationId);
    setActionState("loading");
    setActionMessage("Marcando notificación como leída...");
    try {
      await apiFetch(`/notifications/${notificationId}/read`, {
        method: "PATCH"
      });
      await loadData(true);
      setActionState("success");
      setActionMessage("Notificación marcada como leída.");
    } catch {
      setActionState("error");
      setActionMessage("No fue posible marcar la notificación.");
    } finally {
      setBusyId(null);
    }
  }

  async function markAllRead() {
    setActionState("loading");
    setActionMessage("Marcando todas como leídas...");
    try {
      await apiFetch("/notifications/read-all", {
        method: "PATCH"
      });
      await loadData(true);
      setActionState("success");
      setActionMessage("Todas las notificaciones fueron marcadas como leídas.");
    } catch {
      setActionState("error");
      setActionMessage("No fue posible marcar todas como leídas.");
    }
  }

  return (
    <>
      <div className="mt-6">
        <StatePanel state={state} />
      </div>

      {actionState !== "idle" ? (
        <div className="mt-4">
          <StatePanel state={actionState} description={actionMessage} />
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">No leídas globales</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{unreadCount}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">No leídas en filtro</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{unreadItems}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Total cargadas</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{items.length}</CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Gestión de bandeja</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Select value={filter} onValueChange={(value: NotificationFilter) => setFilter(value)}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Filtro" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="unread">No leídas</SelectItem>
              <SelectItem value="read">Leídas</SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            disabled={isRefreshing}
            onClick={() => {
              void loadData(true);
            }}
          >
            {isRefreshing ? "Actualizando..." : "Actualizar"}
          </Button>
          <Button size="sm" disabled={unreadCount === 0} onClick={() => void markAllRead()}>
            Marcar todas como leídas
          </Button>
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-3">
        {items.map((item) => {
          const href = notificationActionHref(item, role);
          return (
            <Card key={item.id}>
              <CardContent className="pt-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={item.unread ? "secondary" : "outline"}>
                        {item.unread ? "No leída" : "Leída"}
                      </Badge>
                      <Badge variant="outline">{formatStatus(item.kind)}</Badge>
                    </div>
                    <p className="text-sm text-foreground">{payloadMessage(item)}</p>
                    <p className="text-xs text-muted-foreground">
                      creada {new Date(item.createdAt).toLocaleString()} · status {formatStatus(item.status)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {href ? (
                      <Button asChild size="sm" variant="outline">
                        <Link href={href}>Abrir contexto</Link>
                      </Button>
                    ) : null}
                    {item.unread ? (
                      <Button
                        size="sm"
                        disabled={busyId === item.id}
                        onClick={() => {
                          void markRead(item.id);
                        }}
                      >
                        Marcar leída
                      </Button>
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
