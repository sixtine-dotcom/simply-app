export function safeLoginDestination(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u001f]/.test(value)) return "/";
  try { return new URL(value, "https://simply.invalid").origin === "https://simply.invalid" ? value : "/"; } catch { return "/"; }
}
