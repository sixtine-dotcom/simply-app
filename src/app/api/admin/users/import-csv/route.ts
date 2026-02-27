import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, createAuditLog } from "@/lib/auth";
import { db } from "@/lib/db";

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
    if (!user || user.role !== "ADMIN") {
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
    const created: string[] = [];
    const skipped: string[] = [];
    for (const row of rows) {
      const existing = await db.user.findUnique({ where: { email: row.email } });
      if (existing) {
        skipped.push(row.email);
        continue;
      }
      const newUser = await db.user.create({
        data: {
          email: row.email,
          firstName: row.firstName || "Klant",
          lastName: row.lastName || "",
          role: "CLIENT",
        },
      });
      created.push(newUser.email);
    }
    await createAuditLog("users.import_csv", user.id, {
      created: created.length,
      skipped: skipped.length,
    });
    return NextResponse.json({
      success: true,
      created: created.length,
      skipped: skipped.length,
      createdEmails: created,
      skippedEmails: skipped,
    });
  } catch (error) {
    console.error("Import CSV error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan bij het importeren." },
      { status: 500 }
    );
  }
}
