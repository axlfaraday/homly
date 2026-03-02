"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatePanel } from "@/components/shared/state-panel";
import { WorkspaceShell } from "@/components/shared/workspace-shell";
import { ApiState, apiFetch, trackEvent } from "@/lib/api";

type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled";
type TicketStatus = "open" | "in_progress" | "resolved";

interface BookingItem {
  id: string;
  status: BookingStatus;
  scheduledAt: string;
  createdAt: string;
}

interface TicketItem {
  id: string;
  status: TicketStatus;
  subject: string;
  createdAt: string;
}

interface BookingPlanItem {
  id: string;
  serviceId: string;
  frequency: string;
  nextRunAt: string;
  active: boolean;
  totalRuns: number;
  service?: {
    id: string;
    title: string;
  };
}

interface PaymentSummary {
  bookingId: string;
  status: string;
}

interface ActivityItem {
  type: "booking" | "ticket";
  id: string;
  status: string;
  createdAt: string;
  label: string;
}

function formatStatusLabel(status: string) {
  return status.replaceAll("_", " ");
}

function bookingBadgeVariant(status: BookingStatus) {
  if (status === "completed") return "default";
  if (status === "cancelled") return "destructive";
  if (status === "confirmed") return "secondary";
  return "outline";
}

function ticketBadgeVariant(status: TicketStatus) {
  if (status === "resolved") return "default";
  if (status === "in_progress") return "secondary";
  return "outline";
}

export default function CustomerDashboardPage() {
  const [state, setState] = useState<ApiState>("loading");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [plans, setPlans] = useState<BookingPlanItem[]>([]);
  const [payments, setPayments] = useState<Record<string, string>>({});
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState("");

  async function loadData(silent = false) {
    if (!silent) {
      setState("loading");
    } else {
      setIsRefreshing(true);
    }

    try {
      const [bookingsData, ticketsData, plansData] = await Promise.all([
        apiFetch<BookingItem[]>("/bookings/mine"),
        apiFetch<TicketItem[]>("/support/tickets/mine"),
        apiFetch<BookingPlanItem[]>("/bookings/plans/mine")
      ]);

      const paymentEntries = await Promise.all(
        bookingsData.map(async (booking) => {
          try {
            const payment = await apiFetch<PaymentSummary>(`/payments/booking/${booking.id}`);
            return [booking.id, payment.status] as const;
          } catch {
            return [booking.id, "sin_checkout"] as const;
          }
        })
      );

      setBookings(bookingsData);
      setTickets(ticketsData);
      setPlans(plansData);
      setPayments(Object.fromEntries(paymentEntries));
      setLastUpdatedAt(new Date().toISOString());
      setSyncMessage("");

      setState(
        bookingsData.length === 0 && ticketsData.length === 0 && plansData.length === 0
          ? "empty"
          : "success"
      );

      void trackEvent("dashboard_viewed", {
        bookingsTotal: bookingsData.length,
        ticketsTotal: ticketsData.length,
        activePlans: plansData.filter((item) => item.active).length,
        pendingBookings: bookingsData.filter((item) => item.status === "pending").length,
        activeTickets: ticketsData.filter((item) => item.status !== "resolved").length
      });
    } catch {
      setState("error");
      setSyncMessage("No se pudo sincronizar la información del dashboard.");
    } finally {
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const pendingBookings = useMemo(
    () => bookings.filter((item) => item.status === "pending").length,
    [bookings]
  );
  const paymentsPendingConfirmation = useMemo(
    () =>
      Object.values(payments).filter((status) => status === "requires_confirmation").length,
    [payments]
  );
  const ticketsInProgress = useMemo(
    () => tickets.filter((item) => item.status === "open" || item.status === "in_progress").length,
    [tickets]
  );
  const activePlans = useMemo(() => plans.filter((item) => item.active).length, [plans]);
  const nextPlan = useMemo(() => {
    const next = plans
      .filter((item) => item.active)
      .sort((a, b) => new Date(a.nextRunAt).getTime() - new Date(b.nextRunAt).getTime());
    return next[0] ?? null;
  }, [plans]);

  const bookingDistribution = useMemo(
    () => ({
      pending: bookings.filter((item) => item.status === "pending").length,
      confirmed: bookings.filter((item) => item.status === "confirmed").length,
      completed: bookings.filter((item) => item.status === "completed").length,
      cancelled: bookings.filter((item) => item.status === "cancelled").length
    }),
    [bookings]
  );

  const ticketDistribution = useMemo(
    () => ({
      open: tickets.filter((item) => item.status === "open").length,
      inProgress: tickets.filter((item) => item.status === "in_progress").length,
      resolved: tickets.filter((item) => item.status === "resolved").length
    }),
    [tickets]
  );

  const upcomingBooking = useMemo(() => {
    if (bookings.length === 0) {
      return null;
    }

    const sorted = [...bookings].sort(
      (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    );
    const now = Date.now();
    return sorted.find((item) => new Date(item.scheduledAt).getTime() >= now) ?? sorted[0];
  }, [bookings]);

  const recentActivity = useMemo(() => {
    const bookingActivity: ActivityItem[] = bookings.map((item) => ({
      type: "booking",
      id: item.id,
      status: item.status,
      createdAt: item.createdAt ?? item.scheduledAt,
      label: `Reserva ${item.id.slice(0, 8)}`
    }));

    const ticketActivity: ActivityItem[] = tickets.map((item) => ({
      type: "ticket",
      id: item.id,
      status: item.status,
      createdAt: item.createdAt,
      label: item.subject || `Ticket ${item.id.slice(0, 8)}`
    }));

    return [...bookingActivity, ...ticketActivity]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [bookings, tickets]);

  return (
    <WorkspaceShell
      section="Cliente"
      title="Dashboard cliente"
      description="Resumen de reservas, mensajes y soporte para actuar más rápido."
      links={[
        { href: "/app/buscar", label: "Contratar servicio" },
        { href: "/app/reservas", label: "Mis reservas" },
        { href: "/app/mensajes", label: "Mensajes" },
        { href: "/app/notificaciones", label: "Notificaciones" }
      ]}
    >
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
        <p className="text-sm text-muted-foreground">
          {lastUpdatedAt
            ? `Última actualización: ${new Date(lastUpdatedAt).toLocaleString()}`
            : "Sincronizando por primera vez..."}
        </p>
        <Button
          size="sm"
          variant="outline"
          disabled={isRefreshing}
          onClick={() => {
            void trackEvent("dashboard_refresh_clicked");
            void loadData(true);
          }}
        >
          {isRefreshing ? "Actualizando..." : "Actualizar"}
        </Button>
      </div>

      {state === "loading" || state === "error" || state === "empty" ? (
        <div className="mt-6">
          <StatePanel
            state={state}
            description={
              state === "empty"
                ? "Aún no tienes reservas ni tickets. Comienza buscando un proveedor."
                : syncMessage || undefined
            }
          />
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Reservas</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{bookings.length}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pendientes</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{pendingBookings}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tickets activos</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{ticketsInProgress}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Planes activos</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{activePlans}</CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Próxima reserva</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {upcomingBooking ? (
            <>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant={bookingBadgeVariant(upcomingBooking.status)}>
                  {formatStatusLabel(upcomingBooking.status)}
                </Badge>
                <span className="text-muted-foreground">
                  {new Date(upcomingBooking.scheduledAt).toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Reserva #{upcomingBooking.id.slice(0, 8)}
              </p>
              <Button asChild size="sm">
                <Link
                  href={`/app/reservas?bookingId=${upcomingBooking.id}`}
                  onClick={() => {
                    void trackEvent("dashboard_next_booking_clicked", {
                      bookingId: upcomingBooking.id
                    });
                  }}
                >
                  Ver próxima reserva
                </Link>
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                No tienes reservas aún. Encuentra un proveedor y agenda en minutos.
              </p>
              <Button asChild size="sm">
                <Link
                  href="/app/buscar"
                  onClick={() => {
                    void trackEvent("dashboard_search_cta_clicked");
                  }}
                >
                  Buscar proveedores
                </Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Recurrencia</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {nextPlan ? (
            <>
              <p className="text-muted-foreground">
                Próxima ejecución:{" "}
                <span className="text-foreground">{new Date(nextPlan.nextRunAt).toLocaleString()}</span>
              </p>
              <p className="text-muted-foreground">
                Servicio: <span className="text-foreground">{nextPlan.service?.title ?? nextPlan.serviceId}</span>
              </p>
              <p className="text-muted-foreground">
                Frecuencia: <span className="text-foreground">{formatStatusLabel(nextPlan.frequency)}</span>
              </p>
              <Button asChild size="sm" variant="outline">
                <Link
                  href="/app/reservas"
                  onClick={() => {
                    void trackEvent("dashboard_recurring_plan_clicked", {
                      planId: nextPlan.id
                    });
                  }}
                >
                  Gestionar recurrencia
                </Link>
              </Button>
            </>
          ) : (
            <>
              <p className="text-muted-foreground">
                No tienes planes recurrentes activos. Crea uno desde una reserva para automatizar tu
                próxima contratación.
              </p>
              <Button asChild size="sm" variant="outline">
                <Link
                  href="/app/reservas"
                  onClick={() => {
                    void trackEvent("dashboard_recurring_plan_create_cta");
                  }}
                >
                  Crear plan recurrente
                </Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Acciones pendientes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Reservas por confirmar</span>
              <Badge variant={pendingBookings > 0 ? "secondary" : "outline"}>{pendingBookings}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Tickets en curso</span>
              <Badge variant={ticketsInProgress > 0 ? "secondary" : "outline"}>
                {ticketsInProgress}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Pagos por confirmar</span>
              <Badge variant={paymentsPendingConfirmation > 0 ? "destructive" : "outline"}>
                {paymentsPendingConfirmation}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button asChild size="sm" variant="outline">
                <Link
                  href="/app/reservas"
                  onClick={() => {
                    void trackEvent("dashboard_pending_bookings_clicked");
                  }}
                >
                  Ver reservas
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link
                  href="/app/soporte"
                  onClick={() => {
                    void trackEvent("dashboard_pending_tickets_clicked");
                  }}
                >
                  Ir a soporte
                </Link>
              </Button>
            </div>
            {pendingBookings === 0 && ticketsInProgress === 0 && paymentsPendingConfirmation === 0 ? (
              <p className="text-xs text-muted-foreground">No tienes acciones pendientes por ahora.</p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribución reservas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>pending: {bookingDistribution.pending}</p>
            <p>confirmed: {bookingDistribution.confirmed}</p>
            <p>completed: {bookingDistribution.completed}</p>
            <p>cancelled: {bookingDistribution.cancelled}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribución tickets</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>open: {ticketDistribution.open}</p>
            <p>in progress: {ticketDistribution.inProgress}</p>
            <p>resolved: {ticketDistribution.resolved}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Actividad reciente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentActivity.length > 0 ? (
            recentActivity.map((item) => (
              <div
                key={`${item.type}:${item.id}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {item.type === "booking" ? "Reserva" : "Ticket"} #{item.id.slice(0, 8)}
                  </p>
                  <p className="text-muted-foreground">
                    {item.type === "ticket" ? item.label : "Movimiento de reserva"}
                  </p>
                </div>
                <div className="text-right">
                  <Badge
                    variant={
                      item.type === "booking"
                        ? bookingBadgeVariant(item.status as BookingStatus)
                        : ticketBadgeVariant(item.status as TicketStatus)
                    }
                  >
                    {formatStatusLabel(item.status)}
                  </Badge>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(item.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Todavía no hay actividad registrada.</p>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 flex flex-wrap gap-3">
        {bookings.length === 0 ? (
          <Button asChild>
            <Link
              href="/app/buscar"
              onClick={() => {
                void trackEvent("dashboard_primary_search_clicked");
              }}
            >
              Buscar proveedores
            </Link>
          </Button>
        ) : (
          <Button asChild>
            <Link
              href={upcomingBooking ? `/app/reservas?bookingId=${upcomingBooking.id}` : "/app/reservas"}
              onClick={() => {
                void trackEvent("dashboard_primary_next_booking_clicked");
              }}
            >
              {upcomingBooking ? "Ir a próxima reserva" : "Ver reservas"}
            </Link>
          </Button>
        )}
        <Button asChild variant="outline">
          <Link
            href="/app/mensajes"
            onClick={() => {
              void trackEvent("dashboard_messages_clicked");
            }}
          >
            Mensajes
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link
            href="/app/soporte"
            onClick={() => {
              void trackEvent("dashboard_support_clicked");
            }}
          >
            Soporte
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/app/notificaciones">Notificaciones</Link>
        </Button>
      </div>
    </WorkspaceShell>
  );
}
