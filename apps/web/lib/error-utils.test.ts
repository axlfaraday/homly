import { describe, expect, it } from "vitest";
import { parseApiErrorMessage, resolveErrorMessage } from "@/lib/error-utils";

describe("error utils", () => {
  it("parses api message from serialized json object", () => {
    expect(
      parseApiErrorMessage(
        JSON.stringify({ statusCode: 400, message: ["invalid_email", "password_too_short"] })
      )
    ).toBe("invalid_email, password_too_short");
  });

  it("returns null when message is not serialized json", () => {
    expect(parseApiErrorMessage("plain_error")).toBeNull();
  });

  it("maps known network/auth errors to readable spanish messages", () => {
    expect(resolveErrorMessage(new Error("network_error"))).toMatch(/No hay conexión/i);
    expect(resolveErrorMessage(new Error("auth_required"))).toMatch(/Tu sesión expiró/i);
  });

  it("extracts nested message from serialized payload error", () => {
    expect(resolveErrorMessage(new Error(JSON.stringify({ message: "Credenciales inválidas" })))).toBe(
      "Credenciales inválidas"
    );
  });
});
