import Link from "next/link";
import { ArrowRight, BadgeCheck, CalendarCheck, CreditCard, ShieldCheck, Sprout, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const benefits = [
  {
    icon: ShieldCheck,
    title: "Confianza y verificación",
    description: "Perfiles con validación, historial y reseñas verificadas para reducir riesgos."
  },
  {
    icon: CalendarCheck,
    title: "Agenda clara",
    description: "Disponibilidad real por franjas para reservar sin llamadas ni fricción."
  },
  {
    icon: CreditCard,
    title: "Pagos seguros",
    description: "Flujo de pago protegido con trazabilidad de cada orden."
  }
];

const categories = [
  { name: "Limpieza de hogar", detail: "Rutinas semanales, limpieza profunda y fin de obra." },
  { name: "Limpieza de oficinas", detail: "Mantenimiento periódico para pymes y equipos." },
  { name: "Jardinería residencial", detail: "Corte, poda, diseño y mantenimiento estacional." },
  { name: "Jardinería comercial", detail: "Atención de zonas verdes para locales y conjuntos." }
];

export default function LandingPage() {
  return (
    <main>
      <section className="container py-14 md:py-20">
        <div className="mx-auto max-w-4xl text-center">
          <Badge variant="secondary" className="mb-4">Plataforma de limpieza y jardinería</Badge>
          <h1 className="text-balance text-4xl font-semibold leading-tight tracking-tight md:text-6xl">
            Servicios confiables para clientes. Crecimiento real para proveedores.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-pretty text-base text-muted-foreground md:text-lg">
            Homly conecta hogares y empresas con profesionales de limpieza y jardinería,
            combinando reputación, agenda, soporte y pagos en una experiencia simple.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="gap-2">
              <Link href="/app/buscar">
                Buscar proveedor
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/proveedor/onboarding">Quiero ofrecer servicios</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="container pb-14">
        <div className="grid gap-4 md:grid-cols-3">
          {benefits.map((item) => (
            <Card key={item.title}>
              <CardHeader>
                <item.icon className="h-5 w-5 text-primary" />
                <CardTitle className="pt-2 text-lg">{item.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{item.description}</CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="container pb-14">
        <div className="surface p-6 md:p-8">
          <h2 className="text-2xl font-semibold tracking-tight">Cómo funciona</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader><CardTitle className="text-base">1. Cliente publica necesidad</CardTitle></CardHeader>
              <CardContent className="text-sm text-muted-foreground">Selecciona categoría, zona y horario objetivo.</CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">2. Proveedor confirma</CardTitle></CardHeader>
              <CardContent className="text-sm text-muted-foreground">Recibe solicitud, responde en minutos y agenda.</CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">3. Homly da soporte</CardTitle></CardHeader>
              <CardContent className="text-sm text-muted-foreground">Pago seguro, mensajería y resolución de incidentes.</CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="container pb-14">
        <h2 className="text-2xl font-semibold tracking-tight">Categorías principales</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {categories.map((category) => (
            <Card key={category.name}>
              <CardHeader className="flex-row items-center gap-3 space-y-0">
                <Sprout className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">{category.name}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{category.detail}</CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="container pb-14">
        <h2 className="text-2xl font-semibold tracking-tight">Clientes y proveedores satisfechos</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {["4.9/5 promedio en limpieza", "4.8/5 promedio en jardinería", "92% de órdenes resueltas sin incidencias"].map((item) => (
            <Card key={item}>
              <CardHeader>
                <Star className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">{item}</CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section className="container pb-16">
        <div className="surface p-6 md:p-8">
          <h2 className="text-2xl font-semibold tracking-tight">¿Listo para empezar?</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Regístrate en minutos y gestiona limpieza o jardinería con una experiencia ordenada.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild><Link href="/app/registro">Crear cuenta</Link></Button>
            <Button asChild variant="outline"><Link href="/app/login">Iniciar sesión</Link></Button>
            <Button asChild variant="ghost"><Link href="/faq">Ver FAQ</Link></Button>
          </div>
        </div>
      </section>

      <footer className="border-t py-6">
        <div className="container flex flex-col gap-3 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} Homly. Plataforma de servicios locales.</p>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="gap-1"><BadgeCheck className="h-3.5 w-3.5" /> Verificación</Badge>
            <Link href="/faq" className="hover:text-foreground">FAQ</Link>
          </div>
        </div>
        <Separator className="mt-6" />
      </footer>
    </main>
  );
}
