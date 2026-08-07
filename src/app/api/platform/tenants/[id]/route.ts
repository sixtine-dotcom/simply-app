import { NextRequest, NextResponse } from "next/server";
import { FormAssignmentAudienceType, FormResponseStatus, FormStatus } from "@prisma/client";
import { z } from "zod";
import { createAuditLog, getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

const updateTenantSchema = z.object({
  name: z.string().trim().min(2, "Naam is verplicht").max(120),
  slug: z
    .string()
    .trim()
    .min(2, "Slug is verplicht")
    .max(100, "Slug is te lang"),
  plan: z.enum(["STARTER", "PRO", "ENTERPRISE"]),
  status: z.enum(["ACTIVE", "SUSPENDED", "TRIAL"]),
  trialEndsAt: z.string().datetime().nullable(),
  suspendedReason: z.string().trim().max(500).nullable(),
});

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

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
    const [tenant, auditLogs, pendingActivationCount, pendingRequiredFormsCount] = await Promise.all([
      db.tenant.findUnique({
        where: { id },
        include: {
          settings: true,
          domains: {
            orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
          },
          subscriptions: {
            orderBy: { createdAt: "desc" },
            take: 10,
          },
          featureFlags: {
            select: {
              key: true,
              isEnabled: true,
            },
          },
          _count: {
            select: {
              users: true,
              domains: true,
              subscriptions: true,
            },
          },
        },
      }),
      db.auditLog.findMany({
        where: { tenantId: id },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      db.user.count({
        where: {
          tenantId: id,
          deletedAt: null,
          lastLoginAt: null,
          emailVerified: null,
        },
      }),
      db.formAssignment.count({
        where: {
          tenantId: id,
          isActive: true,
          isRequired: true,
          audienceType: FormAssignmentAudienceType.USER,
          userId: { not: null },
          form: {
            status: FormStatus.PUBLISHED,
          },
          responses: {
            none: {
              status: FormResponseStatus.SUBMITTED,
            },
          },
        },
      }),
    ]);

    if (!tenant) {
      return NextResponse.json({ error: "Tenant niet gevonden" }, { status: 404 });
    }

    return NextResponse.json({
      tenant: {
        ...tenant,
        risk: {
          pendingActivations: pendingActivationCount,
          pendingRequiredForms: pendingRequiredFormsCount,
        },
      },
      auditLogs,
    });
  } catch (error) {
    console.error("Get tenant detail error:", error);
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
    const body = updateTenantSchema.parse(await request.json());
    const normalizedSlug = slugify(body.slug);

    const existing = await db.tenant.findFirst({
      where: {
        slug: normalizedSlug,
        id: { not: id },
      },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Deze slug is al in gebruik" },
        { status: 400 }
      );
    }

    const tenant = await db.tenant.update({
      where: { id },
      data: {
        name: body.name,
        slug: normalizedSlug,
        plan: body.plan,
        status: body.status,
        trialEndsAt: body.trialEndsAt ? new Date(body.trialEndsAt) : null,
        suspendedAt: body.status === "SUSPENDED" ? new Date() : null,
        suspendedReason:
          body.status === "SUSPENDED" ? body.suspendedReason || null : null,
      },
    });

    await createAuditLog(
      "platform.tenant.updated",
      user.id,
      {
        tenantId: tenant.id,
        slug: tenant.slug,
        plan: tenant.plan,
        status: tenant.status,
      },
      undefined,
      tenant.id
    );

    return NextResponse.json({ tenant });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Update tenant error:", error);
    return NextResponse.json({ error: "Er is iets misgegaan" }, { status: 500 });
  }
}
