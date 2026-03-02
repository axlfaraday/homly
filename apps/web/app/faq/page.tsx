import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const faqs = [
  {
    q: "¿Cómo se valida un proveedor?",
    a: "Se revisan identidad, perfil, historial y calidad de servicio antes de elevar su estado."
  },
  {
    q: "¿Puedo reagendar una orden?",
    a: "Sí, desde tus reservas puedes proponer una nueva franja y confirmar con el proveedor."
  },
  {
    q: "¿Qué pasa si hay un incidente?",
    a: "Puedes abrir un ticket de soporte; Homly media y documenta la resolución."
  },
  {
    q: "¿Cómo ganan los proveedores?",
    a: "Reciben solicitudes, gestionan agenda y consolidan reputación con reseñas verificadas."
  }
];

export default function FaqPage() {
  return (
    <main className="container py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Preguntas frecuentes</h1>
      <p className="mt-2 text-sm text-muted-foreground">Respuestas rápidas para clientes y proveedores.</p>
      <div className="mt-6 grid gap-4">
        {faqs.map((item) => (
          <Card key={item.q}>
            <CardHeader>
              <CardTitle className="text-base">{item.q}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{item.a}</CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
