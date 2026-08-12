import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "SUPERADMIN"].includes(user.role)) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  const body = await request.json();
  if (body.testConfirmed !== true) return NextResponse.json({ error: "Stuur en controleer eerst een testmail" }, { status: 400 });
  if (body.consentConfirmed !== true) return NextResponse.json({ error: "Bevestig eerst de toestemming van de ontvangers" }, { status: 400 });
  const emails: string[] = Array.from(new Set<string>((Array.isArray(body.recipients) ? body.recipients : []).map((value: unknown) => String(value).trim().toLowerCase()).filter((value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))));
  if (!body.subject?.trim() || !body.message?.trim() || !emails.length) return NextResponse.json({ error: "Onderwerp, bericht en ontvangers zijn verplicht" }, { status: 400 });
  const campaign = await db.emailCampaign.create({
    data: {
      tenantId: user.tenantId,
      createdById: user.id,
      name: body.name?.trim() || body.subject.trim(),
      subject: body.subject.trim(),
      previewText: body.previewText?.trim() || null,
      htmlBody: body.message.trim(),
      status: "QUEUED",
      recipients: { create: emails.map((email: string) => ({ email })) },
    },
  });
  return NextResponse.json({ ok: true, id: campaign.id, recipients: emails.length });
}
