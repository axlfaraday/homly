"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/shared/admin-shell";
import { StatePanel } from "@/components/shared/state-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { ApiState, apiFetch } from "@/lib/api";
import {
  alertStatusBadge,
  bookingStatusBadge,
  formatDateTime,
  formatStatusLabel,
  riskBadge,
  severityBadge,
  shortId
} from "@/lib/admin-ui";

type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled";

interface GroupByStatus {
  status: string;
  _count: { _all: number };
}

interface DashboardData {
  usersTotal: number;
  providersTotal: number;
  servicesTotal: number;
  bookingsTotal: number;
  bookingsByStatus: GroupByStatus[];
  reviewsTotal: number;
  ticketsOpen: number;
  paymentsByStatus: GroupByStatus[];
  referralsByStatus: GroupByStatus[];
}

interface BookingItem {
  id: string;
  customerId: string;
  providerId: string;
  serviceId: string;
  status: BookingStatus;
  scheduledAt: string;
  createdAt: string;
  notes: string | null;
}

interface BookingRisk {
  bookingId: string;
  riskScore: number;
  level: "low" | "medium" | "high";
}

interface OpsAlert {
  id: string;
  bookingId: string | null;
  type: string;
  message: string;
  severity: "low" | "medium" | "high";
  status: "open" | "acknowledged" | "resolved";
  createdAt: string;
}

export default function AdminOrdersPage() {
  const [state, setState] = useState<ApiState>("loading");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | BookingStatus>("all");
  const [data, setData] = useState<DashboardData | null>(null);
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [alerts, setAlerts] = useState<OpsAlert[]>([]);
  const [risks, setRisks] = useState<Record<string, BookingRisk | null>>({});
  const [savingBookingId, setSavingBookingId] = useState<string | null>(null);
  const [actionState, setActionState] = useState<ApiState>("idle");
  const [actionMessage, setActionMessage] = useState("");

  const filteredBookings = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return bookings.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) {
        return false;
      }

      if (!normalized) {
        return true;
      }

      return (
        item.id.toLowerCase().includes(normalized) ||
        item.customerId.toLowerCase().includes(normalized) ||
        item.providerId.toLowerCase().includes(normalized) ||
        item.serviceId.toLowerCase().includes(normalized)
      );
    });
  }, [bookings, query, statusFilter]);

  function countFromGroup(items: GroupByStatus[] | undefined, status: string) {
    return items?.find((item) => item.status === status)?._count._all ?? 0;
  }

  async function load(silent = false) {
    if (!silent) {
      setState("loading");
    }

    try {
      const [dashboard, bookingData, alertData] = await Promise.all([
        apiFetch<DashboardData>("/admin/dashboard"),
        apiFetch<BookingItem[]>("/bookings/mine"),
        apiFetch<OpsAlert[]>("/admin/alerts")
      ]);

      setData(dashboard);
      setBookings(bookingData);
      setAlerts(alertData);

      const riskEntries = await Promise.all(
        bookingData.slice(0, 50).map(async (item) => {
          try {
            const risk = await apiFetch<BookingRisk>(`/bookings/${item.id}/risk`);
            return [item.id, risk] as const;
          } catch {
            return [item.id, null] as const;
          }
        })
      );
      setRisks(Object.fromEntries(riskEntries));
      setState(bookingData.length === 0 ? "empty" : "success");
    } catch {
      setState("error");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function updateBookingStatus(booking: BookingItem, nextStatus: BookingStatus) {
    setSavingBookingId(booking.id);
    setActionState("loading");
    setActionMessage("Actualizando estado de reserva...");

    try {
      await apiFetch(`/bookings/${booking.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus })
      });
      await load(true);
      setActionState("success");
      setActionMessage(`Reserva ${shortId(booking.id)} actualizada a ${formatStatusLabel(nextStatus)}.`);
    } catch {
      setActionState("error");
      setActionMessage(`No fue posible actualizar la reserva ${shortId(booking.id)}.`);
    } finally {
      setSavingBookingId(null);
    }
  }

  async function refreshAlerts() {
    setActionState("loading");
    setActionMessage("Generando alertas operativas...");
    try {
      const response = await apiFetch<{ createdAlerts: number }>("/admin/alerts/refresh");
      await load(true);
      setActionState("success");
      setActionMessage(`Se generaron ${response.createdAlerts} alertas.`);
    } catch {
      setActionState("error");
      setActionMessage("No se pudieron regenerar alertas.");
    }
  }

  async function dispatchNudges() {
    setActionState("loading");
    setActionMessage("Despachando nudges pendientes...");
    try {
      const response = await apiFetch<{ dispatched: number }>("/admin/nudges/dispatch");
      await load(true);
      setActionState("success");
      setActionMessage(`Nudges enviados: ${response.dispatched}.`);
    } catch {
      setActionState("error");
      setActionMessage("No se pudieron despachar nudges.");
    }
  }

  return (
    <AdminShell
      title="Admin · órdenes y operación"
      description="Visión consolidada de reservas, riesgo, alertas y ejecución operativa."
    >
      <div className="mt-6">
        <StatePanel state={state} />
      </div>

      {actionState !== "idle" ? (
        <div className="mt-4">
          <StatePanel state={actionState} description={actionMessage} />
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-2">
        <Button
          variant="outline"
          onClick={() => {
            void load();
          }}
        >
          Recargar datos
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            void refreshAlerts();
          }}
        >
          Regenerar alertas
        </Button>
        <Button
          onClick={() => {
            void dispatchNudges();
          }}
        >
          Despachar nudges
        </Button>
      </div>

      {data ? (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Usuarios</CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-semibold">{data.usersTotal}</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Proveedores</CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-semibold">{data.providersTotal}</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Servicios</CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-semibold">{data.servicesTotal}</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Reservas</CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-semibold">{data.bookingsTotal}</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Reseñas</CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-semibold">{data.reviewsTotal}</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tickets abiertos</CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-semibold">{data.ticketsOpen}</CardContent>
            </Card>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Reservas por estado</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm text-muted-foreground">
                <p>pending: {countFromGroup(data.bookingsByStatus, "pending")}</p>
                <p>confirmed: {countFromGroup(data.bookingsByStatus, "confirmed")}</p>
                <p>completed: {countFromGroup(data.bookingsByStatus, "completed")}</p>
                <p>cancelled: {countFromGroup(data.bookingsByStatus, "cancelled")}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pagos por estado</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm text-muted-foreground">
                {data.paymentsByStatus.length === 0 ? (
                  <p>Sin pagos registrados.</p>
                ) : (
                  data.paymentsByStatus.map((item) => (
                    <p key={item.status}>
                      {item.status}: {item._count._all}
                    </p>
                  ))
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Referidos por estado</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm text-muted-foreground">
                {data.referralsByStatus.length === 0 ? (
                  <p>Sin referidos registrados.</p>
                ) : (
                  data.referralsByStatus.map((item) => (
                    <p key={item.status}>
                      {item.status}: {item._count._all}
                    </p>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">Gestión de reservas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 grid gap-3 md:grid-cols-3">
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar por IDs de reserva/cliente/proveedor/servicio"
                />
                <Select
                  value={statusFilter}
                  onValueChange={(value: "all" | BookingStatus) => setStatusFilter(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center text-sm text-muted-foreground">
                  Mostrando {filteredBookings.length} de {bookings.length} reservas
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reserva</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Riesgo</TableHead>
                    <TableHead>Agenda</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBookings.map((booking) => {
                    const risk = risks[booking.id];
                    return (
                      <TableRow key={booking.id}>
                        <TableCell>
                          <p className="font-medium">#{shortId(booking.id)}</p>
                          <p className="text-xs text-muted-foreground">
                            c {shortId(booking.customerId)} · p {shortId(booking.providerId)} · s{" "}
                            {shortId(booking.serviceId)}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge variant={bookingStatusBadge(booking.status)}>
                            {formatStatusLabel(booking.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {risk ? (
                            <div className="space-y-1">
                              <Badge variant={riskBadge(risk.level)}>{risk.level}</Badge>
                              <p className="text-xs text-muted-foreground">
                                score {risk.riskScore.toFixed(2)}
                              </p>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">No disponible</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          <p>{formatDateTime(booking.scheduledAt)}</p>
                          <p>creada {formatDateTime(booking.createdAt)}</p>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={booking.status === "pending" || savingBookingId === booking.id}
                              onClick={() => {
                                void updateBookingStatus(booking, "pending");
                              }}
                            >
                              Pending
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={booking.status === "confirmed" || savingBookingId === booking.id}
                              onClick={() => {
                                void updateBookingStatus(booking, "confirmed");
                              }}
                            >
                              Confirm
                            </Button>
                            <Button
                              size="sm"
                              disabled={booking.status === "completed" || savingBookingId === booking.id}
                              onClick={() => {
                                void updateBookingStatus(booking, "completed");
                              }}
                            >
                              Completar
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={booking.status === "cancelled" || savingBookingId === booking.id}
                              onClick={() => {
                                void updateBookingStatus(booking, "cancelled");
                              }}
                            >
                              Cancelar
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">Alertas operativas</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Alerta</TableHead>
                    <TableHead>Severidad</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alerts.slice(0, 50).map((alert) => (
                    <TableRow key={alert.id}>
                      <TableCell>
                        <p className="font-medium">{alert.type}</p>
                        <p className="text-sm text-muted-foreground">{alert.message}</p>
                        <p className="text-xs text-muted-foreground">
                          booking {alert.bookingId ? shortId(alert.bookingId) : "N/A"}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge variant={severityBadge(alert.severity)}>{alert.severity}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={alertStatusBadge(alert.status)}>
                          {formatStatusLabel(alert.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDateTime(alert.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : null}
    </AdminShell>
  );
}
