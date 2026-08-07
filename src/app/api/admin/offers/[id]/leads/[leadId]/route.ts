import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAuditLog, getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

const updateLeadSchema = z.object({
  status: z.enum(["new", "contacted", "converted"]),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; leadId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN")) {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    const { id: offerId, leadId } = await params;
    const body = updateLeadSchema.parse(await request.json());

    const lead = await db.offerLead.findFirst({
      where: {
        id: leadId,
        offerId,
      },
      select: {
        id: true,
        offerId: true,
        email: true,
        status: true,
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead niet gevonden" }, { status: 404 });
    }

    const updatedLead = await db.offerLead.update({
      where: { id: lead.id },
      data: {
        status: body.status,
      },
    });

    await createAuditLog(
      "offer.lead_status_updated",
      user.id,
      {
        offerId,
        leadId: lead.id,
        email: lead.email,
        previousStatus: lead.status,
        nextStatus: body.status,
      },
      undefined,
      user.tenantId
    );

    return NextResponse.json({ lead: updatedLead });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Update offer lead error:", error);
    return NextResponse.json({ error: "Er is iets misgegaan" }, { status: 500 });
  }
}
