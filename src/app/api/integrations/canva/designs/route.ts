import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getValidCanvaToken } from "@/lib/content-integrations";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "SUPERADMIN"].includes(user.role)) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  const token = await getValidCanvaToken(user.id);
  if (!token) return NextResponse.json({ error: "Koppel eerst Canva", needsConnection: true }, { status: 409 });
  const url = new URL("https://api.canva.com/rest/v1/designs");
  url.searchParams.set("sort_by", "modified_descending");
  url.searchParams.set("limit", "50");
  const query = request.nextUrl.searchParams.get("q")?.trim();
  if (query) url.searchParams.set("query", query);
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) return NextResponse.json({ error: "Kon Canva-designs niet ophalen", details: await response.text() }, { status: 502 });
  return NextResponse.json(await response.json());
}
