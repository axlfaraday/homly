"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatePanel } from "@/components/shared/state-panel";
import { ApiState, apiFetch } from "@/lib/api";

interface TicketItem {
  id: string;
  subject: string;
  status: string;
  createdAt: string;
}

export default function AdminSupportPage() {
  const [state, setState] = useState<ApiState>("loading");
  const [items, setItems] = useState<TicketItem[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const data = await apiFetch<TicketItem[]>("/support/tickets/mine");
        setItems(data);
        setState(data.length === 0 ? "empty" : "success");
      } catch {
        setState("error");
      }
    }
    void load();
  }, []);

  return (
    <main className="container py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Admin · soporte</h1>
      <p className="mt-2 text-sm text-muted-foreground">Seguimiento transversal de tickets.</p>
      <div className="mt-6"><StatePanel state={state} /></div>
      <div className="mt-6 grid gap-3">
        {items.map((item) => (
          <Card key={item.id}><CardContent className="pt-4 text-sm text-muted-foreground"><p className="font-medium text-foreground">{item.subject}</p><p>{item.status} · {new Date(item.createdAt).toLocaleString()}</p></CardContent></Card>
        ))}
      </div>
    </main>
  );
}
