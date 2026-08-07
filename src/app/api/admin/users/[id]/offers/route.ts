import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAuditLog, getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { assignOfferAccessToUser } from "@/lib/offer-access";

const assignUserOfferSchema = z.object({
  offerId: z.string().min(1, "Selecteer een offer"),
  startDate: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    if (!user || user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    const body = assignUserOfferSchema.parse(await request.json());

    const [targetUser, offer] = await Promise.all([
      db.user.findFirst({
        where: {
          id,
          deletedAt: null,
          ...(user.tenantId ? { tenantId: user.tenantId } : {}),
        },
        select: {
          id: true,
          email: true,
          role: true,
        },
      }),
      db.offer.findFirst({
        where: { id: body.offerId },
        select: {
          id: true,
          title: true,
        },
      }),
    ]);

    if (!targetUser) {
      return NextResponse.json({ error: "Gebruiker niet gevonden" }, { status: 404 });
    }

    if (!offer) {
      return NextResponse.json({ error: "Offer niet gevonden" }, { status: 404 });
    }

    const result = await assignOfferAccessToUser({
      offerId: offer.id,
      userId: targetUser.id,
      startDate:
        body.startDate && body.startDate.trim() ? new Date(body.startDate) : new Date(),
    });

    await createAuditLog(
      "offer.access_assigned",
      user.id,
      {
        offerId: offer.id,
        offerTitle: offer.title,
        targetUserId: targetUser.id,
        targetUserEmail: targetUser.email,
        createdAssignments: result.createdAssignments,
        createdEnrollments: result.createdEnrollments,
        skippedEnrollments: result.skippedEnrollments,
        matchedExistingAssignment: result.matchedExistingAssignment,
        source: "user_detail",
      },
      undefined,
      user.tenantId
    );

    return NextResponse.json({
      success: true,
      matchedExistingAssignment: result.matchedExistingAssignment,
      createdEnrollments: result.createdEnrollments,
      skippedEnrollments: result.skippedEnrollments,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }

    console.error("Assign user offer error:", error);
    return NextResponse.json({ error: "Er is iets misgegaan" }, { status: 500 });
  }
}
