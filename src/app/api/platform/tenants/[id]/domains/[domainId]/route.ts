import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAuditLog, getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

const updateDomainSchema = z.object({
  isPrimary: z.boolean(),
  isVerified: z.boolean(),
});

async function requireSuperAdmin() {
  const user = await getCurrentUser();
  return user && user.role === "SUPERADMIN" ? user : null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; domainId: string }> }
) {
  try {
    const user = await requireSuperAdmin();
    if (!user) {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    const { id, domainId } = await params;
    const body = updateDomainSchema.parse(await request.json());

    const current = await db.tenantDomain.findFirst({
      where: { id: domainId, tenantId: id },
    });

    if (!current) {
      return NextResponse.json({ error: "Domein niet gevonden" }, { status: 404 });
    }

    const domain = await db.$transaction(async (tx) => {
      if (body.isPrimary) {
        await tx.tenantDomain.updateMany({
          where: { tenantId: id },
          data: { isPrimary: false },
        });
      }

      return tx.tenantDomain.update({
        where: { id: domainId },
        data: {
          isPrimary: body.isPrimary,
          isVerified: body.isVerified,
        },
      });
    });

    await createAuditLog(
      "platform.tenant.domain.updated",
      user.id,
      {
        tenantId: id,
        domain: domain.domain,
        isPrimary: domain.isPrimary,
        isVerified: domain.isVerified,
      },
      undefined,
      id
    );

    return NextResponse.json({ domain });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Update tenant domain error:", error);
    return NextResponse.json({ error: "Er is iets misgegaan" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; domainId: string }> }
) {
  try {
    const user = await requireSuperAdmin();
    if (!user) {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    const { id, domainId } = await params;
    const existing = await db.tenantDomain.findFirst({
      where: { id: domainId, tenantId: id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Domein niet gevonden" }, { status: 404 });
    }

    await db.tenantDomain.delete({
      where: { id: domainId },
    });

    await createAuditLog(
      "platform.tenant.domain.deleted",
      user.id,
      {
        tenantId: id,
        domain: existing.domain,
      },
      undefined,
      id
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete tenant domain error:", error);
    return NextResponse.json({ error: "Er is iets misgegaan" }, { status: 500 });
  }
}
