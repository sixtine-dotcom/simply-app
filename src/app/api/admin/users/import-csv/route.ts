import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, createAuditLog, createRegistrationToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendRegistrationEmail } from "@/lib/email";

function parseCSV(text: string): { email: string; firstName: string; lastName: string }[] {
  const lines = text.trim().split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];
  const header = lines[0].toLowerCase();
  const sep = header.includes(";") ? ";" : ",";
  const cols = lines[0].split(sep).map((c) => c.trim().toLowerCase());
  const emailIdx = cols.findIndex((c) => c === "email" || c === "e-mail");
  const firstIdx = cols.findIndex((c) => c === "voornaam" || c === "firstName" || c === "first");
  const lastIdx = cols.findIndex((c) => c === "achternaam" || c === "lastName" || c === "last");
  if (emailIdx === -1) return [];
  const rows: { email: string; firstName: string; lastName: string }[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(sep).map((v) => v.trim().replace(/^"|"$/g, ""));
    const email = (values[emailIdx] || "").toLowerCase().trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) continue;
    rows.push({
      email,
      firstName: firstIdx >= 0 ? (values[firstIdx] || "").trim() : "",
      lastName: lastIdx >= 0 ? (values[lastIdx] || "").trim() : "",
    });
  }
  return rows;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }
    const body = await request.json();
    const csv = typeof body.csv === "string" ? body.csv : "";
    const rows = parseCSV(csv);
    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Geen geldige rijen. CSV moet een header hebben met o.a. 'email', en optioneel 'voornaam'/'achternaam'." },
        { status: 400 }
      );
    }
    const appUrl = process.env.APP_URL || "http://localhost:3000";
    const created: string[] = [];
    const skipped: string[] = [];
    const invited: string[] = [];
    const inviteFailures: string[] = [];
    const devLinks: { email: string; url: string }[] = [];
    for (const row of rows) {
      const existing = await db.user.findUnique({ where: { email: row.email } });
      if (existing) {
        skipped.push(row.email);
        continue;
      }
      const newUser = await db.user.create({
        data: {
          tenantId: user.tenantId ?? null,
          email: row.email,
          firstName: row.firstName || "Klant",
          lastName: row.lastName || "",
          role: "CLIENT",
        },
      });

      const registrationToken = await createRegistrationToken(newUser.email, {
        accountType: "client",
        source: "admin_user_csv_import",
      });
      const registrationLink = `${appUrl}/register/complete?token=${registrationToken}`;

      let inviteSent = false;
      try {
        const emailResult = await sendRegistrationEmail(newUser.email, registrationToken);
        inviteSent = emailResult.success;
      } catch (error) {
        console.error("CSV import invite email error:", error);
      }

      created.push(newUser.email);
      if (inviteSent) {
        invited.push(newUser.email);
      } else {
        inviteFailures.push(newUser.email);
      }
      if (process.env.NODE_ENV === "development") {
        devLinks.push({ email: newUser.email, url: registrationLink });
      }
    }
    await createAuditLog("users.import_csv", user.id, {
      created: created.length,
      skipped: skipped.length,
      invited: invited.length,
      inviteFailures: inviteFailures.length,
    }, undefined, user.tenantId);
    return NextResponse.json({
      success: true,
      created: created.length,
      skipped: skipped.length,
      invited: invited.length,
      inviteFailures: inviteFailures.length,
      createdEmails: created,
      skippedEmails: skipped,
      inviteFailureEmails: inviteFailures,
      devRegistrationLinks:
        process.env.NODE_ENV === "development" ? devLinks : undefined,
    });
  } catch (error) {
    console.error("Import CSV error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan bij het importeren." },
      { status: 500 }
    );
  }
}
