"use client";

import { AlertCircle, CheckCircle2, Inbox, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ApiState } from "@/lib/api";

interface StatePanelProps {
  state: ApiState;
  title?: string;
  description?: string;
}

export function StatePanel({ state, title, description }: StatePanelProps) {
  if (state === "idle") {
    return null;
  }

  if (state === "loading") {
    return (
      <Alert>
        <Loader2 className="h-4 w-4 animate-spin" />
        <AlertTitle>Cargando</AlertTitle>
        <AlertDescription>{description ?? "Estamos consultando la información."}</AlertDescription>
      </Alert>
    );
  }

  if (state === "empty") {
    return (
      <Alert>
        <Inbox className="h-4 w-4" />
        <AlertTitle>{title ?? "Sin resultados"}</AlertTitle>
        <AlertDescription>{description ?? "Aún no hay datos para mostrar."}</AlertDescription>
      </Alert>
    );
  }

  if (state === "error") {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{title ?? "Ocurrió un error"}</AlertTitle>
        <AlertDescription>
          {description ??
            "No pudimos cargar esta sección. Intenta de nuevo en unos segundos o vuelve a iniciar sesión."}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert>
      <CheckCircle2 className="h-4 w-4" />
      <AlertTitle>{title ?? "Listo"}</AlertTitle>
      <AlertDescription>{description ?? "Operación completada correctamente."}</AlertDescription>
    </Alert>
  );
}
