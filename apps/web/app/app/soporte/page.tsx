"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { StatePanel } from "@/components/shared/state-panel";
import { WorkspaceShell } from "@/components/shared/workspace-shell";
import { ApiState, apiFetch, trackEvent } from "@/lib/api";
import { formatStatusLabel, supportTicketStatusBadge } from "@/lib/admin-ui";
import { resolveErrorMessage } from "@/lib/error-utils";
import { validateSupportTicketForm } from "@/lib/support-utils";

interface TicketItem {
  id: string;
  subject: string;
  status: "open" | "in_progress" | "resolved";
  bookingId: string | null;
  createdAt: string;
}

interface BookingItem {
  id: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  scheduledAt: string;
  serviceId: string;
  service?: {
    id: string;
    title: string;
    slug: string;
  };
  provider?: {
    id: string;
    fullName: string;
    verificationStatus: string;
    city: string;
  };
}

const NO_BOOKING_VALUE = "__no_booking__";

export default function CustomerSupportPage() {
  const [state, setState] = useState<ApiState>("loading");
  const [actionState, setActionState] = useState<ApiState>("idle");
  const [actionMessage, setActionMessage] = useState("");
  const [items, setItems] = useState<TicketItem[]>([]);
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [bookingSelection, setBookingSelection] = useState(NO_BOOKING_VALUE);
  const [fieldErrors, setFieldErrors] = useState<{
    subject?: string;
    description?: string;
  }>({});

  const selectedBooking = useMemo(
    () =>
      bookingSelection === NO_BOOKING_VALUE
        ? null
        : bookings.find((item) => item.id === bookingSelection) ?? null,
    [bookings, bookingSelection]
  );

  async function loadData() {
    setState("loading");
    try {
      const [tickets, myBookings] = await Promise.all([
        apiFetch<TicketItem[]>("/support/tickets/mine"),
        apiFetch<BookingItem[]>("/bookings/mine")
      ]);
      setItems(tickets);
      setBookings(myBookings);
      setState(tickets.length === 0 ? "empty" : "success");
    } catch (error) {
      setState("error");
      setActionState("error");
      setActionMessage(resolveErrorMessage(error, "No se pudieron cargar tus tickets."));
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const errors = validateSupportTicketForm({ subject, description });
    setFieldErrors(errors);
    if (errors.subject || errors.description) {
      setActionState("error");
      setActionMessage(errors.subject ?? errors.description ?? "Revisa los campos del formulario.");
      return;
    }

    setActionState("loading");
    setActionMessage("Creando ticket...");

    try {
      await apiFetch("/support/tickets", {
        method: "POST",
        body: JSON.stringify({
          subject: subject.trim(),
          description: description.trim(),
          bookingId: bookingSelection === NO_BOOKING_VALUE ? undefined : bookingSelection
        })
      });

      setSubject("");
      setDescription("");
      setBookingSelection(NO_BOOKING_VALUE);
      setFieldErrors({});
      setActionState("success");
      setActionMessage("Ticket creado correctamente. Nuestro equipo hará seguimiento.");

      void trackEvent("support_ticket_created", {
        bookingLinked: bookingSelection !== NO_BOOKING_VALUE
      });

      await loadData();
    } catch (error) {
      setActionState("error");
      setActionMessage(resolveErrorMessage(error, "No fue posible crear el ticket."));
    }
  }

  return (
    <WorkspaceShell
      section="Cliente"
      title="Soporte"
      description="Abre y monitorea tickets con trazabilidad por reserva."
      links={[
        { href: "/app/dashboard", label: "Dashboard" },
        { href: "/app/reservas", label: "Mis reservas" },
        { href: "/app/mensajes", label: "Mensajes" },
        { href: "/app/notificaciones", label: "Notificaciones" }
      ]}
    >
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Crear ticket</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={onSubmit} noValidate>
            <div className="grid gap-2">
              <Label htmlFor="booking">Reserva asociada (opcional)</Label>
              <Select value={bookingSelection} onValueChange={setBookingSelection}>
                <SelectTrigger id="booking">
                  <SelectValue placeholder="Selecciona una reserva" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_BOOKING_VALUE}>Sin reserva específica</SelectItem>
                  {bookings.map((booking) => (
                    <SelectItem key={booking.id} value={booking.id}>
                      #{booking.id.slice(0, 8)} · {booking.service?.title ?? booking.serviceId.slice(0, 8)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedBooking ? (
                <p className="text-xs text-muted-foreground">
                  Proveedor: {selectedBooking.provider?.fullName ?? "N/A"} · Agenda:{" "}
                  {new Date(selectedBooking.scheduledAt).toLocaleString()}
                </p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="subject">Asunto</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                maxLength={120}
                required
              />
              {fieldErrors.subject ? (
                <p className="text-xs text-destructive">{fieldErrors.subject}</p>
              ) : (
                <p className="text-xs text-muted-foreground">{subject.length}/120 caracteres</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={2000}
                required
              />
              {fieldErrors.description ? (
                <p className="text-xs text-destructive">{fieldErrors.description}</p>
              ) : (
                <p className="text-xs text-muted-foreground">{description.length}/2000 caracteres</p>
              )}
            </div>

            <Button type="submit">Enviar ticket</Button>
          </form>
        </CardContent>
      </Card>

      <div className="mt-6">
        <StatePanel
          state={state}
          description={
            state === "empty"
              ? "Aún no tienes tickets. Si surge un problema, créalo desde este formulario."
              : undefined
          }
        />
      </div>

      {actionState !== "idle" ? (
        <div className="mt-4">
          <StatePanel state={actionState} description={actionMessage} />
        </div>
      ) : null}

      <div className="mt-6 grid gap-3">
        {items.map((item) => (
          <Card key={item.id}>
            <CardContent className="pt-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">{item.subject}</p>
                  <p>Ticket #{item.id.slice(0, 8)}</p>
                  <p>Creado: {new Date(item.createdAt).toLocaleString()}</p>
                  <p>Reserva: {item.bookingId ? `#${item.bookingId.slice(0, 8)}` : "No asociada"}</p>
                </div>
                <Badge variant={supportTicketStatusBadge(item.status)}>
                  {formatStatusLabel(item.status)}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </WorkspaceShell>
  );
}
