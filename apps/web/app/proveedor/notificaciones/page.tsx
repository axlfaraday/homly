"use client";

import { NotificationsInbox } from "@/components/shared/notifications-inbox";
import { WorkspaceShell } from "@/components/shared/workspace-shell";

export default function ProviderNotificationsPage() {
  return (
    <WorkspaceShell
      section="Proveedor"
      title="Notificaciones"
      description="Avisos operativos de reservas, pagos y tickets de soporte."
      links={[
        { href: "/proveedor/dashboard", label: "Dashboard" },
        { href: "/proveedor/reservas", label: "Reservas" },
        { href: "/proveedor/notificaciones", label: "Notificaciones" },
        { href: "/proveedor/soporte", label: "Soporte" }
      ]}
    >
      <NotificationsInbox role="provider" />
    </WorkspaceShell>
  );
}
