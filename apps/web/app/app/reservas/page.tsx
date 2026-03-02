"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatePanel } from "@/components/shared/state-panel";
import { WorkspaceShell } from "@/components/shared/workspace-shell";
import { ApiState, apiFetch, trackEvent } from "@/lib/api";
import { bookingStatusBadge, formatStatusLabel, riskBadge } from "@/lib/admin-ui";
import { resolveErrorMessage } from "@/lib/error-utils";
import { buildBookingPlanPayload, type BookingPlanFrequency } from "@/lib/retention-utils";

interface BookingItem {
  id: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  scheduledAt: string;
  notes: string | null;
  providerId: string;
  serviceId: string;
  cancelWindowHours: number;
  cancellationFeePct: number;
  service?: {
    id: string;
    title: string;
    slug: string;
    basePrice: number;
    durationMinutes: number;
  };
  provider?: {
    id: string;
    fullName: string;
    city: string;
    verificationStatus: string;
    responseRate: number;
    punctualityRate: number;
    completionRate: number;
  };
}

interface PaymentSummary {
  bookingId: string;
  status: string;
}

interface BookingRisk {
  bookingId: string;
  riskScore: number;
  level: "low" | "medium" | "high";
}

interface BookingPlanItem {
  id: string;
  serviceId: string;
  frequency: string;
  nextRunAt: string;
  active: boolean;
  totalRuns: number;
  createdAt: string;
  service?: {
    id: string;
    title: string;
    slug: string;
  };
  provider?: {
    id: string;
    fullName: string;
    city: string;
    verificationStatus: string;
  };
}

const FREQUENCY_OPTIONS: Array<{ value: BookingPlanFrequency; label: string }> = [
  { value: "weekly", label: "Semanal" },
  { value: "biweekly", label: "Quincenal" },
  { value: "monthly", label: "Mensual" }
];

export default function CustomerBookingsPage() {
  const searchParams = useSearchParams();
  const highlightedBookingId = searchParams.get("bookingId");
  const [state, setState] = useState<ApiState>("loading");
  const [actionState, setActionState] = useState<ApiState>("idle");
  const [actionMessage, setActionMessage] = useState("");
  const [items, setItems] = useState<BookingItem[]>([]);
  const [payments, setPayments] = useState<Record<string, string>>({});
  const [risks, setRisks] = useState<Record<string, BookingRisk | null>>({});
  const [plans, setPlans] = useState<BookingPlanItem[]>([]);
  const [planBusyBookingId, setPlanBusyBookingId] = useState<string | null>(null);

  async function loadPlans() {
    const planData = await apiFetch<BookingPlanItem[]>("/bookings/plans/mine");
    setPlans(planData);
    return planData;
  }

  async function loadData() {
    setState("loading");
    try {
      const data = await apiFetch<BookingItem[]>("/bookings/mine");
      setItems(data);

      const [paymentEntries, riskEntries] = await Promise.all([
        Promise.all(
          data.map(async (booking) => {
            try {
              const payment = await apiFetch<PaymentSummary>(`/payments/booking/${booking.id}`);
              return [booking.id, payment.status] as const;
            } catch {
              return [booking.id, "sin_checkout"] as const;
            }
          })
        ),
        Promise.all(
          data.map(async (booking) => {
            try {
              const risk = await apiFetch<BookingRisk>(`/bookings/${booking.id}/risk`);
              return [booking.id, risk] as const;
            } catch {
              return [booking.id, null] as const;
            }
          })
        )
      ]);

      setPayments(Object.fromEntries(paymentEntries));
      setRisks(Object.fromEntries(riskEntries));
      const planData = await loadPlans();
      setState(data.length === 0 && planData.length === 0 ? "empty" : "success");
    } catch (error) {
      setState("error");
      setActionState("error");
      setActionMessage(resolveErrorMessage(error, "No se pudieron cargar las reservas."));
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function createRecurringPlan(booking: BookingItem, frequency: BookingPlanFrequency) {
    const payload = buildBookingPlanPayload(booking.serviceId, booking.scheduledAt, frequency);
    if (!payload) {
      setActionState("error");
      setActionMessage("No se pudo derivar la fecha de la reserva para crear el plan.");
      return;
    }

    setPlanBusyBookingId(booking.id);
    setActionState("loading");
    setActionMessage(`Creando plan ${frequency}...`);

    try {
      await apiFetch("/bookings/plans", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      await loadPlans();
      setActionState("success");
      setActionMessage(`Plan ${frequency} creado para la reserva ${booking.id.slice(0, 8)}.`);

      void trackEvent("booking_plan_created", {
        bookingId: booking.id,
        serviceId: booking.serviceId,
        frequency
      });
    } catch (error) {
      setActionState("error");
      setActionMessage(resolveErrorMessage(error, "No fue posible crear el plan recurrente."));
    } finally {
      setPlanBusyBookingId(null);
    }
  }

  const activePlans = useMemo(() => plans.filter((item) => item.active), [plans]);
  const nextPlan = useMemo(() => {
    const sorted = [...activePlans].sort(
      (a, b) => new Date(a.nextRunAt).getTime() - new Date(b.nextRunAt).getTime()
    );
    return sorted[0] ?? null;
  }, [activePlans]);

  const highRiskBookings = useMemo(
    () => Object.values(risks).filter((risk) => risk?.level === "high").length,
    [risks]
  );

  return (
    <WorkspaceShell
      section="Cliente"
      title="Mis reservas"
      description="Estado, riesgo operativo y recurrencia para mantener tus servicios bajo control."
      links={[
        { href: "/app/buscar", label: "Nueva contratación" },
        { href: "/app/mensajes", label: "Mensajes" },
        { href: "/app/soporte", label: "Soporte" },
        { href: "/app/notificaciones", label: "Notificaciones" }
      ]}
    >
      <div className="mt-6">
        <StatePanel
          state={state}
          description={
            state === "empty"
              ? "Aún no tienes reservas. Busca un proveedor y agenda en minutos."
              : undefined
          }
        />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Reservas activas</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{items.length}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Planes recurrentes</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{activePlans.length}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Riesgo alto</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{highRiskBookings}</CardContent>
        </Card>
      </div>

      {nextPlan ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Próxima recurrencia</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p>
              Servicio: <span className="text-foreground">{nextPlan.service?.title ?? nextPlan.serviceId}</span>
            </p>
            <p>
              Frecuencia: <span className="text-foreground">{formatStatusLabel(nextPlan.frequency)}</span>
            </p>
            <p>
              Próxima ejecución:{" "}
              <span className="text-foreground">{new Date(nextPlan.nextRunAt).toLocaleString()}</span>
            </p>
          </CardContent>
        </Card>
      ) : null}

      {actionState !== "idle" ? (
        <div className="mt-6">
          <StatePanel state={actionState} description={actionMessage} />
        </div>
      ) : null}

      <div className="mt-6 grid gap-4">
        {items.map((item) => {
          const risk = risks[item.id];
          return (
            <Card
              key={item.id}
              className={highlightedBookingId === item.id ? "border-primary" : undefined}
            >
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-base">Reserva {item.id.slice(0, 8)}</CardTitle>
                  <Badge variant={bookingStatusBadge(item.status)}>{formatStatusLabel(item.status)}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Servicio:{" "}
                  <span className="text-foreground">{item.service?.title ?? item.serviceId.slice(0, 8)}</span>
                </p>
                <p>
                  Proveedor:{" "}
                  <span className="text-foreground">
                    {item.provider?.fullName ?? item.providerId.slice(0, 8)}
                  </span>
                </p>
                <p>
                  Agenda: <span className="text-foreground">{new Date(item.scheduledAt).toLocaleString()}</span>
                </p>
                <p>
                  Política: cancelación sin costo hasta {item.cancelWindowHours}h antes; luego aplica{" "}
                  {item.cancellationFeePct}%.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">Pago: {payments[item.id] ?? "sin_checkout"}</Badge>
                  <Badge variant={risk ? riskBadge(risk.level) : "outline"}>
                    Riesgo: {risk ? `${risk.level} (${Math.round(risk.riskScore * 100)}%)` : "N/A"}
                  </Badge>
                  <Badge variant="outline">Soporte: activo 24/7</Badge>
                </div>
                {item.notes ? <p>Notas: {item.notes}</p> : null}

                <div className="flex flex-wrap gap-2 pt-1">
                  {payments[item.id] === "requires_confirmation" ? (
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/app/checkout?bookingId=${item.id}`}>Confirmar pago mock</Link>
                    </Button>
                  ) : null}
                  <Button asChild size="sm">
                    <Link
                      href={`/app/checkout?providerId=${item.providerId}&serviceId=${item.serviceId}`}
                      onClick={() => {
                        void trackEvent("booking_rebook_started", {
                          bookingId: item.id,
                          providerId: item.providerId,
                          serviceId: item.serviceId
                        });
                      }}
                    >
                      Repetir servicio
                    </Link>
                  </Button>
                </div>

                <div className="space-y-2 pt-1">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Crear recurrencia desde esta reserva
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {FREQUENCY_OPTIONS.map((option) => (
                      <Button
                        key={`${item.id}:${option.value}`}
                        size="sm"
                        variant="outline"
                        disabled={planBusyBookingId === item.id}
                        onClick={() => {
                          void createRecurringPlan(item, option.value);
                        }}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </WorkspaceShell>
  );
}
