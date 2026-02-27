import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.EMAIL_FROM || "Simply <noreply@simplyinbalance.com>";
const APP_URL = process.env.APP_URL || "http://localhost:3000";

export async function sendMagicLinkEmail(email: string, token: string, next?: string) {
  const nextParam = next ? `&next=${encodeURIComponent(next)}` : "";
  const magicLink = `${APP_URL}/verify?token=${token}${nextParam}`;

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "Inloggen bij Simply",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Inloggen bij Simply</title>
          </head>
          <body style="font-family: 'Montserrat', Arial, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="text-align: center; margin-bottom: 40px;">
              <h1 style="font-size: 32px; font-weight: 400; letter-spacing: 2px; color: #2D5A27; margin: 0;">SIMPLY</h1>
            </div>
            
            <div style="background: #f9f9f9; border-radius: 8px; padding: 32px; margin-bottom: 32px;">
              <h2 style="font-size: 20px; margin: 0 0 16px 0; color: #1a1a1a;">Welkom terug!</h2>
              <p style="margin: 0 0 24px 0; color: #6b7280;">
                Klik op de knop hieronder om in te loggen bij Simply. Deze link is 15 minuten geldig.
              </p>
              
              <a href="${magicLink}" style="display: inline-block; background: #2D5A27; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 500;">
                Inloggen
              </a>
              
              <p style="margin: 24px 0 0 0; font-size: 14px; color: #9ca3af;">
                Of kopieer deze link naar je browser:<br>
                <span style="color: #6b7280; word-break: break-all;">${magicLink}</span>
              </p>
            </div>
            
            <p style="font-size: 14px; color: #9ca3af; text-align: center;">
              Heb je deze email niet aangevraagd? Dan kun je dit bericht negeren.
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
  options?: { courseTitles?: string[]; next?: string }
) {
  const nextParam = options?.next ? `&next=${encodeURIComponent(options.next)}` : "";
  const magicLink = `${APP_URL}/verify?token=${token}${nextParam}`;
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
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${isPurchaseEmail ? "Je cursus staat klaar" : "Welkom bij Simply"}</title>
          </head>
          <body style="font-family: 'Montserrat', Arial, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="text-align: center; margin-bottom: 40px;">
              <h1 style="font-size: 32px; font-weight: 400; letter-spacing: 2px; color: #2D5A27; margin: 0;">SIMPLY</h1>
            </div>
            <div style="background: #f9f9f9; border-radius: 8px; padding: 32px; margin-bottom: 32px;">
              <h2 style="font-size: 24px; margin: 0 0 16px 0; color: #1a1a1a;">Hoi ${firstName}! 🌿</h2>
              <p style="margin: 0 0 16px 0; color: #6b7280;">${intro}</p>
              ${courseTitles.length > 1 ? `<p style="margin: 0 0 24px 0; color: #6b7280;">Toegang tot: ${courseTitles.join(", ")}</p>` : ""}
              <p style="margin: 0 0 24px 0; color: #6b7280;">Klik op de knop hieronder om je account te activeren en in te loggen.</p>
              <a href="${magicLink}" style="display: inline-block; background: #2D5A27; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 500;">${ctaLabel}</a>
            </div>
            <div style="background: #f0f5ef; border-radius: 8px; padding: 24px; margin-bottom: 32px;">
              <h3 style="font-size: 16px; margin: 0 0 12px 0; color: #2D5A27;">📱 Simply op je telefoon</h3>
              <p style="margin: 0 0 12px 0; color: #6b7280; font-size: 14px;">Voeg Simply toe aan je beginscherm voor een app-ervaring:</p>
              <p style="margin: 0; color: #6b7280; font-size: 14px;"><strong>iPhone:</strong> Open <a href="${APP_URL}" style="color: #2D5A27;">${APP_URL.replace(/^https?:\/\//, "")}</a> in Safari → tik op Deel (vierkant met pijl) → «Zet op beginscherm»</p>
              <p style="margin: 8px 0 0 0; color: #6b7280; font-size: 14px;"><strong>Android:</strong> Open de link in Chrome → menu (⋮) → «Toevoegen aan startscherm»</p>
            </div>
            ${!isPurchaseEmail ? `
            <div style="background: #f0f5ef; border-radius: 8px; padding: 24px; margin-bottom: 32px;">
              <h3 style="font-size: 16px; margin: 0 0 12px 0; color: #2D5A27;">Wat kun je verwachten?</h3>
              <ul style="margin: 0; padding-left: 20px; color: #6b7280;">
                <li>Toegang tot jouw cursussen en lessen</li>
                <li>Community met andere deelnemers</li>
                <li>Persoonlijke trackers voor voeding en progressie</li>
                <li>Recepten en weekmenu's</li>
                <li>SIX AI - jouw persoonlijke assistent</li>
              </ul>
            </div>
            ` : ""}
            <p style="font-size: 14px; color: #9ca3af; text-align: center;">Vragen? Stuur ons een bericht via het platform of reply op deze email.</p>
            <div style="text-align: center; margin-top: 40px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
              <p style="font-size: 12px; color: #9ca3af; margin: 0;">Simply in Balance · simplyinbalance.com</p>
            </div>
          </body>
        </html>
      `,
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
