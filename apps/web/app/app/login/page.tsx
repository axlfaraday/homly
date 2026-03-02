"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatePanel } from "@/components/shared/state-panel";
import { API_URL, ApiState } from "@/lib/api";
import { persistSession, readStoredSession, resolvePostAuthPath, type AppRole } from "@/lib/session";

function asRole(value: unknown): AppRole {
  if (value === "provider" || value === "admin") {
    return value;
  }
  return "customer";
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<ApiState>("idle");
  const [feedback, setFeedback] = useState("Ingresa tus credenciales.");

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

    if (!email || !password) {
      setState("error");
      setFeedback("Debes completar email y contraseña.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      if (!response.ok) {
        const msg =
          typeof data?.message === "string"
            ? data.message
            : Array.isArray(data?.message)
              ? data.message.join(", ")
              : "No fue posible iniciar sesión.";
        throw new Error(msg);
      }

      const role = asRole(data.user?.role);
      persistSession({
        token: String(data.accessToken ?? ""),
        userId: String(data.user?.id ?? ""),
        role
      });
      setState("success");
      setFeedback(`Sesión iniciada como ${role}.`);
      router.push(resolvePostAuthPath(role, searchParams.get("next")));
    } catch (error) {
      setState("error");
      setFeedback(error instanceof Error ? error.message : "No fue posible iniciar sesión.");
    }
  }

  return (
    <main className="container py-10">
      <div className="mx-auto max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Iniciar sesión</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4" onSubmit={onSubmit} noValidate>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" autoComplete="email" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input id="password" name="password" type="password" autoComplete="current-password" required />
              </div>
              <Button type="submit">Entrar</Button>
            </form>
            <div className="mt-4">
              <StatePanel state={state} description={feedback} />
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              ¿No tienes cuenta? <Link className="underline" href="/app/registro">Regístrate</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
