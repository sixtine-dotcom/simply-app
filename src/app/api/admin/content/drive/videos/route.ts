import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getValidAccessToken } from "@/lib/calendar-sync";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN")) {
    return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  }

  const connection = await db.calendarConnection.findFirst({
    where: { userId: user.id, provider: "google", syncEnabled: true },
  });
  if (!connection) {
    return NextResponse.json({ error: "Verbind eerst je Google Drive.", needsConnection: true }, { status: 409 });
  }

  try {
    const accessToken = await getValidAccessToken(connection);
    const search = request.nextUrl.searchParams.get("q")?.trim();
    const query = [
      "mimeType contains 'video/'",
      "trashed = false",
      search ? `name contains '${search.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'` : null,
    ].filter(Boolean).join(" and ");
    const url = new URL("https://www.googleapis.com/drive/v3/files");
    url.searchParams.set("q", query);
    url.searchParams.set("pageSize", "100");
    url.searchParams.set("orderBy", "modifiedTime desc");
    url.searchParams.set("fields", "files(id,name,mimeType,modifiedTime,size,webViewLink,thumbnailLink,parents)");

    const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!response.ok) {
      const details = await response.text();
      const reconnect = response.status === 401 || response.status === 403;
      return NextResponse.json(
        { error: reconnect ? "Verbind Google Drive opnieuw om bestaande video's te bekijken." : "Kon Drive-video's niet ophalen.", reconnect, details },
        { status: reconnect ? 409 : 502 }
      );
    }

    const data = await response.json();
    return NextResponse.json({ videos: data.files || [] });
  } catch (error) {
    console.error("Google Drive content videos error:", error);
    return NextResponse.json({ error: "Kon Drive-video's niet ophalen." }, { status: 500 });
  }
}
