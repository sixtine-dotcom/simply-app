import crypto from "crypto";
import { Resend } from "resend";
import { db } from "@/lib/db";
import { sendGoogleMail } from "@/lib/google-mail";

const APP_URL = process.env.APP_URL || "http://localhost:3000";
const FROM = process.env.MARKETING_EMAIL_FROM || "Simply in Balance <sixtine@simplyinbalance.com>";
const REPLY_TO = process.env.MARKETING_EMAIL_REPLY_TO || "sixtine@simplyinbalance.com";
const EMAIL_BANNER_URL = process.env.EMAIL_BANNER_URL || "https://pub-52165274dc54438e9e3aad168bb2fcf6.r2.dev/branding/email/simply-plant-banner.jpg";
const EMAIL_WORDMARK_URL = process.env.EMAIL_WORDMARK_URL || `${APP_URL}/email/simply-wordmark.png`;

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
  const escaped = body.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const safeBody = escaped
    .replace(/^### (.+)$/gm, '<h2 style="margin:30px 0 12px;font-family:\'The Seasons\',Georgia,serif;font-size:22px;line-height:1.3;font-weight:600;color:#274d2d">$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/^- (.+)$/gm, '<div style="margin:0 0 8px 18px">• $1</div>')
    .split(/\n{2,}/)
    .map((block) => block.startsWith("<h2") || block.startsWith("<div") ? block.replace(/\n/g, "") : `<p style="margin:0 0 18px">${block.replace(/\n/g, "<br>")}</p>`)
    .join("");
  const unsubscribe = unsubscribeUrl(email, tenantId);
  return `<!doctype html><html lang="nl"><body style="margin:0;background:#ffffff;font-family:'CMU Serif','Computer Modern',Georgia,serif;color:#263229"><table width="100%" role="presentation"><tr><td align="center"><table width="100%" role="presentation" style="max-width:760px;background:#fff"><tr><td><img src="${EMAIL_BANNER_URL}" width="760" alt="Simply in Balance" style="display:block;width:100%;max-width:760px;height:auto;border:0"></td></tr><tr><td align="center" style="padding:24px 40px 6px"><img src="${EMAIL_WORDMARK_URL}" width="500" alt="Simply in Balance" style="display:block;width:100%;max-width:500px;height:auto;border:0"></td></tr><tr><td style="padding:28px 48px 38px;font-family:'CMU Serif','Computer Modern',Georgia,serif;font-size:16px;line-height:1.7">${safeBody}</td></tr><tr><td style="padding:20px 28px;text-align:center;background:#f4f6f1;font-family:Arial,sans-serif;font-size:11px;line-height:1.6;color:#6b7280">Je ontvangt deze e-mail omdat je toestemming gaf om nieuws van Simply in Balance te ontvangen.<br><a href="${unsubscribe}" style="color:#315c38">Uitschrijven</a></td></tr></table></td></tr></table></body></html>`;
}

export async function sendCampaignBatch(limit = 4) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) throw new Error("RESEND_API_KEY ontbreekt");
  const campaign = await db.emailCampaign.findFirst({ where: { status: { in: ["QUEUED", "SENDING"] }, recipients: { some: { status: "PENDING" } } }, orderBy: { createdAt: "asc" } });
  if (!campaign) return { sent: 0, failed: 0 };
  await db.emailCampaign.update({ where: { id: campaign.id }, data: { status: "SENDING", startedAt: campaign.startedAt || new Date() } });
  const recipients = await db.emailCampaignRecipient.findMany({ where: { campaignId: campaign.id, status: "PENDING" }, orderBy: { createdAt: "asc" }, take: Math.min(4, limit) });
  const resend = new Resend(resendKey);
  const googleMail = await db.integrationConnection.findUnique({ where: { userId_provider: { userId: campaign.createdById, provider: "google_mail" } } });
  let sent = 0;
  let failed = 0;
  for (const recipient of recipients) {
    const suppressed = await db.emailSuppression.findFirst({ where: { email: recipient.email.toLowerCase(), OR: [{ tenantId: campaign.tenantId }, { tenantId: null }] } });
    if (suppressed) {
      await db.emailCampaignRecipient.update({ where: { id: recipient.id }, data: { status: "SKIPPED", error: "Uitgeschreven" } });
      continue;
    }
    const unsubscribe = unsubscribeUrl(recipient.email, campaign.tenantId);
    let data: { id?: string | null } | null = null;
    let error: { message: string } | null = null;
    if (googleMail) {
      try {
        data = await sendGoogleMail({ userId: campaign.createdById, to: recipient.email, subject: campaign.subject, html: campaignHtml(campaign.htmlBody, recipient.email, campaign.tenantId), fromEmail: googleMail.accountName || REPLY_TO });
      } catch (sendError) {
        error = { message: sendError instanceof Error ? sendError.message : "Google kon de mail niet verzenden" };
      }
    } else {
      const result = await resend.emails.send({
        from: FROM,
        reply_to: REPLY_TO,
        to: recipient.email,
        subject: campaign.subject,
        html: campaignHtml(campaign.htmlBody, recipient.email, campaign.tenantId),
        headers: { "List-Unsubscribe": `<${unsubscribe}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
      });
      data = result.data;
      error = result.error;
    }
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
