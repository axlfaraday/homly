"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatePanel } from "@/components/shared/state-panel";
import { ApiState, apiFetch } from "@/lib/api";

interface BookingItem { id: string; status: string; scheduledAt: string; }
interface TicketItem { id: string; subject: string; status: string; }

export default function ProviderDashboardPage() {
  const [state, setState] = useState<ApiState>("loading");
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [tickets, setTickets] = useState<TicketItem[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const [bookingsData, ticketsData] = await Promise.all([
          apiFetch<BookingItem[]>("/bookings/mine"),
          apiFetch<TicketItem[]>("/support/tickets/mine")
        ]);
        setBookings(bookingsData);
        setTickets(ticketsData);
        setState(bookingsData.length === 0 ? "empty" : "success");
      } catch {
        setState("error");
      }
    }
    void load();
  }, []);

  const completed = useMemo(() => bookings.filter((item) => item.status === "completed").length, [bookings]);
  const pending = useMemo(() => bookings.filter((item) => item.status === "pending").length, [bookings]);

  return (
    <main className="container py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Panel proveedor</h1>
      <p className="mt-2 text-sm text-muted-foreground">Operación diaria de reservas, mensajes y soporte.</p>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <Card><CardHeader><CardTitle className="text-base">Reservas</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{bookings.length}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Pendientes</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{pending}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Completadas</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{completed}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Tickets</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{tickets.length}</CardContent></Card>
      </div>

      <div className="mt-6"><StatePanel state={state} /></div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button asChild><Link href="/proveedor/reservas">Gestionar reservas</Link></Button>
        <Button asChild variant="outline"><Link href="/proveedor/notificaciones">Notificaciones</Link></Button>
        <Button asChild><Link href="/proveedor/servicios">Gestionar servicios</Link></Button>
        <Button asChild variant="outline"><Link href="/proveedor/disponibilidad">Disponibilidad</Link></Button>
        <Button asChild variant="outline"><Link href="/proveedor/mensajes">Mensajes</Link></Button>
        <Button asChild variant="outline"><Link href="/proveedor/soporte">Soporte</Link></Button>
      </div>
    </main>
  );
}
