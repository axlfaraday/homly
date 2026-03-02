"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatePanel } from "@/components/shared/state-panel";
import { ApiState, apiFetch } from "@/lib/api";

interface TicketItem { id: string; subject: string; status: string; createdAt: string; }

export default function CustomerSupportPage() {
  const [state, setState] = useState<ApiState>("loading");
  const [items, setItems] = useState<TicketItem[]>([]);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");

  async function loadTickets() {
    try {
      const data = await apiFetch<TicketItem[]>("/support/tickets/mine");
      setItems(data);
      setState(data.length === 0 ? "empty" : "success");
    } catch {
      setState("error");
    }
  }

  useEffect(() => {
    void loadTickets();
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (subject.trim().length < 5 || description.trim().length < 10) {
      setState("error");
      return;
    }

    setState("loading");
    try {
      await apiFetch("/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, description })
      });
      setSubject("");
      setDescription("");
      await loadTickets();
    } catch {
      setState("error");
    }
  }

  return (
    <main className="container py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Soporte</h1>
      <p className="mt-2 text-sm text-muted-foreground">Abre y monitorea tickets en una sola vista.</p>

      <Card className="mt-6">
        <CardHeader><CardTitle className="text-base">Crear ticket</CardTitle></CardHeader>
        <CardContent>
          <form className="grid gap-3" onSubmit={onSubmit}>
            <div className="grid gap-2"><Label htmlFor="subject">Asunto</Label><Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} required /></div>
            <div className="grid gap-2"><Label htmlFor="description">Descripción</Label><Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} required /></div>
            <Button type="submit">Enviar ticket</Button>
          </form>
        </CardContent>
      </Card>

      <div className="mt-6"><StatePanel state={state} /></div>
      <div className="mt-6 grid gap-3">
        {items.map((item) => (
          <Card key={item.id}><CardContent className="pt-4 text-sm text-muted-foreground"><p className="font-medium text-foreground">{item.subject}</p><p>{item.status} · {new Date(item.createdAt).toLocaleString()}</p></CardContent></Card>
        ))}
      </div>
    </main>
  );
}
