"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatePanel } from "@/components/shared/state-panel";
import { ApiState, apiFetch, trackEvent } from "@/lib/api";
import { WorkspaceShell } from "@/components/shared/workspace-shell";

interface ServiceItem {
  id: string;
  slug: string;
  title: string;
  basePrice: number;
  durationMinutes: number;
}

interface ProviderItem {
  id: string;
  fullName: string;
  city: string;
  bio: string;
  verificationStatus: string;
  averageRating: number | null;
  reviewCount: number;
  services: ServiceItem[];
}

const categorySuggestions = [
  { label: "Limpieza de hogar", service: "limpieza-hogar" },
  { label: "Limpieza profunda", service: "limpieza-profunda" },
  { label: "Jardinería residencial", service: "jardineria-residencial" },
  { label: "Poda y mantenimiento", service: "poda-jardineria" }
];

export default function SearchPage() {
  const [state, setState] = useState<ApiState>("loading");
  const [city, setCity] = useState("bogota");
  const [service, setService] = useState("");
  const [minRating, setMinRating] = useState(1);
  const [items, setItems] = useState<ProviderItem[]>([]);

  async function runSearch(nextCity: string, nextService: string | undefined, rating: number) {
    try {
      const params = new URLSearchParams({
        city: nextCity,
        verifiedOnly: "true",
        minRating: String(rating),
        sortBy: "top-rated",
        featuredFirst: "true",
        limit: "20"
      });
      if (nextService?.trim()) {
        params.set("service", nextService.trim());
      }
      const data = await apiFetch<ProviderItem[]>(`/providers/discover?${params.toString()}`);
      setItems(data);
      setState(data.length === 0 ? "empty" : "success");
    } catch {
      setState("error");
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cityQuery = params.get("city");
    const serviceQuery = params.get("service");
    const normalizedCity = cityQuery ?? city;
    const normalizedService = (serviceQuery ?? service).trim() || undefined;
    if (cityQuery) {
      setCity(cityQuery);
    }
    if (serviceQuery) {
      setService(serviceQuery);
    }
    void runSearch(normalizedCity, normalizedService, minRating);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setState("loading");
    await runSearch(city, service, minRating);
  }

  return (
    <WorkspaceShell
      section="Cliente"
      title="Contrata limpieza y jardinería en minutos"
      description="Compara proveedores verificados, revisa precios y avanza a reserva con pago mock en un solo flujo."
      links={[
        { href: "/app/dashboard", label: "Dashboard" },
        { href: "/app/reservas", label: "Mis reservas" },
        { href: "/app/mensajes", label: "Mensajes" },
        { href: "/app/soporte", label: "Soporte" }
      ]}
    >
      <div className="flex flex-wrap gap-2">
        {categorySuggestions.map((item) => (
          <Button
            key={item.service}
            size="sm"
            variant="secondary"
            onClick={() => {
              setService(item.service);
              setState("loading");
              void runSearch(city, item.service, minRating);
            }}
          >
            {item.label}
          </Button>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Filtros de búsqueda</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-4" onSubmit={onSubmit}>
            <div className="grid gap-2"><Label htmlFor="city">Ciudad</Label><Input id="city" value={city} onChange={(e) => setCity(e.target.value)} /></div>
            <div className="grid gap-2"><Label htmlFor="service">Servicio</Label><Input id="service" value={service} onChange={(e) => setService(e.target.value)} /></div>
            <div className="grid gap-2"><Label htmlFor="rating">Rating mínimo</Label><Input id="rating" type="number" min={1} max={5} value={minRating} onChange={(e) => setMinRating(Number(e.target.value || 1))} /></div>
            <div className="flex items-end"><Button className="w-full" type="submit">Buscar</Button></div>
          </form>
        </CardContent>
      </Card>

      <div className="mt-6"><StatePanel state={state} /></div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {items.map((provider) => (
          <Card key={provider.id}>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base">{provider.fullName}</CardTitle>
                <Badge variant={provider.verificationStatus === "approved" ? "default" : "secondary"}>
                  {provider.verificationStatus === "approved" ? "Verificado" : "Pendiente"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">{provider.city}</p>
              <p>{provider.bio}</p>
              <p>Rating: {provider.averageRating ? provider.averageRating.toFixed(1) : "sin reseñas"} ({provider.reviewCount} reseñas)</p>
              <ul className="list-disc pl-4">
                {provider.services.map((srv) => (
                  <li key={srv.id}>{srv.title} · ${srv.basePrice} · {srv.durationMinutes} min</li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button asChild size="sm">
                  <Link
                    href={`/app/proveedores/${provider.id}`}
                    onClick={() => {
                      void trackEvent("provider_detail_opened", {
                        providerId: provider.id,
                        city: provider.city
                      });
                    }}
                  >
                    Ver detalle
                  </Link>
                </Button>
                {provider.services[0] ? (
                  <Button asChild size="sm" variant="outline">
                    <Link
                      href={`/app/checkout?providerId=${provider.id}&serviceId=${provider.services[0].id}`}
                      onClick={() => {
                        void trackEvent("service_checkout_start", {
                          providerId: provider.id,
                          serviceId: provider.services[0].id,
                          serviceSlug: provider.services[0].slug
                        });
                      }}
                    >
                      Reservar ahora
                    </Link>
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
