export interface SupportTicketFormInput {
  subject: string;
  description: string;
}

export interface SupportTicketFormErrors {
  subject?: string;
  description?: string;
}

export function validateSupportTicketForm(
  input: SupportTicketFormInput
): SupportTicketFormErrors {
  const subject = input.subject.trim();
  const description = input.description.trim();
  const errors: SupportTicketFormErrors = {};

  if (subject.length < 5) {
    errors.subject = "El asunto debe tener al menos 5 caracteres.";
  } else if (subject.length > 120) {
    errors.subject = "El asunto no puede superar los 120 caracteres.";
  }

  if (description.length < 10) {
    errors.description = "La descripción debe tener al menos 10 caracteres.";
  } else if (description.length > 2000) {
    errors.description = "La descripción no puede superar los 2000 caracteres.";
  }

  return errors;
}
