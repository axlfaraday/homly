"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatePanel } from "@/components/shared/state-panel";
import { ApiState, apiFetch } from "@/lib/api";

interface TicketItem { id: string; subject: string; status: string; }

export default function ProviderSupportPage() {
  const [state, setState] = useState<ApiState>("loading");
  const [ticketId, setTicketId] = useState("");
  const [items, setItems] = useState<TicketItem[]>([]);

  async function load() {
    try {
      const data = await apiFetch<TicketItem[]>("/support/tickets/mine");
      setItems(data);
      if (data[0]) setTicketId(data[0].id);
      setState(data.length === 0 ? "empty" : "success");
    } catch {
      setState("error");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!ticketId) {
      setState("error");
      return;
    }

    setState("loading");
    try {
      await apiFetch(`/support/tickets/${ticketId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "resolved", resolutionNote: "Gestionado por proveedor" })
      });
      await load();
    } catch {
      setState("error");
    }
  }

  return (
    <main className="container py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Soporte proveedor</h1>
      <p className="mt-2 text-sm text-muted-foreground">Gestiona tickets asociados a tus reservas.</p>

      <Card className="mt-6">
        <CardHeader><CardTitle className="text-base">Resolver ticket</CardTitle></CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-3" onSubmit={onSubmit}>
            <div className="grid gap-2 md:col-span-2"><Label htmlFor="ticket">Ticket ID</Label><Input id="ticket" value={ticketId} onChange={(e) => setTicketId(e.target.value)} /></div>
            <div className="flex items-end"><Button className="w-full" type="submit">Marcar resuelto</Button></div>
          </form>
        </CardContent>
      </Card>

      <div className="mt-6"><StatePanel state={state} /></div>
      <div className="mt-6 grid gap-3">
        {items.map((item) => (
          <Card key={item.id}><CardContent className="pt-4 text-sm text-muted-foreground"><p className="font-medium text-foreground">{item.subject}</p><p>{item.status}</p></CardContent></Card>
        ))}
      </div>
    </main>
  );
}
