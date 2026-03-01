import type { Metadata } from "next";

interface Params {
  city: string;
  service: string;
}

export async function generateMetadata({
  params
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  return {
    title: `${resolvedParams.service} en ${resolvedParams.city} | Homly`,
    description: `Encuentra proveedores de ${resolvedParams.service} en ${resolvedParams.city}, con reseñas y disponibilidad real.`
  };
}

export default async function LocalServiceLanding({
  params
}: {
  params: Promise<Params>;
}) {
  const resolvedParams = await params;

  return (
    <main className="container">
      <nav aria-label="Breadcrumb">
        <a href="/">Inicio</a> / <span>{resolvedParams.city}</span> /{" "}
        <span>{resolvedParams.service}</span>
      </nav>
      <h1>{`${resolvedParams.service.replaceAll("-", " ")} en ${resolvedParams.city}`}</h1>
      <p>Landing SEO local con filtros, schema y contenido util para conversion organica.</p>
    </main>
  );
}
