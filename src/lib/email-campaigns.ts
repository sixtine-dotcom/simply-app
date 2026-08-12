import crypto from "crypto";
import { Resend } from "resend";
import { db } from "@/lib/db";

const APP_URL = process.env.APP_URL || "http://localhost:3000";
const FROM = process.env.MARKETING_EMAIL_FROM || "Simply in Balance <sixtine@simplyinbalance.com>";
const REPLY_TO = process.env.MARKETING_EMAIL_REPLY_TO || "sixtine@simplyinbalance.com";

function signature(email: string, tenantId: string | null) {
  return crypto.createHmac("sha256", process.env.AUTH_SECRET || "simply-development-secret").update(`${tenantId || "global"}:${email.toLowerCase()}`).digest("base64url");
}

export function unsubscribeUrl(email: string, tenantId: string | null) {
  const params = new URLSearchParams({ email, token: signature(email, tenantId) });
  if (tenantId) params.set("tenant", tenantId);
  return `${APP_URL}/api/email/unsubscribe?${params}`;
}

export function isValidUnsubscribe(email: string, tenantId: string | null, token: string) {
  const expected = signature(email, tenantId);
  return token.length === expected.length && crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

export function campaignHtml(body: string, email: string, tenantId: string | null) {
  const safeBody = body.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
  const unsubscribe = unsubscribeUrl(email, tenantId);
  return `<!doctype html><html lang="nl"><body style="margin:0;background:#f5f5f5;font-family:Arial,sans-serif;color:#263229"><table width="100%" role="presentation"><tr><td align="center" style="padding:28px 12px"><table width="100%" role="presentation" style="max-width:600px;background:#fff;border:1px solid #e5e7eb;border-radius:18px"><tr><td style="padding:30px 36px 18px;text-align:center;font-family:Georgia,serif;font-size:30px;color:#274d2d">Simply in Balance</td></tr><tr><td style="padding:20px 36px 38px;font-size:15px;line-height:1.75">${safeBody}</td></tr><tr><td style="padding:20px 28px;text-align:center;border-top:1px solid #e5e7eb;font-size:11px;line-height:1.6;color:#6b7280">Je ontvangt deze e-mail omdat je toestemming gaf om nieuws van Simply in Balance te ontvangen.<br><a href="${unsubscribe}" style="color:#315c38">Uitschrijven</a></td></tr></table></td></tr></table></body></html>`;
}

export async function sendCampaignBatch(limit = 4) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) throw new Error("RESEND_API_KEY ontbreekt");
  const campaign = await db.emailCampaign.findFirst({ where: { status: { in: ["QUEUED", "SENDING"] }, recipients: { some: { status: "PENDING" } } }, orderBy: { createdAt: "asc" } });
  if (!campaign) return { sent: 0, failed: 0 };
  await db.emailCampaign.update({ where: { id: campaign.id }, data: { status: "SENDING", startedAt: campaign.startedAt || new Date() } });
  const recipients = await db.emailCampaignRecipient.findMany({ where: { campaignId: campaign.id, status: "PENDING" }, orderBy: { createdAt: "asc" }, take: Math.min(4, limit) });
  const resend = new Resend(resendKey);
  let sent = 0;
  let failed = 0;
  for (const recipient of recipients) {
    const suppressed = await db.emailSuppression.findFirst({ where: { email: recipient.email.toLowerCase(), OR: [{ tenantId: campaign.tenantId }, { tenantId: null }] } });
    if (suppressed) {
      await db.emailCampaignRecipient.update({ where: { id: recipient.id }, data: { status: "SKIPPED", error: "Uitgeschreven" } });
      continue;
    }
    const unsubscribe = unsubscribeUrl(recipient.email, campaign.tenantId);
    const { data, error } = await resend.emails.send({
      from: FROM,
      reply_to: REPLY_TO,
      to: recipient.email,
      subject: campaign.subject,
      html: campaignHtml(campaign.htmlBody, recipient.email, campaign.tenantId),
      headers: { "List-Unsubscribe": `<${unsubscribe}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
    });
    if (error) {
      failed += 1;
      await db.emailCampaignRecipient.update({ where: { id: recipient.id }, data: { status: "FAILED", error: error.message } });
      await db.emailCampaign.update({ where: { id: campaign.id }, data: { status: "PAUSED" } });
      break;
    } else {
      sent += 1;
      await db.emailCampaignRecipient.update({ where: { id: recipient.id }, data: { status: "SENT", externalId: data?.id, sentAt: new Date() } });
    }
  }
  const pending = await db.emailCampaignRecipient.count({ where: { campaignId: campaign.id, status: "PENDING" } });
  if (!pending && !failed) await db.emailCampaign.update({ where: { id: campaign.id }, data: { status: "COMPLETED", completedAt: new Date() } });
  return { sent, failed };
}
