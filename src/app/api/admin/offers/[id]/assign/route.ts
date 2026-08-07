import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAuditLog, getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { assignOfferAccessToUser } from "@/lib/offer-access";

const assignOfferSchema = z.object({
  emails: z.array(z.string().email()).min(1, "Voeg minstens 1 email toe"),
  startDate: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN")) {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    const body = assignOfferSchema.parse(await request.json());
    const offer = await db.offer.findUnique({ where: { id } });

    if (!offer) {
      return NextResponse.json({ error: "Offer niet gevonden" }, { status: 404 });
    }

    const startDate =
      body.startDate && body.startDate.trim() ? new Date(body.startDate) : new Date();

    const users = await db.user.findMany({
      where: {
        email: {
          in: body.emails.map((email) => email.toLowerCase().trim()),
        },
        ...(user.tenantId ? { tenantId: user.tenantId } : {}),
        deletedAt: null,
      },
      select: {
        id: true,
        email: true,
      },
    });

    if (users.length === 0) {
      return NextResponse.json(
        { error: "Geen bestaande gebruikers gevonden voor deze emails." },
        { status: 400 }
      );
    }

    let created = 0;
    let skipped = 0;
    let courseCount = 0;

    for (const userRecord of users) {
      const result = await assignOfferAccessToUser({
        offerId: offer.id,
        userId: userRecord.id,
        startDate,
      });
      created += result.createdEnrollments;
      skipped += result.skippedEnrollments;
      courseCount = result.offer.courses.length;
    }

    await createAuditLog(
      "offer.access_assigned",
      user.id,
      {
        offerId: offer.id,
        emails: body.emails,
        created,
        skipped,
        courseCount,
      },
      undefined,
      user.tenantId
    );

    return NextResponse.json({
      success: true,
      created,
      skipped,
      matchedUsers: users.length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Assign offer access error:", error);
    return NextResponse.json({ error: "Er is iets misgegaan" }, { status: 500 });
  }
}
