"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatePanel } from "@/components/shared/state-panel";
import { ApiState, apiFetch } from "@/lib/api";

interface DashboardData {
  usersTotal: number;
  providersTotal: number;
  servicesTotal: number;
  bookingsTotal: number;
  bookingsByStatus: Array<{ status: string; _count: { _all: number } }>;
  reviewsTotal: number;
  ticketsOpen: number;
}

export default function AdminOrdersPage() {
  const [state, setState] = useState<ApiState>("loading");
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const dashboard = await apiFetch<DashboardData>("/admin/dashboard");
        setData(dashboard);
        setState("success");
      } catch {
        setState("error");
      }
    }
    void load();
  }, []);

  return (
    <main className="container py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Admin · órdenes y operación</h1>
      <p className="mt-2 text-sm text-muted-foreground">Visión consolidada del marketplace.</p>
      <div className="mt-6"><StatePanel state={state} /></div>

      {data ? (
        <>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <Card><CardHeader><CardTitle className="text-base">Usuarios</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{data.usersTotal}</CardContent></Card>
            <Card><CardHeader><CardTitle className="text-base">Reservas</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{data.bookingsTotal}</CardContent></Card>
            <Card><CardHeader><CardTitle className="text-base">Tickets abiertos</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{data.ticketsOpen}</CardContent></Card>
          </div>
          <Card className="mt-6">
            <CardHeader><CardTitle className="text-base">Reservas por estado</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <ul className="space-y-1">
                {data.bookingsByStatus.map((item) => (
                  <li key={item.status}>{item.status}: {item._count._all}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </>
      ) : null}
    </main>
  );
}
