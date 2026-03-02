"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatePanel } from "@/components/shared/state-panel";
import { ApiState, apiFetch } from "@/lib/api";

interface DashboardData { usersTotal: number; providersTotal: number; }

export default function AdminUsersPage() {
  const [state, setState] = useState<ApiState>("loading");
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await apiFetch<DashboardData>("/admin/dashboard");
        setDashboard(data);
        setState("success");
      } catch {
        setState("error");
      }
    }
    void load();
  }, []);

  return (
    <main className="container py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Admin · usuarios</h1>
      <p className="mt-2 text-sm text-muted-foreground">Métricas de base instalada por rol.</p>
      <div className="mt-6"><StatePanel state={state} /></div>
      {dashboard ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Card><CardHeader><CardTitle className="text-base">Usuarios totales</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{dashboard.usersTotal}</CardContent></Card>
          <Card><CardHeader><CardTitle className="text-base">Proveedores</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{dashboard.providersTotal}</CardContent></Card>
        </div>
      ) : null}
    </main>
  );
}
