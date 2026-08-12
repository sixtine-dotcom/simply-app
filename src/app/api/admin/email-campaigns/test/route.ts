import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { getCurrentUser } from "@/lib/auth";
import { campaignHtml } from "@/lib/email-campaigns";
import { db } from "@/lib/db";
import { sendGoogleMail } from "@/lib/google-mail";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "SUPERADMIN"].includes(user.role)) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  const body = await request.json();
  const email = String(body.email || user.email).trim().toLowerCase();
  const key = process.env.RESEND_API_KEY;
  const googleMail = await db.integrationConnection.findUnique({ where: { userId_provider: { userId: user.id, provider: "google_mail" } } });
  if (googleMail) {
    try {
      await sendGoogleMail({ userId: user.id, to: email, subject: `[TEST] ${body.subject}`, html: campaignHtml(body.message || "", email, user.tenantId), fromEmail: googleMail.accountName || user.email });
      return NextResponse.json({ ok: true, provider: "google" });
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Google kon de testmail niet verzenden" }, { status: 502 });
    }
  }
  if (!key) return NextResponse.json({ error: "Koppel eerst Google e-mail" }, { status: 500 });
  const { error } = await new Resend(key).emails.send({ from: process.env.MARKETING_EMAIL_FROM || "Simply in Balance <sixtine@simplyinbalance.com>", reply_to: process.env.MARKETING_EMAIL_REPLY_TO || "sixtine@simplyinbalance.com", to: email, subject: `[TEST] ${body.subject}`, html: campaignHtml(body.message || "", email, user.tenantId) });
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  return NextResponse.json({ ok: true });
}
