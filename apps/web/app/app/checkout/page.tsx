"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatePanel } from "@/components/shared/state-panel";
import { WorkspaceShell } from "@/components/shared/workspace-shell";
import { ApiState, apiFetch, trackEvent } from "@/lib/api";

interface ServiceItem {
  id: string;
  title: string;
  basePrice: number;
  durationMinutes: number;
}

interface BookingItem {
  id: string;
  serviceId?: string;
  status: string;
  scheduledAt: string;
}

interface PaymentItem {
  bookingId: string;
  amount: number;
  status: string;
  mockReference: string | null;
}

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const providerId = searchParams.get("providerId") ?? "";
  const serviceId = searchParams.get("serviceId") ?? "";
  const bookingIdParam = searchParams.get("bookingId") ?? "";

  const [state, setState] = useState<ApiState>("loading");
  const [service, setService] = useState<ServiceItem | null>(null);
  const [booking, setBooking] = useState<BookingItem | null>(null);
  const [payment, setPayment] = useState<PaymentItem | null>(null);
  const [scheduledAt, setScheduledAt] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    async function bootstrap() {
      try {
        if (bookingIdParam) {
          const bookings = await apiFetch<BookingItem[]>("/bookings/mine");
          const existing = bookings.find((item) => item.id === bookingIdParam) ?? null;
          if (!existing) {
            setState("error");
            return;
          }

          setBooking(existing);
          try {
            const existingPayment = await apiFetch<PaymentItem>(`/payments/booking/${existing.id}`);
            setPayment(existingPayment);
          } catch {
            const checkout = await apiFetch<PaymentItem>("/payments/checkout", {
              method: "POST",
              body: JSON.stringify({ bookingId: existing.id })
            });
            setPayment(checkout);
          }

          setState("success");
          return;
        }

        if (!providerId || !serviceId) {
          setState("error");
          return;
        }

        const services = await apiFetch<ServiceItem[]>(`/catalog/services?providerId=${providerId}`);
        const selected = services.find((item) => item.id === serviceId) ?? null;
        if (!selected) {
          setState("error");
          return;
        }

        setService(selected);
        const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
        tomorrow.setMinutes(0, 0, 0);
        setScheduledAt(tomorrow.toISOString().slice(0, 16));
        setState("success");
      } catch {
        setState("error");
      }
    }

    void bootstrap();
  }, [bookingIdParam, providerId, serviceId]);

  useEffect(() => {
    if (!providerId || !serviceId) {
      return;
    }

    void trackEvent("service_checkout_start", {
      providerId,
      serviceId
    });
  }, [providerId, serviceId]);

  async function createBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!service) {
      setState("error");
      return;
    }

    setState("loading");
    try {
      const created = await apiFetch<BookingItem>("/bookings", {
        method: "POST",
        body: JSON.stringify({
          serviceId: service.id,
          scheduledAt: new Date(scheduledAt).toISOString(),
          notes
        })
      });

      const checkout = await apiFetch<PaymentItem>("/payments/checkout", {
        method: "POST",
        body: JSON.stringify({ bookingId: created.id })
      });

      setBooking(created);
      setPayment(checkout);
      setState("success");
      void trackEvent("service_booked", {
        providerId,
        serviceId: service.id,
        bookingId: created.id
      });
    } catch {
      setState("error");
    }
  }

  async function confirmMockPayment() {
    if (!booking) {
      return;
    }

    setState("loading");
    try {
      const confirmed = await apiFetch<PaymentItem>(`/payments/booking/${booking.id}/confirm`, {
        method: "PATCH"
      });
      setPayment(confirmed);
      setState("success");
      void trackEvent("service_payment_confirmed", {
        bookingId: booking.id,
        providerId,
        serviceId: serviceId || booking.serviceId || null
      });
      router.push(`/app/reservas?bookingId=${booking.id}`);
    } catch {
      setState("error");
    }
  }

  const step = useMemo(() => {
    if (!booking) {
      return "booking";
    }
    if (payment?.status === "held_in_escrow") {
      return "done";
    }
    return "payment";
  }, [booking, payment]);

  return (
    <WorkspaceShell
      section="Cliente"
      title="Checkout de reserva (mock)"
      description="Completa tu contratación en 2 pasos: reserva y confirmación de pago simulado."
      links={[
        { href: "/app/buscar", label: "Volver a búsqueda" },
        { href: "/app/reservas", label: "Mis reservas" }
      ]}
    >
      <StatePanel state={state} />

      {service ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Servicio seleccionado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">{service.title}</p>
            <p>Duración: {service.durationMinutes} min</p>
            <p>Valor base: ${service.basePrice}</p>
          </CardContent>
        </Card>
      ) : null}

      {step === "booking" ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Paso 1: agenda tu servicio</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-3" onSubmit={createBooking}>
              <div className="grid gap-2">
                <Label htmlFor="scheduledAt">Fecha y hora</Label>
                <Input
                  id="scheduledAt"
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(event) => setScheduledAt(event.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="notes">Notas para el proveedor</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Ej: acceso por portería, productos incluidos, puntos críticos."
                />
              </div>
              <Button type="submit">Continuar a pago mock</Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {step === "payment" && booking && payment ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Paso 2: confirma pago mock</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Reserva: <span className="font-medium text-foreground">{booking.id.slice(0, 8)}</span></p>
            <p>Monto: <span className="font-medium text-foreground">${payment.amount}</span></p>
            <p>Referencia mock: <span className="font-medium text-foreground">{payment.mockReference}</span></p>
            <Badge variant="secondary">Estado actual: {payment.status}</Badge>
            <div className="flex gap-2 pt-2">
              <Button onClick={confirmMockPayment}>Confirmar pago mock</Button>
              <Button asChild variant="outline">
                <Link href="/app/reservas">Lo haré más tarde</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === "done" && booking ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Reserva confirmada</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Tu pago mock fue validado y la reserva quedó en seguimiento.</p>
            <div className="flex gap-2">
              <Button asChild>
                <Link href={`/app/reservas?bookingId=${booking.id}`}>Ver reserva</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/app/mensajes">Contactar proveedor</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </WorkspaceShell>
  );
}
