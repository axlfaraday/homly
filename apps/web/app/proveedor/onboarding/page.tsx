"use client";

import { FormEvent, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export default function ProviderOnboardingPage() {
  const [result, setResult] = useState<string>("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult("Procesando...");

    const formData = new FormData(event.currentTarget);
    const payload = {
      userId: String(formData.get("userId") ?? ""),
      fullName: String(formData.get("fullName") ?? ""),
      bio: String(formData.get("bio") ?? ""),
      city: String(formData.get("city") ?? ""),
      coverage: String(formData.get("coverage") ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    };

    const response = await fetch(`${API_URL}/providers/profile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
      setResult(`Error: ${JSON.stringify(data)}`);
      return;
    }

    setResult(`Perfil guardado: ${data.id}`);
  }

  return (
    <main className="container">
      <h1>Onboarding proveedor</h1>
      <form onSubmit={onSubmit} className="card" style={{ display: "grid", gap: "0.75rem" }}>
        <label>
          User ID (desde registro)
          <input name="userId" required />
        </label>
        <label>
          Nombre completo
          <input name="fullName" required />
        </label>
        <label>
          Biografia
          <textarea name="bio" minLength={20} required />
        </label>
        <label>
          Ciudad
          <input name="city" required />
        </label>
        <label>
          Cobertura (separado por comas)
          <input name="coverage" placeholder="usaquen, chapinero" required />
        </label>
        <button type="submit">Guardar perfil</button>
      </form>
      {result ? <p>{result}</p> : null}
    </main>
  );
}
