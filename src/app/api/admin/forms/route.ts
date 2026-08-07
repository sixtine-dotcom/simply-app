import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { FormStatus } from "@prisma/client";
import { createAuditLog, getCurrentUser } from "@/lib/auth";
import { getAdminFormOverview, slugifyFormValue } from "@/lib/forms";
import { db } from "@/lib/db";

const createFormSchema = z.object({
  title: z.string().trim().min(2, "Titel is verplicht"),
});

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN") || !user.tenantId) return null;
  return user;
}

export async function GET() {
  try {
    const user = await requireAdmin();
    if (!user) {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    const forms = await getAdminFormOverview(user.tenantId!);
    return NextResponse.json({ forms });
  } catch (error) {
    console.error("Get admin forms error:", error);
    return NextResponse.json({ error: "Er is iets misgegaan" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAdmin();
    if (!user) {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    const body = createFormSchema.parse(await request.json());
    const baseSlug = slugifyFormValue(body.title);
    let slug = baseSlug;
    let counter = 1;

    while (await db.form.findUnique({ where: { slug }, select: { id: true } })) {
      counter += 1;
      slug = `${baseSlug}-${counter}`;
    }

    const form = await db.form.create({
      data: {
        tenantId: user.tenantId!,
        title: body.title,
        slug,
        status: FormStatus.DRAFT,
        introTitle: body.title,
        introDescription: "Gebruik dit formulier om een rustige, duidelijke intake of check-in te bouwen.",
        successTitle: "Bedankt",
        successDescription: "Je antwoorden zijn opgeslagen.",
        questions: {
          create: [
            {
              title: "Waar wil je vandaag graag mee starten?",
              type: "LONG_TEXT",
              position: 0,
              isRequired: true,
              placeholder: "Typ hier je antwoord...",
            },
          ],
        },
      },
    });

    await createAuditLog(
      "form.created",
      user.id,
      { formId: form.id, source: "admin" },
      undefined,
      user.tenantId!
    );

    return NextResponse.json({ form });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Create form error:", error);
    return NextResponse.json({ error: "Er is iets misgegaan" }, { status: 500 });
  }
}
