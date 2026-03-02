import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NotFound() {
  return (
    <main className="container py-10">
      <Card>
        <CardHeader>
          <CardTitle>Página no encontrada</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>La ruta solicitada no existe o fue movida.</p>
          <Button asChild>
            <Link href="/">Volver al inicio</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
