import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { canUserAccessSpace } from "@/lib/community";
import { getMentionableUsers } from "@/lib/community-mentions";

export async function GET(request: NextRequest, { params }: { params: Promise<{ spaceId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const { spaceId } = await params;
  if (!(await canUserAccessSpace(user.id, spaceId))) {
    return NextResponse.json({ error: "Geen toegang tot dit kanaal" }, { status: 403 });
  }

  const query = request.nextUrl.searchParams.get("q") || "";
  const members = await getMentionableUsers(spaceId, user.tenantId, query, { id: user.id, role: user.role });
  return NextResponse.json(members, { headers: { "Cache-Control": "private, no-store" } });
}
