import { NextResponse } from "next/server";
import { createAuditLog, getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { assignOfferAccessToUser } from "@/lib/offer-access";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; leadId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN")) {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    const { id: offerId, leadId } = await params;
    const lead = await db.offerLead.findFirst({
      where: {
        id: leadId,
        offerId,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead niet gevonden" }, { status: 404 });
    }

    const email = lead.email.toLowerCase().trim();
    const existingUser = await db.user.findUnique({
      where: { email },
      select: {
        id: true,
        tenantId: true,
      },
    });

    if (existingUser && user.tenantId && existingUser.tenantId && existingUser.tenantId !== user.tenantId) {
      return NextResponse.json(
        { error: "Dit email adres bestaat al onder een andere tenant." },
        { status: 400 }
      );
    }

    const targetUser =
      existingUser ||
      (await db.user.create({
        data: {
          tenantId: user.tenantId ?? null,
          email,
          firstName: lead.firstName.trim() || "Lid",
          lastName: lead.lastName?.trim() || "",
          role: "CLIENT",
        },
        select: {
          id: true,
        },
      }));

    const result = await assignOfferAccessToUser({
      offerId,
      userId: targetUser.id,
    });

    await db.offerLead.update({
      where: { id: lead.id },
      data: {
        status: "converted",
      },
    });

    await createAuditLog(
      "offer.lead_converted",
      user.id,
      {
        offerId,
        leadId: lead.id,
        email,
        createdEnrollments: result.createdEnrollments,
        skippedEnrollments: result.skippedEnrollments,
      },
      undefined,
      user.tenantId
    );

    return NextResponse.json({
      success: true,
      createdEnrollments: result.createdEnrollments,
      skippedEnrollments: result.skippedEnrollments,
      userId: targetUser.id,
    });
  } catch (error) {
    console.error("Convert offer lead error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Er is iets misgegaan" },
      { status: 500 }
    );
  }
}
