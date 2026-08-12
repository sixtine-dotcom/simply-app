import { db } from "@/lib/db";

const APP_URL = process.env.APP_URL || "http://localhost:3000";
const SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/gmail.send",
];

function credentials() {
  return {
    clientId: process.env.GOOGLE_MAIL_CLIENT_ID || process.env.GOOGLE_CALENDAR_CLIENT_ID,
    clientSecret: process.env.GOOGLE_MAIL_CLIENT_SECRET || process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
  };
}

export function googleMailAuthorizationUrl(state: string) {
  const { clientId } = credentials();
  if (!clientId) throw new Error("Google OAuth is niet ingesteld");
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", `${APP_URL}/api/integrations/google-mail/callback`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", SCOPES.join(" "));
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);
  return url.toString();
}

export async function connectGoogleMail(userId: string, code: string) {
  const { clientId, clientSecret } = credentials();
  if (!clientId || !clientSecret) throw new Error("Google OAuth is niet ingesteld");
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, code, grant_type: "authorization_code", redirect_uri: `${APP_URL}/api/integrations/google-mail/callback` }),
  });
  if (!response.ok) throw new Error(`Google token exchange failed: ${await response.text()}`);
  const token = await response.json() as { access_token: string; refresh_token?: string; expires_in?: number; scope?: string };
  const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${token.access_token}` } });
  if (!profileResponse.ok) throw new Error("Google-profiel kon niet worden gelezen");
  const profile = await profileResponse.json() as { sub: string; email: string };
  return db.integrationConnection.upsert({
    where: { userId_provider: { userId, provider: "google_mail" } },
    create: { userId, provider: "google_mail", providerAccountId: profile.sub, accountName: profile.email, accessToken: token.access_token, refreshToken: token.refresh_token, expiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null, scope: token.scope },
    update: { providerAccountId: profile.sub, accountName: profile.email, accessToken: token.access_token, refreshToken: token.refresh_token ?? undefined, expiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null, scope: token.scope },
  });
}

async function validAccessToken(userId: string) {
  const connection = await db.integrationConnection.findUnique({ where: { userId_provider: { userId, provider: "google_mail" } } });
  if (!connection) throw new Error("Google e-mail is nog niet gekoppeld");
  if (!connection.expiresAt || connection.expiresAt.getTime() > Date.now() + 60_000) return connection.accessToken;
  if (!connection.refreshToken) throw new Error("Koppel Google e-mail opnieuw");
  const { clientId, clientSecret } = credentials();
  if (!clientId || !clientSecret) throw new Error("Google OAuth is niet ingesteld");
  const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: connection.refreshToken, grant_type: "refresh_token" }) });
  if (!response.ok) throw new Error("Google e-mailtoegang kon niet worden vernieuwd");
  const token = await response.json() as { access_token: string; expires_in?: number };
  await db.integrationConnection.update({ where: { id: connection.id }, data: { accessToken: token.access_token, expiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null } });
  return token.access_token;
}

function encoded(value: string) {
  return Buffer.from(value).toString("base64url");
}

export async function sendGoogleMail(input: { userId: string; to: string; subject: string; html: string; fromEmail: string }) {
  const token = await validAccessToken(input.userId);
  const subject = `=?UTF-8?B?${Buffer.from(input.subject).toString("base64")}?=`;
  const raw = [`From: Simply in Balance <${input.fromEmail}>`, `Reply-To: ${input.fromEmail}`, `To: ${input.to}`, `Subject: ${subject}`, "MIME-Version: 1.0", "Content-Type: text/html; charset=UTF-8", "", input.html].join("\r\n");
  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ raw: encoded(raw) }) });
  if (!response.ok) throw new Error(`Google kon de mail niet verzenden: ${await response.text()}`);
  return response.json() as Promise<{ id: string }>;
}
