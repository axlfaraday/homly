"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatePanel } from "@/components/shared/state-panel";
import { WorkspaceShell } from "@/components/shared/workspace-shell";
import { ApiState, apiFetch } from "@/lib/api";

interface BookingItem {
  id: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  scheduledAt: string;
  notes?: string;
}

interface PaymentSummary {
  bookingId: string;
  status: string;
}

export default function CustomerBookingsPage() {
  const searchParams = useSearchParams();
  const highlightedBookingId = searchParams.get("bookingId");
  const [state, setState] = useState<ApiState>("loading");
  const [items, setItems] = useState<BookingItem[]>([]);
  const [payments, setPayments] = useState<Record<string, string>>({});

  useEffect(() => {
    async function load() {
      try {
        const data = await apiFetch<BookingItem[]>("/bookings/mine");
        setItems(data);
        const paymentEntries = await Promise.all(
          data.map(async (booking) => {
            try {
              const payment = await apiFetch<PaymentSummary>(`/payments/booking/${booking.id}`);
              return [booking.id, payment.status] as const;
            } catch {
              return [booking.id, "sin_checkout"] as const;
            }
          })
        );
        setPayments(Object.fromEntries(paymentEntries));
        setState(data.length === 0 ? "empty" : "success");
      } catch {
        setState("error");
      }
    }

    void load();
  }, []);

  return (
    <WorkspaceShell
      section="Cliente"
      title="Mis reservas"
      description="Consulta estado, agenda y pagos mock de cada contratación."
      links={[
        { href: "/app/buscar", label: "Nueva contratación" },
        { href: "/app/mensajes", label: "Mensajes" },
        { href: "/app/soporte", label: "Soporte" }
      ]}
    >
      <div className="mt-6"><StatePanel state={state} /></div>
      <div className="mt-6 grid gap-4">
        {items.map((item) => (
          <Card
            key={item.id}
            className={highlightedBookingId === item.id ? "border-primary" : undefined}
          >
            <CardHeader><CardTitle className="text-base">Reserva {item.id.slice(0, 8)}</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>{item.status} · {new Date(item.scheduledAt).toLocaleString()} {item.notes ? `· ${item.notes}` : ""}</p>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">Pago: {payments[item.id] ?? "sin_checkout"}</Badge>
                {payments[item.id] === "requires_confirmation" ? (
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/app/checkout?bookingId=${item.id}`}>Confirmar pago mock</Link>
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </WorkspaceShell>
  );
}
