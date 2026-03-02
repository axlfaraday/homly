"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatePanel } from "@/components/shared/state-panel";
import { WorkspaceShell } from "@/components/shared/workspace-shell";
import { ApiState, apiFetch, trackEvent } from "@/lib/api";

interface ProviderProfile {
  id: string;
  fullName: string;
  city: string;
  bio: string;
  coverage: string[];
  verificationStatus: string;
}

interface ServiceItem {
  id: string;
  slug: string;
  title: string;
  durationMinutes: number;
  basePrice: number;
  active: boolean;
}

interface HealthResponse {
  responseRate: number;
  punctualityRate: number;
  completionRate: number;
  averageRating: number | null;
  reviewCount: number;
  healthScore: number;
}

export default function ProviderDetailPage() {
  const params = useParams<{ providerId: string }>();
  const providerId = params.providerId;
  const [state, setState] = useState<ApiState>("loading");
  const [provider, setProvider] = useState<ProviderProfile | null>(null);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const trackedViewEvents = useRef<Set<string>>(new Set());

  useEffect(() => {
    async function load() {
      try {
        const profiles = await apiFetch<ProviderProfile[]>("/providers");
        const found = profiles.find((item) => item.id === providerId) ?? null;
        if (!found) {
          setState("empty");
          return;
        }

        const [serviceData, healthData] = await Promise.all([
          apiFetch<ServiceItem[]>(`/catalog/services?providerId=${found.id}`),
          apiFetch<HealthResponse>(`/providers/${found.id}/health`)
        ]);

        setProvider(found);
        setServices(serviceData.filter((item) => item.active));
        setHealth(healthData);
        setState("success");
      } catch {
        setState("error");
      }
    }

    void load();
  }, [providerId]);

  useEffect(() => {
    if (!provider) {
      return;
    }

    services.forEach((service) => {
      if (trackedViewEvents.current.has(service.id)) {
        return;
      }
      trackedViewEvents.current.add(service.id);
      void trackEvent("service_view", {
        providerId: provider.id,
        serviceId: service.id,
        serviceSlug: service.slug
      });
    });
  }, [provider, services]);

  const coverage = useMemo(() => provider?.coverage.join(", "), [provider]);

  return (
    <WorkspaceShell
      section="Cliente"
      title="Detalle del proveedor"
      description="Revisa reputación, cobertura y servicios antes de reservar."
      links={[
        { href: "/app/buscar", label: "Volver a búsqueda" },
        { href: "/app/reservas", label: "Mis reservas" }
      ]}
    >
      <StatePanel state={state} />
      {provider && health ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-[2fr_1fr]">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle>{provider.fullName}</CardTitle>
                <Badge variant={provider.verificationStatus === "approved" ? "default" : "secondary"}>
                  {provider.verificationStatus === "approved" ? "Verificado" : "Pendiente"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p>{provider.bio}</p>
              <p>Ciudad: <span className="text-foreground">{provider.city}</span></p>
              <p>Cobertura: <span className="text-foreground">{coverage}</span></p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Salud operativa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Rating: {health.averageRating ? health.averageRating.toFixed(1) : "N/A"} ({health.reviewCount})</p>
              <p>Respuesta: {(health.responseRate * 100).toFixed(0)}%</p>
              <p>Puntualidad: {(health.punctualityRate * 100).toFixed(0)}%</p>
              <p>Cumplimiento: {(health.completionRate * 100).toFixed(0)}%</p>
              <p>Score: {(health.healthScore * 100).toFixed(0)}/100</p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {services.length > 0 ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {services.map((service) => (
            <Card key={service.id}>
              <CardHeader>
                <CardTitle className="text-base">{service.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>Duración estimada: {service.durationMinutes} min</p>
                <p>Desde: ${service.basePrice}</p>
                <div className="flex gap-2">
                  <Button asChild>
                    <Link
                      href={`/app/checkout?providerId=${providerId}&serviceId=${service.id}`}
                      onClick={() => {
                        void trackEvent("service_checkout_start", {
                          providerId,
                          serviceId: service.id,
                          serviceSlug: service.slug
                        });
                      }}
                    >
                      Reservar servicio
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href={`/app/buscar?city=${encodeURIComponent(provider?.city ?? "")}&service=${encodeURIComponent(service.slug)}`}>
                      Ver similares
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
    </WorkspaceShell>
  );
}
