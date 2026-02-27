import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser, createAuditLog } from "@/lib/auth";

/** GET: huidige Shopify productkoppeling(en) voor deze cursus */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;
    const user = await getCurrentUser();

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    const mappings = await db.shopifyProductMapping.findMany({
      where: { courseId },
      include: { course: { select: { title: true } } },
    });

    return NextResponse.json({ mappings });
  } catch (error) {
    console.error("Get Shopify mapping error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan" },
      { status: 500 }
    );
  }
}

const setMappingSchema = z.object({
  shopifyProductId: z.string().min(1, "Product ID is verplicht"),
  accessDays: z.number().int().min(0).nullable().optional(),
});

/** PUT: koppel een Shopify product aan deze cursus (vervangt bestaande koppeling voor deze cursus) */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;
    const user = await getCurrentUser();

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    const course = await db.course.findUnique({
      where: { id: courseId },
      select: { id: true, title: true },
    });
    if (!course) {
      return NextResponse.json({ error: "Cursus niet gevonden" }, { status: 404 });
    }

    const body = await request.json();
    const { shopifyProductId, accessDays } = setMappingSchema.parse(body);

    const existing = await db.shopifyProductMapping.findUnique({
      where: { shopifyProductId },
    });
    if (existing && existing.courseId !== courseId) {
      return NextResponse.json(
        { error: "Dit Shopify-product is al gekoppeld aan een andere cursus. Verwijder die koppeling eerst." },
        { status: 400 }
      );
    }

    let mapping;
    if (existing && existing.courseId === courseId) {
      mapping = await db.shopifyProductMapping.update({
        where: { shopifyProductId },
        data: { accessDays: accessDays ?? null },
      });
    } else {
      await db.shopifyProductMapping.deleteMany({ where: { courseId } });
      mapping = await db.shopifyProductMapping.create({
        data: {
          shopifyProductId,
          courseId,
          accessDays: accessDays ?? null,
        },
      });
    }

    await createAuditLog("shopify_mapping.set", user.id, {
      courseId,
      shopifyProductId,
    });

    return NextResponse.json({ mapping });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error("Set Shopify mapping error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan" },
      { status: 500 }
    );
  }
}

/** DELETE: koppeling tussen Shopify product en deze cursus verwijderen */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;
    const user = await getCurrentUser();

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    await db.shopifyProductMapping.deleteMany({
      where: { courseId },
    });

    await createAuditLog("shopify_mapping.removed", user.id, { courseId });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete Shopify mapping error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan" },
      { status: 500 }
    );
  }
}
