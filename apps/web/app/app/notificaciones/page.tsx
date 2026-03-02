"use client";

import { NotificationsInbox } from "@/components/shared/notifications-inbox";
import { WorkspaceShell } from "@/components/shared/workspace-shell";

export default function CustomerNotificationsPage() {
  return (
    <WorkspaceShell
      section="Cliente"
      title="Notificaciones"
      description="Eventos de reservas, pagos y soporte relevantes para tu cuenta."
      links={[
        { href: "/app/dashboard", label: "Dashboard" },
        { href: "/app/reservas", label: "Mis reservas" },
        { href: "/app/notificaciones", label: "Notificaciones" },
        { href: "/app/soporte", label: "Soporte" }
      ]}
    >
      <NotificationsInbox role="customer" />
    </WorkspaceShell>
  );
}
