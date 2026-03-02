import { WorkspaceShell } from "@/components/shared/workspace-shell";

const ADMIN_LINKS = [
  { href: "/admin/ordenes", label: "Órdenes" },
  { href: "/admin/proveedores", label: "Proveedores" },
  { href: "/admin/soporte", label: "Soporte" },
  { href: "/admin/usuarios", label: "Usuarios" }
];

interface AdminShellProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

export function AdminShell({ title, description, children }: AdminShellProps) {
  return (
    <WorkspaceShell
      section="Admin"
      title={title}
      description={description}
      links={ADMIN_LINKS}
    >
      {children}
    </WorkspaceShell>
  );
}
