import { NextRequest, NextResponse } from "next/server";
import { FormAssignmentAudienceType, FormResponseStatus, FormStatus } from "@prisma/client";
import { z } from "zod";
import { getCurrentUser, createAuditLog } from "@/lib/auth";
import { db } from "@/lib/db";

const createTenantSchema = z.object({
  name: z.string().min(2, "Naam is verplicht"),
  slug: z.string().min(2, "Slug is verplicht"),
  plan: z.enum(["STARTER", "PRO", "ENTERPRISE"]).default("STARTER"),
  status: z.enum(["ACTIVE", "SUSPENDED", "TRIAL"]).default("TRIAL"),
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

export async function GET() {
  try {
    const user = await requireSuperAdmin();
    if (!user) {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    const tenants = await db.tenant.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        subscriptions: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        _count: {
          select: {
            users: true,
            domains: true,
            subscriptions: true,
          },
        },
      },
    });

    const tenantsWithRisk = await Promise.all(
      tenants.map(async (tenant) => {
        const [pendingActivationCount, pendingRequiredFormsCount] = await Promise.all([
          db.user.count({
            where: {
              tenantId: tenant.id,
              deletedAt: null,
              lastLoginAt: null,
              emailVerified: null,
            },
          }),
          db.formAssignment.count({
            where: {
              tenantId: tenant.id,
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

        return {
          ...tenant,
          risk: {
            pendingActivations: pendingActivationCount,
            pendingRequiredForms: pendingRequiredFormsCount,
          },
        };
      })
    );

    return NextResponse.json({ tenants: tenantsWithRisk });
  } catch (error) {
    console.error("List tenants error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireSuperAdmin();
    if (!user) {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    const body = await request.json();
    const data = createTenantSchema.parse(body);
    const normalizedSlug = slugify(data.slug);
    if (!normalizedSlug) {
      return NextResponse.json({ error: "Ongeldige slug" }, { status: 400 });
    }

    const existing = await db.tenant.findUnique({
      where: { slug: normalizedSlug },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Deze tenant slug bestaat al" },
        { status: 400 }
      );
    }

    const tenant = await db.tenant.create({
      data: {
        name: data.name.trim(),
        slug: normalizedSlug,
        plan: data.plan,
        status: data.status,
        platformName: data.name.trim(),
        settings: {
          create: {
            platformName: data.name.trim(),
            emailSenderName: data.name.trim(),
            primaryColor: "#385739",
            secondaryColor: "#B18A4A",
          },
        },
      },
    });

    await createAuditLog(
      "platform.tenant.created",
      user.id,
      { tenantId: tenant.id, slug: tenant.slug, plan: tenant.plan },
      undefined,
      tenant.id
    );

    return NextResponse.json({ tenant }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error("Create tenant error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan" },
      { status: 500 }
    );
  }
}
