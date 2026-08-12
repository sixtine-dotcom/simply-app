import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isValidUnsubscribe } from "@/lib/email-campaigns";

async function unsubscribe(request: NextRequest) {
  const email = (request.nextUrl.searchParams.get("email") || "").trim().toLowerCase();
  const tenantId = request.nextUrl.searchParams.get("tenant") || "global";
  const token = request.nextUrl.searchParams.get("token") || "";
  const storedTenantId = tenantId === "global" ? null : tenantId;
  if (!email || !isValidUnsubscribe(email, storedTenantId, token)) return NextResponse.json({ error: "Ongeldige afmeldlink" }, { status: 400 });
  if (storedTenantId) {
    await db.emailSuppression.upsert({ where: { tenantId_email: { tenantId: storedTenantId, email } }, create: { tenantId: storedTenantId, email }, update: { reason: "unsubscribed" } });
  } else {
    const existing = await db.emailSuppression.findFirst({ where: { tenantId: null, email } });
    if (existing) await db.emailSuppression.update({ where: { id: existing.id }, data: { reason: "unsubscribed" } });
    else await db.emailSuppression.create({ data: { tenantId: null, email } });
  }
  return new NextResponse("Je bent uitgeschreven voor marketingmails van Simply in Balance.", { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

export const GET = unsubscribe;
export const POST = unsubscribe;
