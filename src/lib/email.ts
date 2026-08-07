import { Resend } from "resend";
import { buildEventCalendar, getCalendarLinks } from "@/lib/event-calendar";

let resendClient: Resend | null = null;

function getResendClient() {
  if (resendClient) return resendClient;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  resendClient = new Resend(apiKey);
  return resendClient;
}

const FROM_EMAIL =
  process.env.EMAIL_FROM || "Simply in Balance <noreply@simplyinbalance.com>";
const APP_URL = process.env.APP_URL || "http://localhost:3000";
const EMAIL_BANNER_URL =
  process.env.EMAIL_BANNER_URL ||
  "https://pub-52165274dc54438e9e3aad168bb2fcf6.r2.dev/branding/email/simply-plant-banner.jpg";

function renderBrandedEmail({
  title,
  preheader,
  content,
}: {
  title: string;
  preheader: string;
  content: string;
}) {
  return `
    <!DOCTYPE html>
    <html lang="nl">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
      </head>
      <body style="margin: 0; padding: 0; background: #f3f5f0; color: #223025; font-family: Arial, Helvetica, sans-serif;">
        <div style="display: none; max-height: 0; overflow: hidden; opacity: 0;">${preheader}</div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: #f3f5f0;">
          <tr>
            <td align="center" style="padding: 28px 12px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background: #ffffff; border-radius: 22px; overflow: hidden; box-shadow: 0 12px 36px rgba(31, 57, 35, 0.10);">
                <tr>
                  <td align="center" style="padding: 28px 24px 22px; background: #ffffff;">
                    <p style="margin: 0; color: #274d2d; font-family: Georgia, 'Times New Roman', serif; font-size: 32px; line-height: 1.15; font-weight: 400;">Simply in Balance</p>
                    <p style="margin: 8px 0 0; color: #738276; font-size: 11px; line-height: 1.4; letter-spacing: 3px; text-transform: uppercase;">Jouw leeromgeving</p>
                  </td>
                </tr>
                <tr>
                  <td>
                    <img src="${EMAIL_BANNER_URL}" width="600" alt="Simply in Balance" style="display: block; width: 100%; max-width: 600px; height: auto; border: 0;">
                  </td>
                </tr>
                <tr>
                  <td style="padding: 34px 38px 38px;">
                    ${content}
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding: 22px 28px; background: #e9eee6; border-top: 1px solid #dce5d9;">
                    <p style="margin: 0; color: #647267; font-size: 12px; line-height: 1.6;">Simply in Balance · leeromgeving via simplyapp.be</p>
                    <p style="margin: 4px 0 0; color: #839087; font-size: 11px; line-height: 1.6;">Rust, ritme en resultaat op één plek.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

export async function sendMagicLinkEmail(
  email: string,
  token: string,
  next?: string,
  appUrl = APP_URL
) {
  const resend = getResendClient();
  if (!resend) return { success: false, error: "Missing RESEND_API_KEY" };

  const nextParam = next ? `&next=${encodeURIComponent(next)}` : "";
  const magicLink = `${appUrl}/verify?token=${token}${nextParam}`;

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "Jouw inloglink voor Simply in Balance",
      html: renderBrandedEmail({
        title: "Inloggen bij Simply in Balance",
        preheader: "Je veilige inloglink voor de Simply in Balance-leeromgeving staat klaar.",
        content: `
          <h1 style="margin: 0 0 14px; color: #223f27; font-family: Georgia, 'Times New Roman', serif; font-size: 27px; line-height: 1.25; font-weight: 400;">Welkom terug</h1>
          <p style="margin: 0 0 26px; color: #5f6d62; font-size: 15px; line-height: 1.7;">
            Klik op de knop hieronder om veilig in te loggen bij de leeromgeving van Simply in Balance. De link blijft 15 minuten geldig.
          </p>
          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td style="border-radius: 12px; background: #315c38;">
                <a href="${magicLink}" style="display: inline-block; padding: 14px 28px; color: #ffffff; font-size: 15px; font-weight: 700; line-height: 1.2; text-decoration: none;">Open mijn leeromgeving</a>
              </td>
            </tr>
          </table>
          <p style="margin: 26px 0 0; color: #8a958d; font-size: 12px; line-height: 1.6;">
            Werkt de knop niet? Kopieer dan deze link:<br>
            <a href="${magicLink}" style="color: #315c38; word-break: break-all;">${magicLink}</a>
          </p>
          <p style="margin: 24px 0 0; padding-top: 20px; border-top: 1px solid #e5eae3; color: #9aa39c; font-size: 11px; line-height: 1.6;">
            Heb je deze e-mail niet aangevraagd? Dan kun je hem gewoon negeren.
          </p>
        `,
      }),
    });

    if (error) {
      console.error("Failed to send magic link email:", error);
      return { success: false, error: error.message || "Failed to send email" };
    }
    return { success: true };
  } catch (error) {
    console.error("Failed to send magic link email:", error);
    return { success: false, error: "Failed to send email" };
  }
}

/** Send email with link to complete registration (account aanmaken via link in inbox) */
export async function sendRegistrationEmail(email: string, token: string) {
  const resend = getResendClient();
  if (!resend) return { success: false, error: "Missing RESEND_API_KEY" };

  const completeLink = `${APP_URL}/register/complete?token=${token}`;

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "Maak je Simply account aan",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Account aanmaken - Simply</title>
          </head>
          <body style="font-family: 'Montserrat', Arial, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="text-align: center; margin-bottom: 40px;">
              <h1 style="font-size: 32px; font-weight: 400; letter-spacing: 2px; color: #2D5A27; margin: 0;">SIMPLY</h1>
            </div>
            
            <div style="background: #f9f9f9; border-radius: 8px; padding: 32px; margin-bottom: 32px;">
              <h2 style="font-size: 20px; margin: 0 0 16px 0; color: #1a1a1a;">Maak je account aan</h2>
              <p style="margin: 0 0 24px 0; color: #6b7280;">
                Je hebt een account aangevraagd bij Simply. Klik op de knop hieronder om je naam in te vullen en je account te voltooien. Deze link is 7 dagen geldig.
              </p>
              
              <a href="${completeLink}" style="display: inline-block; background: #2D5A27; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 500;">
                Account voltooien
              </a>
              
              <p style="margin: 24px 0 0 0; font-size: 14px; color: #9ca3af;">
                Of kopieer deze link naar je browser:<br>
                <span style="color: #6b7280; word-break: break-all;">${completeLink}</span>
              </p>
            </div>
            
            <p style="font-size: 14px; color: #9ca3af; text-align: center;">
              Heb je geen account aangevraagd? Dan kun je dit bericht negeren.
            </p>
            
            <div style="text-align: center; margin-top: 40px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
              <p style="font-size: 12px; color: #9ca3af; margin: 0;">
                Simply in Balance · simplyinbalance.com
              </p>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error("Failed to send registration email:", error);
      return { success: false, error: error.message || "Failed to send email" };
    }
    return { success: true };
  } catch (error) {
    console.error("Failed to send registration email:", error);
    return { success: false, error: "Failed to send email" };
  }
}

export async function sendBillingReminderEmail(input: {
  email: string;
  firstName: string;
  tenantName: string;
  day: 1 | 4 | 7;
  portalUrl?: string;
}) {
  const resend = getResendClient();
  if (!resend) return { success: false, error: "Missing RESEND_API_KEY" };

  const subjects: Record<1 | 4 | 7, string> = {
    1: `Betaling mislukt voor ${input.tenantName}`,
    4: `Herinnering: openstaande betaling voor ${input.tenantName}`,
    7: `Laatste herinnering: voorkom schorsing van ${input.tenantName}`,
  };

  const bodyByDay: Record<1 | 4 | 7, string> = {
    1: "We konden je laatste platformbetaling niet verwerken. Werk je betaalmethode bij om onderbreking te voorkomen.",
    4: "Je betaling staat nog open. Werk je betaalmethode bij zodat je platform actief blijft.",
    7: "Je betaling staat nog steeds open. Zonder oplossing wordt je platform na 10 dagen automatisch geschorst.",
  };

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: input.email,
      subject: subjects[input.day],
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${subjects[input.day]}</title>
          </head>
          <body style="font-family: 'Montserrat', Arial, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="text-align: center; margin-bottom: 40px;">
              <h1 style="font-size: 32px; font-weight: 400; letter-spacing: 2px; color: #2D5A27; margin: 0;">SIMPLY</h1>
            </div>
            <div style="background: #f9f9f9; border-radius: 8px; padding: 32px; margin-bottom: 32px;">
              <h2 style="font-size: 20px; margin: 0 0 16px 0; color: #1a1a1a;">Hoi ${input.firstName},</h2>
              <p style="margin: 0 0 24px 0; color: #6b7280;">
                ${bodyByDay[input.day]}
              </p>
              <p style="margin: 0 0 24px 0; color: #6b7280;">
                Platform: <strong>${input.tenantName}</strong>
              </p>
              ${
                input.portalUrl
                  ? `<a href="${input.portalUrl}" style="display: inline-block; background: #2D5A27; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 500;">
                Betaalmethode bijwerken
              </a>`
                  : ""
              }
            </div>
            <p style="font-size: 14px; color: #9ca3af; text-align: center;">
              Log in op je admin billing-pagina als je hulp nodig hebt.
            </p>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error("Failed to send billing reminder email:", error);
      return { success: false, error: error.message || "Failed to send email" };
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to send billing reminder email:", error);
    return { success: false, error: "Failed to send email" };
  }
}

export async function sendBillingInvoicesEmail(input: {
  email: string;
  tenantName: string;
  invoiceCount: number;
  exportUrl: string;
}) {
  const resend = getResendClient();
  if (!resend) return { success: false, error: "Missing RESEND_API_KEY" };

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: input.email,
      subject: `Facturen voor ${input.tenantName}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Facturen voor ${input.tenantName}</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <h1 style="font-size: 24px; color: #2D5A27;">Facturen</h1>
            <p>Je vindt hieronder de export met ${input.invoiceCount} factuur/facturen voor <strong>${input.tenantName}</strong>.</p>
            <p>
              <a href="${input.exportUrl}" style="display: inline-block; background: #2D5A27; color: white; text-decoration: none; padding: 12px 22px; border-radius: 999px; font-weight: 600;">
                Facturen downloaden
              </a>
            </p>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error("Failed to send billing invoices email:", error);
      return { success: false, error: error.message || "Failed to send email" };
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to send billing invoices email:", error);
    return { success: false, error: "Failed to send email" };
  }
}

export async function sendOfferLeadNotificationEmail(input: {
  to: string;
  offerTitle: string;
  leadName: string;
  leadEmail: string;
  note?: string | null;
}) {
  const resend = getResendClient();
  if (!resend) return { success: false, error: "Missing RESEND_API_KEY" };

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: input.to,
      subject: `Nieuwe lead voor ${input.offerTitle}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Nieuwe offer lead</title>
          </head>
          <body style="font-family: 'Montserrat', Arial, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: #f9f9f9; border-radius: 8px; padding: 32px;">
              <h2 style="font-size: 20px; margin: 0 0 16px 0; color: #1a1a1a;">Nieuwe lead ontvangen</h2>
              <p style="margin: 0 0 16px 0; color: #6b7280;">
                <strong>Offer:</strong> ${input.offerTitle}
              </p>
              <p style="margin: 0 0 8px 0; color: #6b7280;">
                <strong>Naam:</strong> ${input.leadName}
              </p>
              <p style="margin: 0 0 8px 0; color: #6b7280;">
                <strong>Email:</strong> ${input.leadEmail}
              </p>
              ${
                input.note
                  ? `<p style="margin: 16px 0 0 0; color: #6b7280;"><strong>Bericht:</strong><br>${input.note}</p>`
                  : ""
              }
              <p style="margin: 24px 0 0 0; color: #6b7280;">
                Bekijk en beheer deze lead in de admin offers-pagina.
              </p>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error("Failed to send offer lead notification email:", error);
      return { success: false, error: error.message || "Failed to send email" };
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to send offer lead notification email:", error);
    return { success: false, error: "Failed to send email" };
  }
}

/** Weekly summary highlights type (matches lib/weekly-summary.ts) */
export interface WeeklySummaryHighlights {
  stepsTotal: number;
  stepsPreviousWeek: number;
  stepsDelta: number;
  weightCurrent: number | null;
  weightPrevious: number | null;
  weightDelta: number | null;
  workoutsCount: number;
  recipeTitles: string[];
  postsCount: number;
  commentsCount: number;
  likesReceived: number;
  lessonsCompleted: number;
}

export async function sendWeeklySummaryEmail(
  email: string,
  firstName: string,
  weekStart: Date,
  weekEnd: Date,
  highlights: WeeklySummaryHighlights
) {
  const resend = getResendClient();
  if (!resend) return { success: false, error: "Missing RESEND_API_KEY" };

  const weekRange = `${weekStart.toLocaleDateString("nl-NL", { day: "numeric", month: "short" })} – ${weekEnd.toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" })}`;
  const summaryUrl = `${APP_URL}/trackers/weekly-overview`;

  const bullets: string[] = [];
  if (highlights.stepsDelta > 0) bullets.push(`${highlights.stepsDelta.toLocaleString("nl-NL")} stappen meer dan vorige week`);
  if (highlights.weightDelta != null && highlights.weightDelta > 0) bullets.push(`${highlights.weightDelta} kg minder dan vorige week`);
  if (highlights.workoutsCount > 0) bullets.push(`${highlights.workoutsCount} workout(s) gelogd`);
  if (highlights.lessonsCompleted > 0) bullets.push(`${highlights.lessonsCompleted} les(sen) afgerond`);
  if (highlights.recipeTitles.length > 0) bullets.push(`${highlights.recipeTitles.length} recept(en) gepland: o.a. ${highlights.recipeTitles.slice(0, 3).join(", ")}`);
  if (highlights.postsCount > 0 || highlights.commentsCount > 0) bullets.push("Actief in de community met posts en reacties");
  if (bullets.length === 0) bullets.push("Bekijk je voortgang en deel je week op de app.");

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Je weekoverzicht ${weekRange} 🌿`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Je weekoverzicht - Simply</title>
          </head>
          <body style="font-family: 'Montserrat', Arial, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="text-align: center; margin-bottom: 40px;">
              <h1 style="font-size: 32px; font-weight: 400; letter-spacing: 2px; color: #2D5A27; margin: 0;">SIMPLY</h1>
            </div>
            <div style="background: #f9f9f9; border-radius: 8px; padding: 32px; margin-bottom: 32px;">
              <h2 style="font-size: 20px; margin: 0 0 16px 0; color: #1a1a1a;">Hoi ${firstName}, je weekoverzicht staat klaar</h2>
              <p style="margin: 0 0 16px 0; color: #6b7280;">Week ${weekRange}</p>
              <ul style="margin: 0 0 24px 0; padding-left: 20px; color: #374151;">
                ${bullets.map((b) => `<li style="margin-bottom: 8px;">${b}</li>`).join("")}
              </ul>
              <a href="${summaryUrl}" style="display: inline-block; background: #2D5A27; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 500;">Bekijk & deel je week</a>
            </div>
            <p style="font-size: 14px; color: #9ca3af; text-align: center;">Deel je voortgang op Instagram of TikTok via de app.</p>
            <div style="text-align: center; margin-top: 40px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
              <p style="font-size: 12px; color: #9ca3af; margin: 0;">Simply in Balance · simplyinbalance.com</p>
            </div>
          </body>
        </html>
      `,
    });
    if (error) {
      console.error("Failed to send weekly summary email:", error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (error) {
    console.error("Send weekly summary email error:", error);
    return { success: false, error: "Failed to send email" };
  }
}

/** Welkom na aankoop in Shopify: cursusnamen optioneel voor "Je hebt X gekocht" */
export async function sendWelcomeEmail(
  email: string,
  firstName: string,
  token: string,
  options?: { courseTitles?: string[]; next?: string; appUrl?: string }
) {
  const resend = getResendClient();
  if (!resend) return { success: false, error: "Missing RESEND_API_KEY" };

  const appUrl = options?.appUrl || APP_URL;
  const nextParam = options?.next ? `&next=${encodeURIComponent(options.next)}` : "";
  const magicLink = `${appUrl}/verify?token=${token}${nextParam}`;
  const courseTitles = options?.courseTitles?.filter(Boolean) ?? [];
  // next is only for magic-link flow, not for welcome options
  const isPurchaseEmail = courseTitles.length > 0;

  const subject = isPurchaseEmail
    ? `Je cursus staat klaar – log in om te starten 🌿`
    : "Welkom bij Simply! 🌿";

  const intro = isPurchaseEmail
    ? `Je hebt ${courseTitles.length === 1 ? courseTitles[0] : "een cursus"} gekocht. Je account in de leeromgeving is aangemaakt. Klik op de knop hieronder om je login te activeren en direct te starten.`
    : "Wat leuk dat je er bent! Je account is aangemaakt. Klik op de knop hieronder om je login te activeren en aan de slag te gaan.";

  const ctaLabel = isPurchaseEmail ? "Activeer login en start cursus" : "Activeer mijn account";

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject,
      html: renderBrandedEmail({
        title: isPurchaseEmail ? "Je cursus staat klaar" : "Welkom bij Simply in Balance",
        preheader: isPurchaseEmail
          ? "Je cursus en persoonlijke leeromgeving staan voor je klaar."
          : "Welkom bij Simply in Balance. Activeer je account en ontdek je leeromgeving.",
        content: `
          <h1 style="margin: 0 0 14px; color: #223f27; font-family: Georgia, 'Times New Roman', serif; font-size: 27px; line-height: 1.25; font-weight: 400;">Hoi ${firstName || "daar"} 🌿</h1>
          <p style="margin: 0 0 16px; color: #5f6d62; font-size: 15px; line-height: 1.7;">${intro}</p>
          ${courseTitles.length > 1 ? `<p style="margin: 0 0 20px; color: #5f6d62; font-size: 15px; line-height: 1.7;"><strong style="color: #315c38;">Jouw cursussen:</strong> ${courseTitles.join(", ")}</p>` : ""}
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-top: 26px;">
            <tr>
              <td style="border-radius: 12px; background: #315c38;">
                <a href="${magicLink}" style="display: inline-block; padding: 14px 28px; color: #ffffff; font-size: 15px; font-weight: 700; line-height: 1.2; text-decoration: none;">${ctaLabel}</a>
              </td>
            </tr>
          </table>
          ${!isPurchaseEmail ? `
            <div style="margin-top: 30px; padding: 22px; background: #f0f4ed; border-radius: 14px;">
              <p style="margin: 0 0 10px; color: #315c38; font-family: Georgia, 'Times New Roman', serif; font-size: 18px;">Dit vind je in jouw leeromgeving</p>
              <p style="margin: 0; color: #68756b; font-size: 13px; line-height: 1.8;">
                Cursussen en lessen · community · persoonlijke trackers · recepten en weekmenu’s · SIX, jouw persoonlijke assistent
              </p>
            </div>
          ` : ""}
          <p style="margin: 26px 0 0; padding-top: 20px; border-top: 1px solid #e5eae3; color: #8a958d; font-size: 12px; line-height: 1.6;">
            Vragen? Antwoord gerust op deze e-mail of stuur ons een bericht via het platform.
          </p>
        `,
      }),
    });

    if (error) {
      console.error("Failed to send welcome email:", error);
      return { success: false, error: error.message || "Failed to send email" };
    }
    return { success: true };
  } catch (error) {
    console.error("Failed to send welcome email:", error);
    return { success: false, error: "Failed to send email" };
  }
}

/** Bestaande klant heeft nieuwe cursus gekocht in Shopify: stuur magic link om in te loggen en cursus te zien */
export async function sendCourseAccessEmail(
  email: string,
  firstName: string,
  token: string,
  courseTitles: string[]
) {
  const resend = getResendClient();
  if (!resend) return { success: false, error: "Missing RESEND_API_KEY" };

  const magicLink = `${APP_URL}/verify?token=${token}`;
  const titles = courseTitles.filter(Boolean);
  if (titles.length === 0) return { success: true };

  const subject = titles.length === 1
    ? `Je hebt toegang tot ${titles[0]} 🌿`
    : "Je hebt toegang tot nieuwe cursussen 🌿";

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Nieuwe cursustoegang</title>
          </head>
          <body style="font-family: 'Montserrat', Arial, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="text-align: center; margin-bottom: 40px;">
              <h1 style="font-size: 32px; font-weight: 400; letter-spacing: 2px; color: #2D5A27; margin: 0;">SIMPLY</h1>
            </div>
            <div style="background: #f9f9f9; border-radius: 8px; padding: 32px; margin-bottom: 32px;">
              <h2 style="font-size: 20px; margin: 0 0 16px 0; color: #1a1a1a;">Hoi ${firstName}, je hebt nieuwe toegang</h2>
              <p style="margin: 0 0 16px 0; color: #6b7280;">
                ${titles.length === 1 ? `Je kunt nu starten met: <strong>${titles[0]}</strong>.` : `Je hebt toegang gekregen tot: ${titles.join(", ")}.`}
              </p>
              <p style="margin: 0 0 24px 0; color: #6b7280;">Klik hieronder om je login te activeren en te starten.</p>
              <a href="${magicLink}" style="display: inline-block; background: #2D5A27; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 500;">Activeer login en start</a>
            </div>
            <div style="background: #f0f5ef; border-radius: 8px; padding: 24px; margin-bottom: 32px;">
              <h3 style="font-size: 16px; margin: 0 0 12px 0; color: #2D5A27;">📱 Simply op je telefoon</h3>
              <p style="margin: 0; color: #6b7280; font-size: 14px;">Open <a href="${APP_URL}" style="color: #2D5A27;">${APP_URL.replace(/^https?:\/\//, "")}</a> op je telefoon. Voeg toe aan beginscherm voor een app-ervaring (Safari → Deel → Zet op beginscherm / Chrome → Toevoegen aan startscherm).</p>
            </div>
            <div style="text-align: center; margin-top: 40px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
              <p style="font-size: 12px; color: #9ca3af; margin: 0;">Simply in Balance · simplyinbalance.com</p>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error("Failed to send course access email:", error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (error) {
    console.error("Send course access email error:", error);
    return { success: false, error: "Failed to send email" };
  }
}

export async function sendRequiredFormReminderEmail(input: {
  email: string;
  firstName: string;
  formTitle: string;
  formUrl: string;
  dueAt?: Date | null;
}) {
  const resend = getResendClient();
  if (!resend) return { success: false, error: "Missing RESEND_API_KEY" };

  const dueText = input.dueAt
    ? `Vul het formulier bij voorkeur in voor ${new Intl.DateTimeFormat("nl-BE", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }).format(input.dueAt)}.`
    : "Vul het formulier zo snel mogelijk in zodat je intake of onboarding volledig is.";

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: input.email,
      subject: `Herinnering: formulier invullen voor ${input.formTitle}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Formulier herinnering</title>
          </head>
          <body style="font-family: 'Montserrat', Arial, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="text-align: center; margin-bottom: 40px;">
              <h1 style="font-size: 32px; font-weight: 400; letter-spacing: 2px; color: #2D5A27; margin: 0;">SIMPLY APP</h1>
            </div>
            <div style="background: #f9f9f9; border-radius: 8px; padding: 32px; margin-bottom: 32px;">
              <h2 style="font-size: 20px; margin: 0 0 16px 0; color: #1a1a1a;">Hoi ${input.firstName || "daar"},</h2>
              <p style="margin: 0 0 16px 0; color: #6b7280;">
                Je hebt nog een open verplicht formulier: <strong>${input.formTitle}</strong>.
              </p>
              <p style="margin: 0 0 24px 0; color: #6b7280;">
                ${dueText}
              </p>
              <a href="${input.formUrl}" style="display: inline-block; background: #2D5A27; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 500;">
                Formulier openen
              </a>
            </div>
            <p style="font-size: 14px; color: #9ca3af; text-align: center;">
              Log in op je platform als je hulp nodig hebt of vragen hebt over dit formulier.
            </p>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error("Failed to send required form reminder email:", error);
      return { success: false, error: error.message || "Failed to send email" };
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to send required form reminder email:", error);
    return { success: false, error: "Failed to send email" };
  }
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  from?: string;
}) {
  const resend = getResendClient();
  if (!resend) return { success: false, error: "Missing RESEND_API_KEY" };

  try {
    const { error } = await resend.emails.send({
      from: params.from || FROM_EMAIL,
      to: params.to,
      subject: params.subject,
      html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">${params.html}</body></html>`,
    });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    console.error("sendEmail error:", err);
    return { success: false, error: "Failed to send" };
  }
}

function escapeEventEmailText(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function sendEventRegistrationEmail(input: {
  email: string;
  firstName: string;
  title: string;
  description?: string | null;
  startsAt: Date;
  duration: number;
  eventType: string;
  location?: string | null;
  onlineUrl?: string | null;
  bannerUrl?: string | null;
  publicUrl: string;
}) {
  const resend = getResendClient();
  if (!resend) return { success: false, error: "Missing RESEND_API_KEY" };

  const title = escapeEventEmailText(input.title);
  const firstName = escapeEventEmailText(input.firstName);
  const location = input.location ? escapeEventEmailText(input.location) : "Locatie volgt";
  const detailsUrl = input.eventType === "physical"
    ? input.location
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(input.location)}`
      : input.publicUrl
    : input.onlineUrl || input.publicUrl;
  const routeButtons = input.eventType === "physical" && input.location ? `
    <p style="margin:22px 0 10px;color:#34453a;font-size:13px;font-weight:700;">Kies je navigatie</p>
    <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(input.location)}" style="display:inline-block;margin:0 6px 6px 0;padding:10px 14px;border:1px solid #dce5d9;border-radius:9px;color:#315c38;font-size:12px;font-weight:700;text-decoration:none;">Google Maps</a>
    <a href="https://waze.com/ul?q=${encodeURIComponent(input.location)}&navigate=yes" style="display:inline-block;margin:0 6px 6px 0;padding:10px 14px;border:1px solid #dce5d9;border-radius:9px;color:#315c38;font-size:12px;font-weight:700;text-decoration:none;">Waze</a>
    <a href="https://maps.apple.com/?q=${encodeURIComponent(input.location)}" style="display:inline-block;margin:0 6px 6px 0;padding:10px 14px;border:1px solid #dce5d9;border-radius:9px;color:#315c38;font-size:12px;font-weight:700;text-decoration:none;">Apple Maps</a>
  ` : "";
  const date = input.startsAt.toLocaleDateString("nl-BE", {
    weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Brussels",
  });
  const time = input.startsAt.toLocaleTimeString("nl-BE", {
    hour: "2-digit", minute: "2-digit", timeZone: "Europe/Brussels",
  });
  const bannerUrl = input.bannerUrl
    ? input.bannerUrl.startsWith("http") ? input.bannerUrl : `${APP_URL}${input.bannerUrl}`
    : EMAIL_BANNER_URL;
  const calendarLinks = getCalendarLinks(input);
  const calendarFile = buildEventCalendar({
    id: `${input.title}-${input.startsAt.getTime()}`,
    ...input,
  });

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: input.email,
      subject: `Je inschrijving voor ${input.title}`,
      attachments: [{ content: Buffer.from(calendarFile).toString("base64"), filename: "simply-event.ics" }],
      html: renderBrandedEmail({
        title: `Ingeschreven voor ${title}`,
        preheader: `Alle praktische informatie voor ${title}.`,
        content: `
          <img src="${bannerUrl}" alt="${title}" style="display:block;width:100%;max-height:280px;object-fit:cover;border-radius:14px;margin:0 0 26px;">
          <p style="margin:0 0 8px;color:#315c38;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Inschrijving bevestigd</p>
          <h1 style="margin:0 0 14px;color:#223f27;font-family:Georgia,'Times New Roman',serif;font-size:27px;line-height:1.25;font-weight:400;">${title}</h1>
          <p style="margin:0 0 22px;color:#5f6d62;font-size:15px;line-height:1.7;">Dag ${firstName}, je staat op de gastenlijst. Hieronder vind je alle praktische informatie.</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 24px;background:#f4f7f2;border-radius:12px;">
            <tr><td style="padding:18px;color:#34453a;font-size:14px;line-height:1.9;">
              <strong>Datum:</strong> ${date}<br>
              <strong>Uur:</strong> ${time}<br>
              <strong>Duur:</strong> ${input.duration} minuten<br>
              <strong>Type:</strong> ${input.eventType === "physical" ? "Fysiek event" : "Online event"}<br>
              ${input.eventType === "physical" ? `<strong>Locatie:</strong> ${location}` : ""}
            </td></tr>
          </table>
          ${input.description ? `<p style="margin:0 0 24px;color:#5f6d62;font-size:14px;line-height:1.7;white-space:pre-line;">${escapeEventEmailText(input.description)}</p>` : ""}
          <a href="${detailsUrl}" style="display:inline-block;padding:14px 24px;border-radius:12px;background:#315c38;color:#fff;font-size:14px;font-weight:700;text-decoration:none;">${input.eventType === "physical" ? "Bekijk de locatie" : "Open de online link"}</a>
          ${routeButtons}
          <p style="margin:26px 0 10px;color:#34453a;font-size:13px;font-weight:700;">Zet het event in je agenda</p>
          <a href="${calendarLinks.outlook}" style="display:inline-block;margin:0 6px 6px 0;padding:10px 14px;border:1px solid #dce5d9;border-radius:9px;color:#315c38;font-size:12px;font-weight:700;text-decoration:none;">Outlook</a>
          <a href="${calendarLinks.google}" style="display:inline-block;margin:0 6px 6px 0;padding:10px 14px;border:1px solid #dce5d9;border-radius:9px;color:#315c38;font-size:12px;font-weight:700;text-decoration:none;">Google Agenda / Android</a>
          <p style="margin:22px 0 0;color:#8a958d;font-size:12px;line-height:1.6;">Alle eventdetails vind je ook op <a href="${input.publicUrl}" style="color:#315c38;">de eventpagina</a>.</p>
        `,
      }),
    });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error) {
    console.error("Failed to send event registration email:", error);
    return { success: false, error: "Failed to send email" };
  }
}
