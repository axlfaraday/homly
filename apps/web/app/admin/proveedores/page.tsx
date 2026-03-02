"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatePanel } from "@/components/shared/state-panel";
import { ApiState, apiFetch } from "@/lib/api";

interface ProviderItem {
  id: string;
  fullName: string;
  city: string;
  verificationStatus: string;
}

export default function AdminProvidersPage() {
  const [state, setState] = useState<ApiState>("loading");
  const [items, setItems] = useState<ProviderItem[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const data = await apiFetch<ProviderItem[]>("/providers");
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
      <h1 className="text-3xl font-semibold tracking-tight">Admin · proveedores</h1>
      <p className="mt-2 text-sm text-muted-foreground">Vista rápida de estado de verificación.</p>
      <div className="mt-6"><StatePanel state={state} /></div>
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {items.map((item) => (
          <Card key={item.id}>
            <CardHeader><CardTitle className="text-base">{item.fullName}</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">{item.city} · {item.verificationStatus}</CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
