import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { publishSocial } from "@/lib/social-publish";
import { socialInput } from "@/lib/social-schedule-input";

export const maxDuration = 300;
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "SUPERADMIN"].includes(user.role)) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  const parsed = socialInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const result = await publishSocial({ userId: user.id, ...parsed.data });
  const failed = Object.keys(result.errors);
  if (failed.length === parsed.data.platforms.length) return NextResponse.json({ ...result, error: Object.values(result.errors).join(" · ") }, { status: 502 });
  return NextResponse.json({ ok: true, ...result });
}
