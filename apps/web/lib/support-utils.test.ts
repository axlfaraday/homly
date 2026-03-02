import { describe, expect, it } from "vitest";
import { validateSupportTicketForm } from "@/lib/support-utils";

describe("support utils", () => {
  it("returns field errors when subject/description are short", () => {
    expect(
      validateSupportTicketForm({
        subject: "abc",
        description: "corta"
      })
    ).toEqual({
      subject: "El asunto debe tener al menos 5 caracteres.",
      description: "La descripción debe tener al menos 10 caracteres."
    });
  });

  it("returns no errors for a valid support ticket payload", () => {
    expect(
      validateSupportTicketForm({
        subject: "No puedo completar mi reserva",
        description: "El proveedor no confirma mi solicitud desde hace 24 horas."
      })
    ).toEqual({});
  });
});
