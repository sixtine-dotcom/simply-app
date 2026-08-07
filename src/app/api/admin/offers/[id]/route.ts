import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAuditLog, getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

const offerSchema = z.object({
  title: z.string().trim().min(2, "Titel is verplicht"),
  slug: z.string().trim().min(2, "Slug is verplicht"),
  description: z.string().trim().max(1000).nullable().optional(),
  pricingType: z.enum(["one_time", "subscription", "payment_plan"]),
  priceCents: z.number().int().min(0, "Prijs moet positief zijn"),
  billingInterval: z.enum(["monthly", "yearly"]).nullable().optional(),
  trialDays: z.number().int().min(0).nullable().optional(),
  installmentCount: z.number().int().min(2).nullable().optional(),
  accessDurationDays: z.number().int().min(1).nullable().optional(),
  isPublished: z.boolean().default(false),
  courseIds: z.array(z.string()).default([]),
});

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN")) {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    const body = offerSchema.parse(await request.json());
    const normalizedSlug = slugify(body.slug);
    if (!normalizedSlug) {
      return NextResponse.json({ error: "Ongeldige slug" }, { status: 400 });
    }

    const existingOffer = await db.offer.findUnique({
      where: { id },
      select: { id: true, title: true },
    });
    if (!existingOffer) {
      return NextResponse.json({ error: "Offer niet gevonden" }, { status: 404 });
    }

    const existingSlug = await db.offer.findFirst({
      where: {
        slug: normalizedSlug,
        id: { not: id },
      },
      select: { id: true },
    });
    if (existingSlug) {
      return NextResponse.json({ error: "Deze slug is al in gebruik" }, { status: 400 });
    }

    if (body.pricingType !== "subscription" && body.billingInterval) {
      return NextResponse.json(
        { error: "Billing interval kan alleen bij subscriptions." },
        { status: 400 }
      );
    }

    if (body.pricingType !== "payment_plan" && body.installmentCount) {
      return NextResponse.json(
        { error: "Termijnen zijn alleen geldig voor payment plans." },
        { status: 400 }
      );
    }

    const offer = await db.$transaction(async (tx) => {
      await tx.offerCourse.deleteMany({
        where: { offerId: id },
      });

      return tx.offer.update({
        where: { id },
        data: {
          title: body.title,
          slug: normalizedSlug,
          description: body.description || null,
          pricingType: body.pricingType,
          priceCents: body.priceCents,
          billingInterval:
            body.pricingType === "subscription" ? body.billingInterval || "monthly" : null,
          trialDays: body.pricingType === "subscription" ? body.trialDays || null : null,
          installmentCount:
            body.pricingType === "payment_plan" ? body.installmentCount || null : null,
          accessDurationDays: body.accessDurationDays || null,
          isPublished: body.isPublished,
          courses: {
            create: body.courseIds.map((courseId) => ({
              courseId,
            })),
          },
        },
        include: {
          courses: {
            include: {
              course: {
                select: { id: true, title: true, slug: true },
              },
            },
          },
        },
      });
    });

    await createAuditLog(
      "offer.updated",
      user.id,
      {
        offerId: offer.id,
        pricingType: offer.pricingType,
        courseIds: body.courseIds,
      },
      undefined,
      user.tenantId
    );

    return NextResponse.json({ offer });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Update offer error:", error);
    return NextResponse.json({ error: "Er is iets misgegaan" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN")) {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    const offer = await db.offer.findUnique({
      where: { id },
      include: {
        assignments: {
          where: { revokedAt: null },
          select: { id: true },
          take: 1,
        },
      },
    });

    if (!offer) {
      return NextResponse.json({ error: "Offer niet gevonden" }, { status: 404 });
    }

    if (offer.assignments.length > 0) {
      return NextResponse.json(
        { error: "Trek eerst actieve assignments in voordat je dit offer verwijdert." },
        { status: 400 }
      );
    }

    await db.offer.delete({
      where: { id },
    });

    await createAuditLog(
      "offer.deleted",
      user.id,
      {
        offerId: offer.id,
        title: offer.title,
      },
      undefined,
      user.tenantId
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete offer error:", error);
    return NextResponse.json({ error: "Er is iets misgegaan" }, { status: 500 });
  }
}
