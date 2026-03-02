"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { StatePanel } from "@/components/shared/state-panel";
import { API_URL, ApiState } from "@/lib/api";
import { persistSession, readStoredSession, resolvePostAuthPath, type AppRole } from "@/lib/session";

function asRole(value: unknown): AppRole {
  if (value === "provider" || value === "admin") {
    return value;
  }
  return "customer";
}

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<ApiState>("idle");
  const [feedback, setFeedback] = useState("Crea tu cuenta en minutos.");
  const [role, setRole] = useState("customer");

  useEffect(() => {
    const existing = readStoredSession();
    if (!existing) {
      return;
    }
    router.replace(resolvePostAuthPath(existing.role, searchParams.get("next")));
  }, [router, searchParams]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("loading");

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "").trim();

    if (!email || !password || password.length < 8) {
      setState("error");
      setFeedback("Completa un email válido y una contraseña de al menos 8 caracteres.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(JSON.stringify(data));
      }

      const createdRole = asRole(data.user?.role);
      persistSession({
        token: String(data.accessToken ?? ""),
        userId: String(data.user?.id ?? ""),
        role: createdRole
      });
      setState("success");
      setFeedback(`Cuenta creada. Rol asignado: ${createdRole}.`);
      router.push(resolvePostAuthPath(createdRole, searchParams.get("next")));
    } catch (error) {
      setState("error");
      setFeedback(error instanceof Error ? error.message : "No fue posible completar el registro.");
    }
  }

  return (
    <main className="container py-10">
      <div className="mx-auto max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Crear cuenta</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4" onSubmit={onSubmit} noValidate>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" autoComplete="email" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input id="password" name="password" type="password" minLength={8} required />
              </div>
              <div className="grid gap-2">
                <Label>Rol</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger><SelectValue placeholder="Selecciona rol" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer">Cliente</SelectItem>
                    <SelectItem value="provider">Proveedor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit">Crear cuenta</Button>
            </form>
            <div className="mt-4">
              <StatePanel state={state} description={feedback} />
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              ¿Ya tienes cuenta? <Link className="underline" href="/app/login">Inicia sesión</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
