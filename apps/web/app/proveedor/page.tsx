import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WorkspaceShell } from "@/components/shared/workspace-shell";

const links = [
  ["/proveedor/dashboard", "Dashboard"],
  ["/proveedor/onboarding", "Onboarding"],
  ["/proveedor/servicios", "Servicios"],
  ["/proveedor/disponibilidad", "Disponibilidad"],
  ["/proveedor/mensajes", "Mensajes"],
  ["/proveedor/soporte", "Soporte"]
] as const;

export default function ProviderHubPage() {
  return (
    <WorkspaceShell
      section="Proveedor"
      title="Área proveedor"
      description="Gestiona tu operación diaria, agenda y atención al cliente."
      links={[
        { href: "/proveedor/dashboard", label: "Dashboard" },
        { href: "/proveedor/servicios", label: "Servicios" },
        { href: "/proveedor/disponibilidad", label: "Disponibilidad" }
      ]}
    >
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {links.map(([href, label]) => (
          <Card key={href}><CardHeader><CardTitle className="text-base"><Link className="underline" href={href}>{label}</Link></CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">Ruta: {href}</CardContent></Card>
        ))}
      </div>
    </WorkspaceShell>
  );
}
