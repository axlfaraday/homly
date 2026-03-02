"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatePanel } from "@/components/shared/state-panel";
import { ApiState, apiFetch } from "@/lib/api";

interface BookingItem { id: string; }
interface MessageItem { id: string; body: string; createdAt: string; sender: { email: string; role: string } }

export default function CustomerMessagesPage() {
  const [state, setState] = useState<ApiState>("loading");
  const [bookingId, setBookingId] = useState("");
  const [body, setBody] = useState("");
  const [messages, setMessages] = useState<MessageItem[]>([]);

  useEffect(() => {
    async function loadBookings() {
      try {
        const bookings = await apiFetch<BookingItem[]>("/bookings/mine");
        if (bookings.length === 0) {
          setState("empty");
          return;
        }
        setBookingId(bookings[0].id);
        setState("success");
      } catch {
        setState("error");
      }
    }
    void loadBookings();
  }, []);

  async function loadMessages(id: string) {
    try {
      const data = await apiFetch<MessageItem[]>(`/messaging/bookings/${id}/messages`);
      setMessages(data);
      setState(data.length === 0 ? "empty" : "success");
    } catch {
      setState("error");
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!bookingId || !body.trim()) {
      setState("error");
      return;
    }
    setState("loading");

    try {
      await apiFetch(`/messaging/bookings/${bookingId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body })
      });
      setBody("");
      await loadMessages(bookingId);
    } catch {
      setState("error");
    }
  }

  return (
    <main className="container py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Mensajes</h1>
      <p className="mt-2 text-sm text-muted-foreground">Comunicación directa con el proveedor por reserva.</p>
      <div className="mt-6"><StatePanel state={state} /></div>

      <Card className="mt-6">
        <CardHeader><CardTitle className="text-base">Enviar mensaje</CardTitle></CardHeader>
        <CardContent>
          <form className="grid gap-3" onSubmit={onSubmit}>
            <div className="grid gap-2"><Label htmlFor="bookingId">Reserva</Label><Input id="bookingId" value={bookingId} onChange={(e) => setBookingId(e.target.value)} required /></div>
            <div className="grid gap-2"><Label htmlFor="body">Mensaje</Label><Input id="body" value={body} onChange={(e) => setBody(e.target.value)} required /></div>
            <div className="flex gap-2">
              <Button type="submit">Enviar</Button>
              <Button type="button" variant="outline" onClick={() => void loadMessages(bookingId)}>Actualizar</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-3">
        {messages.map((msg) => (
          <Card key={msg.id}>
            <CardContent className="pt-4 text-sm"><p className="font-medium">{msg.sender.email} ({msg.sender.role})</p><p className="text-muted-foreground">{msg.body}</p></CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
