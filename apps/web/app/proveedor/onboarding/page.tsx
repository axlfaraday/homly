"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatePanel } from "@/components/shared/state-panel";
import { ApiState, apiFetch } from "@/lib/api";

export default function ProviderOnboardingPage() {
  const [state, setState] = useState<ApiState>("idle");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("loading");
    const userId = localStorage.getItem("homly_user_id") ?? "";
    const role = localStorage.getItem("homly_user_role") ?? "";

    if (!userId || (role !== "provider" && role !== "admin")) {
      setState("error");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const payload = {
      userId,
      fullName: String(formData.get("fullName") ?? ""),
      bio: String(formData.get("bio") ?? ""),
      city: String(formData.get("city") ?? "").toLowerCase(),
      coverage: String(formData.get("coverage") ?? "")
        .split(",")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean)
    };

    if (payload.fullName.length < 2 || payload.bio.length < 20 || payload.coverage.length === 0) {
      setState("error");
      return;
    }

    try {
      await apiFetch("/providers/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      setState("success");
    } catch {
      setState("error");
    }
  }

  return (
    <main className="container py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Onboarding proveedor</h1>
      <p className="mt-2 text-sm text-muted-foreground">Configura perfil, cobertura y presentación comercial.</p>
      <Card className="mt-6 max-w-2xl">
        <CardHeader><CardTitle className="text-base">Perfil profesional</CardTitle></CardHeader>
        <CardContent>
          <form className="grid gap-3" onSubmit={onSubmit}>
            <div className="grid gap-2"><Label htmlFor="fullName">Nombre completo</Label><Input id="fullName" name="fullName" required /></div>
            <div className="grid gap-2"><Label htmlFor="bio">Biografía</Label><Textarea id="bio" name="bio" minLength={20} required /></div>
            <div className="grid gap-2"><Label htmlFor="city">Ciudad</Label><Input id="city" name="city" required /></div>
            <div className="grid gap-2"><Label htmlFor="coverage">Cobertura (comas)</Label><Input id="coverage" name="coverage" placeholder="chapinero, usaquen" required /></div>
            <Button type="submit">Guardar perfil</Button>
          </form>
        </CardContent>
      </Card>
      <div className="mt-6 max-w-2xl"><StatePanel state={state} /></div>
    </main>
  );
}
