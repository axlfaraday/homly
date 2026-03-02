import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Params {
  city: string;
  service: string;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const p = await params;
  const service = p.service.replaceAll("-", " ");
  return {
    title: `${service} en ${p.city} | Homly`,
    description: `Encuentra servicios de ${service} en ${p.city} con agenda y reputación verificadas.`
  };
}

export default async function LocalServiceLanding({ params }: { params: Promise<Params> }) {
  const p = await params;
  const service = p.service.replaceAll("-", " ");

  return (
    <main className="container py-10">
      <nav className="text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Inicio</Link> / {p.city} / {service}
      </nav>
      <Badge className="mt-4" variant="secondary">SEO local</Badge>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">{service} en {p.city}</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Compara proveedores de {service}, revisa valoraciones y agenda sin fricción.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-base">Proveedores validados</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">Perfiles revisados y con historial de reseñas.</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Precios transparentes</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">Base y extras visibles antes de reservar.</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Soporte continuo</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">Canal de atención y trazabilidad de incidencias.</CardContent>
        </Card>
      </div>

      <Button asChild className="mt-8">
        <Link href={`/app/buscar?city=${encodeURIComponent(p.city)}&service=${encodeURIComponent(p.service)}`}>
          Ver proveedores disponibles
        </Link>
      </Button>
    </main>
  );
}
