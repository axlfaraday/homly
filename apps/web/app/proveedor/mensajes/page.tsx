"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatePanel } from "@/components/shared/state-panel";
import { ApiState, apiFetch } from "@/lib/api";

interface BookingItem { id: string; status: string; }

export default function ProviderMessagesPage() {
  const [state, setState] = useState<ApiState>("loading");
  const [bookings, setBookings] = useState<BookingItem[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const data = await apiFetch<BookingItem[]>("/bookings/mine");
        setBookings(data);
        setState(data.length === 0 ? "empty" : "success");
      } catch {
        setState("error");
      }
    }
    void load();
  }, []);

  return (
    <main className="container py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Mensajes por reserva</h1>
      <p className="mt-2 text-sm text-muted-foreground">Abre el detalle de cada reserva para conversar con clientes.</p>
      <div className="mt-6"><StatePanel state={state} /></div>
      <div className="mt-6 grid gap-3">
        {bookings.map((booking) => (
          <Card key={booking.id}>
            <CardHeader><CardTitle className="text-base">Reserva {booking.id.slice(0, 8)}</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Estado: {booking.status}. Usa <code>/app/mensajes</code> o endpoint de messaging para continuar.
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
