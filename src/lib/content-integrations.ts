import crypto from "crypto";
import { db } from "@/lib/db";

export type ContentIntegrationProvider = "canva" | "meta" | "instagram";

const appUrl = () => process.env.APP_URL || "http://localhost:3000";
const secret = () => process.env.AUTH_SECRET || "simply-development-secret";

export function integrationRedirectUri(provider: ContentIntegrationProvider) {
  return `${appUrl()}/api/integrations/${provider}/callback`;
}

export function signIntegrationState(input: { userId: string; provider: ContentIntegrationProvider; returnTo?: string }) {
  const payload = Buffer.from(JSON.stringify({ ...input, at: Date.now() })).toString("base64url");
  const signature = crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyIntegrationState(value: string, provider: ContentIntegrationProvider) {
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;
  const expected = crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (parsed.provider !== provider || typeof parsed.userId !== "string" || Date.now() - parsed.at > 15 * 60_000) return null;
    return parsed as { userId: string; provider: ContentIntegrationProvider; returnTo?: string; at: number };
  } catch {
    return null;
  }
}

export function createPkce() {
  const verifier = crypto.randomBytes(64).toString("base64url");
  const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export async function getValidCanvaToken(userId: string) {
  const connection = await db.integrationConnection.findUnique({ where: { userId_provider: { userId, provider: "canva" } } });
  if (!connection) return null;
  if (!connection.expiresAt || connection.expiresAt.getTime() > Date.now() + 60_000 || !connection.refreshToken) return connection.accessToken;
  const clientId = process.env.CANVA_CLIENT_ID;
  const clientSecret = process.env.CANVA_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  const response = await fetch("https://api.canva.com/rest/v1/oauth/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: connection.refreshToken }),
  });
  if (!response.ok) return null;
  const token = await response.json();
  await db.integrationConnection.update({
    where: { id: connection.id },
    data: {
      accessToken: token.access_token,
      refreshToken: token.refresh_token || connection.refreshToken,
      expiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null,
      scope: token.scope || connection.scope,
    },
  });
  return token.access_token as string;
}

export function metaGraphUrl(path: string) {
  const version = process.env.META_GRAPH_VERSION || "v23.0";
  return `https://graph.facebook.com/${version}/${path.replace(/^\//, "")}`;
}
