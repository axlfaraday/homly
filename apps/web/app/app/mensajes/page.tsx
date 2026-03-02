"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { resolveErrorMessage } from "@/lib/error-utils";

interface BookingItem {
  id: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  scheduledAt: string;
  serviceId: string;
  service?: {
    id: string;
    title: string;
    slug: string;
    basePrice: number;
    durationMinutes: number;
  };
  provider?: {
    id: string;
    fullName: string;
    city: string;
    verificationStatus: string;
  };
}

interface MessageItem {
  id: string;
  body: string;
  createdAt: string;
  sender: {
    id: string;
    email: string;
    role: string;
  };
}

function formatStatus(status: string) {
  return status.replaceAll("_", " ");
}

export default function CustomerMessagesPage() {
  const [pageState, setPageState] = useState<ApiState>("loading");
  const [messagesState, setMessagesState] = useState<ApiState>("idle");
  const [actionState, setActionState] = useState<ApiState>("idle");
  const [actionMessage, setActionMessage] = useState("");
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [bookingId, setBookingId] = useState("");
  const [body, setBody] = useState("");
  const [messages, setMessages] = useState<MessageItem[]>([]);

  const selectedBooking = useMemo(
    () => bookings.find((item) => item.id === bookingId) ?? null,
    [bookings, bookingId]
  );

  async function loadBookings() {
    setPageState("loading");
    setMessages([]);
    setMessagesState("idle");
    try {
      const data = await apiFetch<BookingItem[]>("/bookings/mine");
      setBookings(data);

      if (data.length === 0) {
        setBookingId("");
        setPageState("empty");
        return;
      }

      setBookingId((current) => {
        if (data.some((item) => item.id === current)) {
          return current;
        }
        return data[0].id;
      });
      setPageState("success");
    } catch (error) {
      setPageState("error");
      setActionState("error");
      setActionMessage(resolveErrorMessage(error, "No se pudieron cargar tus reservas."));
    }
  }

  async function loadMessages(selectedBookingId: string, silent = false) {
    if (!selectedBookingId) {
      return;
    }

    if (!silent) {
      setMessagesState("loading");
    }

    try {
      const data = await apiFetch<MessageItem[]>(`/messaging/bookings/${selectedBookingId}/messages`);
      setMessages(data);
      setMessagesState(data.length === 0 ? "empty" : "success");
    } catch (error) {
      setMessagesState("error");
      setActionState("error");
      setActionMessage(resolveErrorMessage(error, "No se pudo cargar la conversación."));
    }
  }

  useEffect(() => {
    void loadBookings();
  }, []);

  useEffect(() => {
    if (!bookingId) {
      return;
    }

    void trackEvent("messaging_thread_opened", { bookingId });
    void loadMessages(bookingId);
  }, [bookingId]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!bookingId) {
      setActionState("error");
      setActionMessage("Selecciona una reserva para enviar el mensaje.");
      return;
    }

    const trimmedBody = body.trim();
    if (trimmedBody.length === 0) {
      setActionState("error");
      setActionMessage("El mensaje no puede estar vacío.");
      return;
    }

    if (trimmedBody.length > 1000) {
      setActionState("error");
      setActionMessage("El mensaje no puede superar los 1000 caracteres.");
      return;
    }

    setActionState("loading");
    setActionMessage("Enviando mensaje...");

    try {
      await apiFetch(`/messaging/bookings/${bookingId}/messages`, {
        method: "POST",
        body: JSON.stringify({ body: trimmedBody })
      });

      setBody("");
      setActionState("success");
      setActionMessage("Mensaje enviado correctamente.");

      void trackEvent("messaging_message_sent", {
        bookingId,
        length: trimmedBody.length
      });

      await loadMessages(bookingId, true);
    } catch (error) {
      setActionState("error");
      setActionMessage(resolveErrorMessage(error, "No fue posible enviar el mensaje."));
    }
  }

  return (
    <WorkspaceShell
      section="Cliente"
      title="Mensajes"
      description="Comunicación directa con tu proveedor en cada reserva."
      links={[
        { href: "/app/dashboard", label: "Dashboard" },
        { href: "/app/reservas", label: "Mis reservas" },
        { href: "/app/soporte", label: "Soporte" },
        { href: "/app/notificaciones", label: "Notificaciones" }
      ]}
    >
      <StatePanel
        state={pageState}
        description={
          pageState === "empty"
            ? "Aún no tienes reservas para abrir conversaciones."
            : "Cargando tu bandeja de mensajes."
        }
      />

      {pageState === "success" ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Contexto de conversación</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="booking">Reserva</Label>
              <Select value={bookingId} onValueChange={setBookingId}>
                <SelectTrigger id="booking">
                  <SelectValue placeholder="Selecciona una reserva" />
                </SelectTrigger>
                <SelectContent>
                  {bookings.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      #{item.id.slice(0, 8)} · {item.service?.title ?? item.serviceId.slice(0, 8)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>
                Estado actual:{" "}
                <span className="text-foreground">{formatStatus(selectedBooking?.status ?? "unknown")}</span>
              </p>
              <p>
                Fecha agendada:{" "}
                <span className="text-foreground">
                  {selectedBooking ? new Date(selectedBooking.scheduledAt).toLocaleString() : "N/A"}
                </span>
              </p>
              <p>
                Proveedor:{" "}
                <span className="text-foreground">
                  {selectedBooking?.provider?.fullName ?? "No disponible"}
                </span>
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {pageState === "success" ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Enviar mensaje</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-3" onSubmit={onSubmit}>
              <div className="grid gap-2">
                <Label htmlFor="body">Mensaje</Label>
                <Textarea
                  id="body"
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  placeholder="Escribe tu mensaje para el proveedor..."
                  maxLength={1000}
                  required
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">{body.length}/1000 caracteres</p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (bookingId) {
                        void loadMessages(bookingId);
                      }
                    }}
                  >
                    Actualizar
                  </Button>
                  <Button type="submit">Enviar</Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {actionState !== "idle" ? (
        <div className="mt-6">
          <StatePanel state={actionState} description={actionMessage} />
        </div>
      ) : null}

      {pageState === "success" ? (
        <div className="mt-6">
          <StatePanel
            state={messagesState}
            description={
              messagesState === "empty"
                ? "Aún no hay mensajes en esta reserva. Inicia la conversación."
                : undefined
            }
          />
        </div>
      ) : null}

      <div className="mt-6 grid gap-3">
        {messages.map((message) => (
          <Card key={message.id}>
            <CardContent className="pt-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">
                    {message.sender.email} · {message.sender.role}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{message.body}</p>
                </div>
                <Badge variant="outline">{new Date(message.createdAt).toLocaleString()}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </WorkspaceShell>
  );
}
