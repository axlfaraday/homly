"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="container py-10">
      <Card>
        <CardHeader>
          <CardTitle>Ocurrió un problema inesperado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>La pantalla no pudo cargarse. Puedes reintentar la operación.</p>
          <Button onClick={reset}>Reintentar</Button>
        </CardContent>
      </Card>
    </main>
  );
}
