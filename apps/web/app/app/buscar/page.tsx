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
  responseRate: number;
  punctualityRate: number;
  completionRate: number;
  healthScore: number;
  isFeatured: boolean;
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
  const [fallbackNotice, setFallbackNotice] = useState("");

  async function discoverProviders(nextCity: string, nextService: string | undefined, rating: number) {
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

    return apiFetch<ProviderItem[]>(`/providers/discover?${params.toString()}`);
  }

  async function runSearch(nextCity: string, nextService: string | undefined, rating: number) {
    setState("loading");
    setFallbackNotice("");
    const normalizedService = nextService?.trim() || undefined;

    try {
      void trackEvent("search_performed", {
        city: nextCity,
        service: normalizedService ?? null,
        minRating: rating
      });

      const strictMatches = await discoverProviders(nextCity, normalizedService, rating);
      if (strictMatches.length > 0) {
        setItems(strictMatches);
        setState("success");
        return;
      }

      if (normalizedService) {
        const cityWideMatches = await discoverProviders(nextCity, undefined, rating);
        if (cityWideMatches.length > 0) {
          setItems(cityWideMatches);
          setState("success");
          setFallbackNotice(
            `No encontramos coincidencias exactas para "${normalizedService}". Te mostramos la oferta verificada disponible en ${nextCity}.`
          );
          void trackEvent("search_fallback_applied", {
            mode: "remove_service_filter",
            city: nextCity,
            originalService: normalizedService,
            minRating: rating,
            candidates: cityWideMatches.length
          });
          return;
        }
      }

      if (rating > 1) {
        const lowThresholdMatches = await discoverProviders(
          nextCity,
          normalizedService ? undefined : normalizedService,
          1
        );
        if (lowThresholdMatches.length > 0) {
          setItems(lowThresholdMatches);
          setState("success");
          setFallbackNotice(
            `No hubo resultados con rating mínimo ${rating}. Mostramos alternativas verificadas desde rating 1.`
          );
          void trackEvent("search_fallback_applied", {
            mode: "lower_min_rating",
            city: nextCity,
            originalService: normalizedService ?? null,
            fromMinRating: rating,
            toMinRating: 1,
            candidates: lowThresholdMatches.length
          });
          return;
        }
      }

      setItems([]);
      setState("empty");
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

      {fallbackNotice ? (
        <Card className="mt-6 border-primary/40">
          <CardContent className="pt-4 text-sm text-muted-foreground">{fallbackNotice}</CardContent>
        </Card>
      ) : null}

      {state === "empty" ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Amplía tu búsqueda</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              No encontramos proveedores con estos filtros. Puedes ampliar el rango para no perder
              opciones en tu ciudad.
            </p>
            <div className="flex flex-wrap gap-2">
              {service.trim().length > 0 ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setService("");
                    void runSearch(city, "", minRating);
                  }}
                >
                  Buscar sin servicio específico
                </Button>
              ) : null}
              {minRating > 1 ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setMinRating(1);
                    void runSearch(city, service, 1);
                  }}
                >
                  Bajar rating mínimo a 1
                </Button>
              ) : null}
              <Button asChild size="sm" variant="outline">
                <Link href="/app/soporte">Solicitar ayuda del equipo</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {items.map((provider) => (
          <Card key={provider.id}>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base">{provider.fullName}</CardTitle>
                <div className="flex flex-wrap items-center gap-1">
                  {provider.isFeatured ? <Badge variant="outline">Destacado</Badge> : null}
                  <Badge variant={provider.verificationStatus === "approved" ? "default" : "secondary"}>
                    {provider.verificationStatus === "approved" ? "Verificado" : "Pendiente"}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">{provider.city}</p>
              <p>{provider.bio}</p>
              <p>Rating: {provider.averageRating ? provider.averageRating.toFixed(1) : "sin reseñas"} ({provider.reviewCount} reseñas)</p>
              <p>
                Confianza: {(provider.healthScore * 100).toFixed(0)}/100 · respuesta{" "}
                {(provider.responseRate * 100).toFixed(0)}% · puntualidad{" "}
                {(provider.punctualityRate * 100).toFixed(0)}%
              </p>
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
