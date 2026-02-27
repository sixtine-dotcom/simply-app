/**
 * Strava API – OAuth & activities
 * Many Garmin/Fitbit/Polar/Apple Watch users sync to Strava, so one integration covers multiple devices.
 */

const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;
const APP_URL = process.env.APP_URL || "http://localhost:3000";

const STRAVA_AUTH_URL = "https://www.strava.com/oauth/authorize";
const STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token";
const STRAVA_API = "https://www.strava.com/api/v3";

export function getStravaAuthorizeUrl(state?: string): string {
  if (!STRAVA_CLIENT_ID) throw new Error("STRAVA_CLIENT_ID is not set");
  const redirectUri = `${APP_URL.replace(/\/$/, "")}/api/fitness/strava/callback`;
  const params = new URLSearchParams({
    client_id: STRAVA_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    approval_prompt: "auto",
    scope: "read,activity:read_all",
    ...(state && { state }),
  });
  return `${STRAVA_AUTH_URL}?${params.toString()}`;
}

export interface StravaTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete?: { id: number; username?: string };
}

export async function exchangeStravaCode(code: string): Promise<StravaTokenResponse> {
  if (!STRAVA_CLIENT_ID || !STRAVA_CLIENT_SECRET) {
    throw new Error("Strava is not configured");
  }
  const redirectUri = `${APP_URL.replace(/\/$/, "")}/api/fitness/strava/callback`;
  const res = await fetch(STRAVA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Strava token exchange failed: ${err}`);
  }
  return res.json();
}

export async function refreshStravaToken(refreshToken: string): Promise<StravaTokenResponse> {
  if (!STRAVA_CLIENT_ID || !STRAVA_CLIENT_SECRET) {
    throw new Error("Strava is not configured");
  }
  const res = await fetch(STRAVA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Strava token refresh failed: ${err}`);
  }
  return res.json();
}

export interface StravaActivity {
  id: number;
  name: string;
  type: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  start_date: string;
  start_date_local: string;
  calories?: number;
  average_heartrate?: number;
  max_heartrate?: number;
  visibility?: string;
}

export async function getStravaActivities(
  accessToken: string,
  options?: { after?: number; perPage?: number; page?: number }
): Promise<StravaActivity[]> {
  const params = new URLSearchParams();
  if (options?.after) params.set("after", String(options.after));
  if (options?.perPage) params.set("per_page", String(Math.min(200, options.perPage)));
  if (options?.page) params.set("page", String(options.page));
  const url = `${STRAVA_API}/athlete/activities?${params.toString()}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error("Strava token expired");
    const err = await res.text();
    throw new Error(`Strava activities failed: ${err}`);
  }
  return res.json();
}

export function isStravaConfigured(): boolean {
  return !!(STRAVA_CLIENT_ID && STRAVA_CLIENT_SECRET);
}
