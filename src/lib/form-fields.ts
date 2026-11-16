// Shared by the builder, customer form and server-side response validation.
export const CONTACT_INFO_FIELDS = [
  { key: "firstName", label: "Voornaam", type: "text", autoComplete: "given-name" },
  { key: "lastName", label: "Achternaam", type: "text", autoComplete: "family-name" },
  { key: "email", label: "E-mailadres", type: "email", autoComplete: "email" },
  { key: "phone", label: "Telefoonnummer", type: "tel", autoComplete: "tel" },
  { key: "company", label: "Bedrijfsnaam", type: "text", autoComplete: "organization" },
] as const;

export const DEFAULT_CONTACT_INFO_FIELDS = ["firstName", "lastName", "email", "phone"];

export function getContactInfoFields(options: readonly string[]) {
  const selected = options.filter((key, index) => CONTACT_INFO_FIELDS.some((field) => field.key === key) && options.indexOf(key) === index);
  const keys = selected.length ? selected : DEFAULT_CONTACT_INFO_FIELDS;
  return keys.map((key) => CONTACT_INFO_FIELDS.find((field) => field.key === key)!);
}

export function hasFormAnswer(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === "object") return Object.values(value).some(hasFormAnswer);
  return value !== null && value !== undefined && String(value).trim() !== "";
}

export function getContactFieldError(key: string, value: unknown, required: boolean) {
  const field = CONTACT_INFO_FIELDS.find((entry) => entry.key === key);
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return required ? `Vul ${field?.label.toLowerCase() || "dit veld"} in.` : null;
  if (key === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) return "Vul een geldig e-mailadres in.";
  return null;
}

export function getQuestionAnswerError(question: { type: string; isRequired: boolean; options: readonly string[] }, value: unknown): string | null {
  if (question.type === "CONTACT_INFO") {
    const fields = getContactInfoFields(question.options);
    const contact = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
    if (hasFormAnswer(value) && Object.keys(contact).length === 0) return "Vul de contactgegevens in de afzonderlijke velden in.";
    for (const field of fields) {
      const error = getContactFieldError(field.key, contact[field.key], question.isRequired);
      if (error) return error;
    }
    return null;
  }
  if (question.isRequired && !hasFormAnswer(value)) return "Vul een antwoord in om verder te gaan.";
  return null;
}

export class FormAnswerValidationError extends Error {}
