import { db } from "@/lib/db";

// TikTok Content Posting API (v2). Docs: https://developers.tiktok.com/doc/content-posting-api-get-started
const TIKTOK_API = "https://open.tiktokapis.com/v2";
export const TIKTOK_SCOPES = "user.info.basic,video.publish";

const MB = 1024 * 1024;
const MIN_CHUNK = 5 * MB;
const MAX_CHUNK = 64 * MB;
const TARGET_CHUNK = 10 * MB;

export function tiktokConfigured() {
  return Boolean(process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET);
}

type TikTokToken = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  refresh_expires_in?: number;
  open_id?: string;
  scope?: string;
};

async function tokenRequest(values: Record<string, string>) {
  const response = await fetch(`${TIKTOK_API}/oauth/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "Cache-Control": "no-cache" },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY || "",
      client_secret: process.env.TIKTOK_CLIENT_SECRET || "",
      ...values,
    }),
  });
  const data = await response.json();
  if (!response.ok || data.error) throw new Error(data.error_description || data.error || "TikTok-token ophalen mislukt");
  return data as TikTokToken;
}

export function exchangeTikTokCode(code: string, redirectUri: string) {
  return tokenRequest({ code, grant_type: "authorization_code", redirect_uri: redirectUri });
}

async function tiktokFetch<T>(path: string, token: string, body?: unknown, method = "POST"): Promise<T> {
  const response = await fetch(`${TIKTOK_API}/${path.replace(/^\//, "")}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json; charset=UTF-8" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok || (data.error?.code && data.error.code !== "ok")) {
    throw new Error(data.error?.message || "TikTok-aanvraag mislukt");
  }
  return data.data as T;
}

export async function fetchTikTokDisplayName(token: string) {
  try {
    const data = await tiktokFetch<{ user?: { display_name?: string } }>("user/info/?fields=open_id,display_name", token, undefined, "GET");
    return data.user?.display_name || null;
  } catch {
    return null;
  }
}

export async function getValidTikTokToken(userId: string) {
  const connection = await db.integrationConnection.findUnique({ where: { userId_provider: { userId, provider: "tiktok" } } });
  if (!connection) return null;
  // TikTok access tokens live 24 hours; refresh tokens 365 days.
  if (!connection.expiresAt || connection.expiresAt.getTime() > Date.now() + 5 * 60_000 || !connection.refreshToken) return connection.accessToken;
  const token = await tokenRequest({ grant_type: "refresh_token", refresh_token: connection.refreshToken });
  await db.integrationConnection.update({
    where: { id: connection.id },
    data: {
      accessToken: token.access_token,
      refreshToken: token.refresh_token || connection.refreshToken,
      expiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null,
      scope: token.scope || connection.scope,
    },
  });
  return token.access_token;
}

type CreatorInfo = {
  privacy_level_options?: string[];
  max_video_post_duration_sec?: number;
};

// Unaudited TikTok apps may only post as SELF_ONLY (private). Once the app passes TikTok's audit,
// set TIKTOK_PRIVACY_LEVEL=PUBLIC_TO_EVERYONE to publish publicly.
function choosePrivacyLevel(options: string[]) {
  const wanted = process.env.TIKTOK_PRIVACY_LEVEL || "PUBLIC_TO_EVERYONE";
  if (options.includes(wanted)) return wanted;
  if (options.includes("SELF_ONLY")) return "SELF_ONLY";
  return options[0] || "SELF_ONLY";
}

function chunkPlan(size: number) {
  if (size <= MAX_CHUNK) return { chunkSize: size, count: 1 };
  const chunkSize = Math.max(MIN_CHUNK, TARGET_CHUNK);
  // The final chunk absorbs the remainder, so the count is rounded down.
  return { chunkSize, count: Math.floor(size / chunkSize) };
}

async function waitForTikTokPublish(token: string, publishId: string) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const status = await tiktokFetch<{ status?: string; fail_reason?: string }>("post/publish/status/fetch/", token, { publish_id: publishId });
    if (status.status === "PUBLISH_COMPLETE" || status.status === "SEND_TO_USER_INBOX") return status.status;
    if (status.status === "FAILED") throw new Error(`TikTok kon de video niet publiceren${status.fail_reason ? ` (${status.fail_reason})` : ""}`);
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
  // Still processing on TikTok's side; the post usually appears a few minutes later.
  return "PROCESSING";
}

export async function publishTikTokVideo(token: string, videoUrl: string, caption: string) {
  const creator = await tiktokFetch<CreatorInfo>("post/publish/creator_info/query/", token, {});
  const privacyLevel = choosePrivacyLevel(creator.privacy_level_options || []);

  // FILE_UPLOAD avoids TikTok's URL-prefix domain verification required by PULL_FROM_URL.
  const download = await fetch(videoUrl);
  if (!download.ok) throw new Error("De video kon niet worden opgehaald voor TikTok");
  const video = Buffer.from(await download.arrayBuffer());
  const { chunkSize, count } = chunkPlan(video.length);

  const init = await tiktokFetch<{ publish_id: string; upload_url: string }>("post/publish/video/init/", token, {
    post_info: {
      title: caption.slice(0, 2200),
      privacy_level: privacyLevel,
      disable_comment: false,
      disable_duet: false,
      disable_stitch: false,
    },
    source_info: { source: "FILE_UPLOAD", video_size: video.length, chunk_size: chunkSize, total_chunk_count: count },
  });

  const contentType = download.headers.get("content-type")?.startsWith("video/") ? download.headers.get("content-type")! : "video/mp4";
  for (let index = 0; index < count; index += 1) {
    const start = index * chunkSize;
    const end = index === count - 1 ? video.length : start + chunkSize;
    const upload = await fetch(init.upload_url, {
      method: "PUT",
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(end - start),
        "Content-Range": `bytes ${start}-${end - 1}/${video.length}`,
      },
      body: video.subarray(start, end),
    });
    if (!upload.ok) throw new Error(`Uploaden naar TikTok mislukt (deel ${index + 1}/${count})`);
  }

  const status = await waitForTikTokPublish(token, init.publish_id);
  return { publishId: init.publish_id, status, privacyLevel };
}
