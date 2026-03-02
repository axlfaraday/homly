import { describe, expect, it } from "vitest";
import { getRoleHome, resolvePostAuthPath } from "@/lib/session";

describe("session helpers", () => {
  it("returns default home per role", () => {
    expect(getRoleHome("customer")).toBe("/app/dashboard");
    expect(getRoleHome("provider")).toBe("/proveedor/dashboard");
    expect(getRoleHome("admin")).toBe("/admin/ordenes");
  });

  it("uses next path when it is valid", () => {
    expect(resolvePostAuthPath("customer", "/app/reservas")).toBe("/app/reservas");
    expect(resolvePostAuthPath("provider", "/proveedor/servicios")).toBe("/proveedor/servicios");
  });

  it("falls back to role home for invalid next path", () => {
    expect(resolvePostAuthPath("customer", "https://evil.test")).toBe("/app/dashboard");
    expect(resolvePostAuthPath("customer", "//evil.test")).toBe("/app/dashboard");
    expect(resolvePostAuthPath("customer", "/app/login")).toBe("/app/dashboard");
    expect(resolvePostAuthPath("provider", "")).toBe("/proveedor/dashboard");
  });
});
