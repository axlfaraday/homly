"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatePanel } from "@/components/shared/state-panel";
import { ApiState, apiFetch } from "@/lib/api";

interface ProfileItem { id: string; }
interface SlotItem { id: string; weekday: number; startTime: string; endTime: string; }

export default function ProviderAvailabilityPage() {
  const [state, setState] = useState<ApiState>("loading");
  const [providerId, setProviderId] = useState("");
  const [slots, setSlots] = useState<SlotItem[]>([]);

  async function load(provider: string) {
    try {
      const data = await apiFetch<SlotItem[]>(`/availability/provider/${provider}`);
      setSlots(data);
      setState(data.length === 0 ? "empty" : "success");
    } catch {
      setState("error");
    }
  }

  useEffect(() => {
    async function bootstrap() {
      try {
        const userId = localStorage.getItem("homly_user_id") ?? "";
        const profile = await apiFetch<ProfileItem>(`/providers/user/${userId}`);
        setProviderId(profile.id);
        await load(profile.id);
      } catch {
        setState("error");
      }
    }
    void bootstrap();
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!providerId) {
      setState("error");
      return;
    }

    const form = new FormData(event.currentTarget);
    const payload = {
      providerId,
      slots: [
        {
          weekday: Number(form.get("weekday") ?? 1),
          startTime: String(form.get("startTime") ?? "08:00"),
          endTime: String(form.get("endTime") ?? "12:00")
        }
      ]
    };

    setState("loading");
    try {
      await apiFetch("/availability/weekly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      await load(providerId);
    } catch {
      setState("error");
    }
  }

  return (
    <main className="container py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Disponibilidad</h1>
      <p className="mt-2 text-sm text-muted-foreground">Define bloques semanales visibles para clientes.</p>

      <Card className="mt-6">
        <CardHeader><CardTitle className="text-base">Nuevo bloque</CardTitle></CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-4" onSubmit={onSubmit}>
            <div className="grid gap-2"><Label htmlFor="weekday">Día (0-6)</Label><Input id="weekday" name="weekday" type="number" min={0} max={6} required /></div>
            <div className="grid gap-2"><Label htmlFor="startTime">Inicio</Label><Input id="startTime" name="startTime" placeholder="08:00" required /></div>
            <div className="grid gap-2"><Label htmlFor="endTime">Fin</Label><Input id="endTime" name="endTime" placeholder="12:00" required /></div>
            <div className="flex items-end"><Button className="w-full" type="submit">Guardar</Button></div>
          </form>
        </CardContent>
      </Card>

      <div className="mt-6"><StatePanel state={state} /></div>
      <div className="mt-6 grid gap-3">
        {slots.map((slot) => (
          <Card key={slot.id}><CardContent className="pt-4 text-sm text-muted-foreground">Día {slot.weekday}: {slot.startTime} - {slot.endTime}</CardContent></Card>
        ))}
      </div>
    </main>
  );
}
