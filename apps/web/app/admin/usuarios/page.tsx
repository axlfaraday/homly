"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/shared/admin-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatePanel } from "@/components/shared/state-panel";
import { Badge } from "@/components/ui/badge";
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
  bookingStatusBadge,
  formatDateTime,
  formatStatusLabel,
  shortId,
  supportTicketStatusBadge,
  verificationStatusBadge
} from "@/lib/admin-ui";

interface GroupByStatus {
  status: string;
  _count: { _all: number };
}

interface DashboardData {
  usersTotal: number;
  providersTotal: number;
  bookingsByStatus: GroupByStatus[];
  paymentsByStatus: GroupByStatus[];
  referralsByStatus: GroupByStatus[];
}

interface ProviderItem {
  id: string;
  userId: string;
  fullName: string;
  city: string;
  verificationStatus: "pending" | "approved" | "rejected";
  createdAt: string;
}

interface BookingItem {
  id: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
}

interface TicketItem {
  id: string;
  status: "open" | "in_progress" | "resolved";
}

export default function AdminUsersPage() {
  const [state, setState] = useState<ApiState>("loading");
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [providers, setProviders] = useState<ProviderItem[]>([]);
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [tickets, setTickets] = useState<TicketItem[]>([]);

  const verifiedProviders = useMemo(
    () => providers.filter((item) => item.verificationStatus === "approved").length,
    [providers]
  );
  const pendingProviders = useMemo(
    () => providers.filter((item) => item.verificationStatus === "pending").length,
    [providers]
  );
  const rejectedProviders = useMemo(
    () => providers.filter((item) => item.verificationStatus === "rejected").length,
    [providers]
  );
  const resolvedTickets = useMemo(
    () => tickets.filter((item) => item.status === "resolved").length,
    [tickets]
  );
  const completedBookings = useMemo(
    () => bookings.filter((item) => item.status === "completed").length,
    [bookings]
  );

  function countByStatus(items: GroupByStatus[] | undefined, status: string) {
    return items?.find((item) => item.status === status)?._count._all ?? 0;
  }

  async function load() {
    try {
      const [dashboardData, providerData, bookingData, ticketData] = await Promise.all([
        apiFetch<DashboardData>("/admin/dashboard"),
        apiFetch<ProviderItem[]>("/providers"),
        apiFetch<BookingItem[]>("/bookings/mine"),
        apiFetch<TicketItem[]>("/support/tickets/mine")
      ]);

      setDashboard(dashboardData);
      setProviders(providerData);
      setBookings(bookingData);
      setTickets(ticketData);
      setState("success");
    } catch {
      setState("error");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <AdminShell
      title="Admin · usuarios"
      description="Salud de base instalada, calidad de oferta y funnel operativo."
    >
      <div className="mt-6">
        <StatePanel state={state} />
      </div>

      {dashboard ? (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Usuarios totales</CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-semibold">{dashboard.usersTotal}</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Proveedores</CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-semibold">{dashboard.providersTotal}</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Proveedores verificados</CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-semibold">{verifiedProviders}</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tickets resueltos</CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-semibold">
                {resolvedTickets}/{tickets.length}
              </CardContent>
            </Card>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Verificación de proveedores</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="text-muted-foreground">pending: {pendingProviders}</p>
                <p className="text-muted-foreground">approved: {verifiedProviders}</p>
                <p className="text-muted-foreground">rejected: {rejectedProviders}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Funnel de reservas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="text-muted-foreground">
                  pending: {countByStatus(dashboard.bookingsByStatus, "pending")}
                </p>
                <p className="text-muted-foreground">
                  confirmed: {countByStatus(dashboard.bookingsByStatus, "confirmed")}
                </p>
                <p className="text-muted-foreground">
                  completed: {countByStatus(dashboard.bookingsByStatus, "completed")}
                </p>
                <p className="text-muted-foreground">
                  cancelled: {countByStatus(dashboard.bookingsByStatus, "cancelled")}
                </p>
                <p className="pt-1 font-medium text-foreground">
                  Completadas/Total: {completedBookings}/{bookings.length}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Monetización y referidos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>Pagos:</p>
                {dashboard.paymentsByStatus.map((item) => (
                  <p key={item.status}>
                    {item.status}: {item._count._all}
                  </p>
                ))}
                <p className="pt-2">Referidos:</p>
                {dashboard.referralsByStatus.map((item) => (
                  <p key={item.status}>
                    {item.status}: {item._count._all}
                  </p>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">Proveedores recientes</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Verificación</TableHead>
                    <TableHead>Actividad</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {providers.slice(0, 15).map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <p className="font-medium">{item.fullName}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.city} · user {shortId(item.userId)}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge variant={verificationStatusBadge(item.verificationStatus)}>
                          {formatStatusLabel(item.verificationStatus)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        Alta {formatDateTime(item.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Reservas recientes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {bookings.slice(0, 8).map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                    <span className="font-medium">#{shortId(item.id)}</span>
                    <Badge variant={bookingStatusBadge(item.status)}>
                      {formatStatusLabel(item.status)}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tickets recientes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {tickets.slice(0, 8).map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                    <span className="font-medium">#{shortId(item.id)}</span>
                    <Badge variant={supportTicketStatusBadge(item.status)}>
                      {formatStatusLabel(item.status)}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </AdminShell>
  );
}
