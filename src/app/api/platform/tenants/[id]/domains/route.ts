import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAuditLog, getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { isTenantFeatureEnabled } from "@/lib/feature-flags";

const createDomainSchema = z.object({
  domain: z
    .string()
    .trim()
    .min(3, "Domein is verplicht")
    .max(255, "Domein is te lang")
    .regex(
      /^(?!:\/\/)([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/,
      "Voer een geldig domein in"
    ),
  isPrimary: z.boolean().default(false),
});

async function requireSuperAdmin() {
  const user = await getCurrentUser();
  return user && user.role === "SUPERADMIN" ? user : null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireSuperAdmin();
    if (!user) {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    const { id } = await params;
    const body = createDomainSchema.parse(await request.json());
    const normalizedDomain = body.domain.toLowerCase();

    const tenant = await db.tenant.findUnique({
      where: { id },
      select: { id: true, slug: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant niet gevonden" }, { status: 404 });
    }

    const canUseCustomDomain = await isTenantFeatureEnabled(id, "custom_domain");
    if (!canUseCustomDomain) {
      return NextResponse.json(
        { error: "Custom domains zijn alleen beschikbaar op Pro en Enterprise." },
        { status: 403 }
      );
    }

    const existing = await db.tenantDomain.findUnique({
      where: { domain: normalizedDomain },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Dit domein is al gekoppeld aan een tenant" },
        { status: 400 }
      );
    }

    const domain = await db.$transaction(async (tx) => {
      if (body.isPrimary) {
        await tx.tenantDomain.updateMany({
          where: { tenantId: tenant.id },
          data: { isPrimary: false },
        });
      }

      return tx.tenantDomain.create({
        data: {
          tenantId: tenant.id,
          domain: normalizedDomain,
          isPrimary: body.isPrimary,
          isVerified: false,
        },
      });
    });

    await createAuditLog(
      "platform.tenant.domain.created",
      user.id,
      {
        tenantId: tenant.id,
        domain: domain.domain,
        isPrimary: domain.isPrimary,
      },
      undefined,
      tenant.id
    );

    return NextResponse.json({ domain }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Create tenant domain error:", error);
    return NextResponse.json({ error: "Er is iets misgegaan" }, { status: 500 });
  }
}
