"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/shared/admin-shell";
import { StatePanel } from "@/components/shared/state-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiState, apiFetch } from "@/lib/api";

interface DashboardData {
  usersTotal: number;
  providersTotal: number;
  bookingsTotal: number;
  ticketsOpen: number;
}

const links = [
  {
    href: "/admin/ordenes",
    label: "Órdenes y operación",
    description: "Monitorea reservas, riesgo, alertas y despachos de nudges."
  },
  {
    href: "/admin/proveedores",
    label: "Proveedores",
    description: "Aprueba o rechaza perfiles y supervisa estado de verificación."
  },
  {
    href: "/admin/soporte",
    label: "Soporte",
    description: "Gestiona tickets transversales y tiempos de resolución."
  },
  {
    href: "/admin/usuarios",
    label: "Usuarios y funnel",
    description: "Visualiza salud de base instalada y distribución operativa."
  }
];

export default function AdminHubPage() {
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
    <AdminShell
      title="Consola administrativa"
      description="Centro de control para operación diaria, calidad de oferta y soporte."
    >
      <div className="mt-6">
        <StatePanel state={state} />
      </div>

      {dashboard ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Usuarios</CardTitle>
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
              <CardTitle className="text-base">Reservas</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-semibold">{dashboard.bookingsTotal}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tickets abiertos</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-semibold">{dashboard.ticketsOpen}</CardContent>
          </Card>
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {links.map((item) => (
          <Card key={item.href}>
            <CardHeader>
              <CardTitle className="text-base">
                <Link href={item.href} className="underline">
                  {item.label}
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>{item.description}</p>
              <p className="mt-2">Ruta: {item.href}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </AdminShell>
  );
}
