import Link from "next/link";
import { AuthGuard } from "@/components/shared/auth-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WorkspaceShell } from "@/components/shared/workspace-shell";

const links = [
  ["/app/buscar", "Buscar y contratar"],
  ["/app/reservas", "Reservas y estado"],
  ["/app/notificaciones", "Notificaciones"],
  ["/app/mensajes", "Mensajes"],
  ["/app/soporte", "Soporte"],
  ["/app/perfil", "Perfil"]
] as const;

export default function AppHubPage() {
  return (
    <AuthGuard allow={["customer", "admin"]}>
      <WorkspaceShell
        section="Cliente"
        title="Área cliente"
        description="Todo tu flujo de contratación y seguimiento desde un solo lugar."
        links={[
          { href: "/app/dashboard", label: "Dashboard" },
          { href: "/app/buscar", label: "Contratar servicio" },
          { href: "/app/reservas", label: "Ver reservas" },
          { href: "/app/notificaciones", label: "Notificaciones" }
        ]}
      >
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {links.map(([href, label]) => (
            <Card key={href}>
              <CardHeader><CardTitle className="text-base"><Link className="underline" href={href}>{label}</Link></CardTitle></CardHeader>
              <CardContent className="text-sm text-muted-foreground">Ruta: {href}</CardContent>
            </Card>
          ))}
        </div>
      </WorkspaceShell>
    </AuthGuard>
  );
}
