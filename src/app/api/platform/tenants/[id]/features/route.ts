import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAuditLog, getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  FEATURE_CATALOG,
  type FeatureKey,
  resolveTenantFeatureFlags,
} from "@/lib/feature-flags";

const updateFeatureSchema = z.object({
  key: z.enum(FEATURE_CATALOG.map((feature) => feature.key) as [FeatureKey, ...FeatureKey[]]),
  enabled: z.boolean(),
});

async function requireSuperAdmin() {
  const user = await getCurrentUser();
  return user && user.role === "SUPERADMIN" ? user : null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireSuperAdmin();
    if (!user) {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    const { id } = await params;
    const resolved = await resolveTenantFeatureFlags(id);
    if (!resolved) {
      return NextResponse.json({ error: "Tenant niet gevonden" }, { status: 404 });
    }

    return NextResponse.json(resolved);
  } catch (error) {
    console.error("Get tenant features error:", error);
    return NextResponse.json({ error: "Er is iets misgegaan" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireSuperAdmin();
    if (!user) {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    const { id } = await params;
    const body = updateFeatureSchema.parse(await request.json());

    await db.tenantFeatureFlag.upsert({
      where: {
        tenantId_key: {
          tenantId: id,
          key: body.key,
        },
      },
      update: {
        isEnabled: body.enabled,
      },
      create: {
        tenantId: id,
        key: body.key,
        isEnabled: body.enabled,
      },
    });

    await createAuditLog(
      "platform.tenant.feature.updated",
      user.id,
      {
        tenantId: id,
        key: body.key,
        enabled: body.enabled,
      },
      undefined,
      id
    );

    const resolved = await resolveTenantFeatureFlags(id);
    return NextResponse.json(resolved);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Update tenant feature error:", error);
    return NextResponse.json({ error: "Er is iets misgegaan" }, { status: 500 });
  }
}
