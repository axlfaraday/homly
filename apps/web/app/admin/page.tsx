import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WorkspaceShell } from "@/components/shared/workspace-shell";

const links = [
  ["/admin/ordenes", "Dashboard operativo"],
  ["/admin/usuarios", "Usuarios"],
  ["/admin/proveedores", "Proveedores"],
  ["/admin/soporte", "Soporte"]
] as const;

export default function AdminHubPage() {
  return (
    <WorkspaceShell
      section="Admin"
      title="Área administrativa"
      description="Monitorea operaciones, soporte, calidad y métricas de negocio."
      links={[
        { href: "/admin/ordenes", label: "Dashboard operativo" },
        { href: "/admin/soporte", label: "Soporte" },
        { href: "/admin/proveedores", label: "Proveedores" }
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
