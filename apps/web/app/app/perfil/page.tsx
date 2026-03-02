"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatePanel } from "@/components/shared/state-panel";
import { ApiState, apiFetch } from "@/lib/api";

interface Me { id: string; email: string; role: string; }

export default function CustomerProfilePage() {
  const [state, setState] = useState<ApiState>("loading");
  const [me, setMe] = useState<Me | null>(null);
  const [email, setEmail] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const data = await apiFetch<Me>("/users/me");
        setMe(data);
        setEmail(data.email);
        setState("success");
      } catch {
        setState("error");
      }
    }
    void load();
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!email.includes("@")) {
      setState("error");
      return;
    }

    setState("loading");
    try {
      const updated = await apiFetch<Me>("/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      setMe(updated);
      setState("success");
    } catch {
      setState("error");
    }
  }

  return (
    <main className="container py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Mi perfil</h1>
      <p className="mt-2 text-sm text-muted-foreground">Actualiza tus datos de cuenta.</p>
      <div className="mt-6"><StatePanel state={state} /></div>

      <Card className="mt-6 max-w-xl">
        <CardHeader><CardTitle className="text-base">Datos de usuario</CardTitle></CardHeader>
        <CardContent>
          <form className="grid gap-3" onSubmit={onSubmit}>
            <div className="grid gap-2"><Label>ID</Label><Input value={me?.id ?? ""} disabled aria-label="ID de usuario" /></div>
            <div className="grid gap-2"><Label>Email</Label><Input value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
            <div className="grid gap-2"><Label>Rol</Label><Input value={me?.role ?? ""} disabled aria-label="Rol" /></div>
            <Button type="submit">Guardar cambios</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
