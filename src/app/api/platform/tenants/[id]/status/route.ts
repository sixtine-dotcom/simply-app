import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAuditLog, getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

const updateStatusSchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED", "TRIAL"]),
  reason: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const data = updateStatusSchema.parse(body);

    const tenant = await db.tenant.update({
      where: { id },
      data: {
        status: data.status,
        suspendedAt: data.status === "SUSPENDED" ? new Date() : null,
        suspendedReason: data.status === "SUSPENDED" ? data.reason || null : null,
      },
    });

    await createAuditLog(
      "platform.tenant.status.updated",
      user.id,
      { tenantId: id, status: data.status, reason: data.reason || null },
      undefined,
      id
    );

    return NextResponse.json({ tenant });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error("Update tenant status error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan" },
      { status: 500 }
    );
  }
}
