"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatePanel } from "@/components/shared/state-panel";
import { WorkspaceShell } from "@/components/shared/workspace-shell";
import { ApiState, apiFetch } from "@/lib/api";

interface BookingItem { id: string; status: string; scheduledAt: string; }
interface TicketItem { id: string; status: string; }

export default function CustomerDashboardPage() {
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

  const pending = useMemo(() => bookings.filter((item) => item.status === "pending").length, [bookings]);

  return (
    <WorkspaceShell
      section="Cliente"
      title="Dashboard cliente"
      description="Resumen de reservas, mensajes y soporte para actuar más rápido."
      links={[
        { href: "/app/buscar", label: "Contratar servicio" },
        { href: "/app/reservas", label: "Mis reservas" },
        { href: "/app/mensajes", label: "Mensajes" }
      ]}
    >
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Card><CardHeader><CardTitle className="text-base">Reservas</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{bookings.length}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Pendientes</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{pending}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Tickets</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{tickets.length}</CardContent></Card>
      </div>

      <div className="mt-6">
        <StatePanel state={state} description={state === "empty" ? "Aún no tienes reservas." : "Datos sincronizados correctamente."} />
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button asChild><Link href="/app/buscar">Buscar proveedores</Link></Button>
        <Button asChild variant="outline"><Link href="/app/reservas">Ver reservas</Link></Button>
        <Button asChild variant="outline"><Link href="/app/soporte">Ir a soporte</Link></Button>
      </div>
    </WorkspaceShell>
  );
}
