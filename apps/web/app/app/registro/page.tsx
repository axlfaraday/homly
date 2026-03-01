"use client";

import { FormEvent, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export default function RegisterPage() {
  const [result, setResult] = useState<string>("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult("Procesando...");

    const formData = new FormData(event.currentTarget);
    const payload = {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      role: String(formData.get("role") ?? "customer")
    };

    const response = await fetch(`${API_URL}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
      setResult(`Error: ${JSON.stringify(data)}`);
      return;
    }

    setResult(`Usuario creado: ${data.user.id}`);
  }

  return (
    <main className="container">
      <h1>Registro</h1>
      <form onSubmit={onSubmit} className="card" style={{ display: "grid", gap: "0.75rem" }}>
        <label>
          Email
          <input name="email" type="email" required />
        </label>
        <label>
          Password (min 8)
          <input name="password" type="password" minLength={8} required />
        </label>
        <label>
          Rol
          <select name="role" defaultValue="customer">
            <option value="customer">Cliente</option>
            <option value="provider">Proveedor</option>
          </select>
        </label>
        <button type="submit">Crear cuenta</button>
      </form>
      {result ? <p>{result}</p> : null}
    </main>
  );
}
