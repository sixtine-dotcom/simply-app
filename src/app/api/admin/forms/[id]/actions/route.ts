import { NextRequest, NextResponse } from "next/server";
import { FormStatus } from "@prisma/client";
import { z } from "zod";
import { createAuditLog, getCurrentUser } from "@/lib/auth";
import { slugifyFormValue } from "@/lib/forms";
import { db } from "@/lib/db";

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("publish") }),
  z.object({ action: z.literal("archive") }),
  z.object({ action: z.literal("restore") }),
  z.object({ action: z.literal("duplicate") }),
]);

async function uniqueSlug(title: string) {
  const base = slugifyFormValue(title) || "formulier-kopie";
  let slug = base;
  let counter = 1;
  while (await db.form.findUnique({ where: { slug }, select: { id: true } })) {
    counter += 1;
    slug = `${base}-${counter}`;
  }
  return slug;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN") || !user.tenantId) {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    const { id } = await params;
    const body = actionSchema.parse(await request.json());
    const form = await db.form.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { questions: { orderBy: { position: "asc" } } },
    });
    if (!form) return NextResponse.json({ error: "Formulier niet gevonden" }, { status: 404 });

    if (body.action === "duplicate") {
      const title = `Kopie van ${form.title}`;
      const duplicate = await db.form.create({
        data: {
          tenantId: user.tenantId,
          title,
          slug: await uniqueSlug(title),
          description: form.description,
          status: FormStatus.DRAFT,
          introTitle: form.introTitle,
          introDescription: form.introDescription,
          submitButtonLabel: form.submitButtonLabel,
          successTitle: form.successTitle,
          successDescription: form.successDescription,
          isOnboardingForm: form.isOnboardingForm,
          questions: {
            create: form.questions.map((question) => ({
              title: question.title,
              description: question.description,
              type: question.type,
              position: question.position,
              isRequired: question.isRequired,
              placeholder: question.placeholder,
              helperText: question.helperText,
              options: question.options ?? undefined,
            })),
          },
        },
      });
      await createAuditLog(
        "form.duplicated",
        user.id,
        { formId: form.id, duplicatedFormId: duplicate.id },
        undefined,
        user.tenantId
      );
      return NextResponse.json({ form: duplicate, message: "Formulier gedupliceerd als concept." });
    }

    const status =
      body.action === "archive"
        ? FormStatus.ARCHIVED
        : body.action === "publish" || body.action === "restore"
          ? FormStatus.PUBLISHED
          : form.status;
    const updated = await db.form.update({ where: { id: form.id }, data: { status } });
    await createAuditLog(
      `form.${body.action}`,
      user.id,
      { formId: form.id, status },
      undefined,
      user.tenantId
    );
    return NextResponse.json({ form: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Ongeldige formulieractie" }, { status: 400 });
    }
    console.error("Form action error:", error);
    return NextResponse.json({ error: "De actie kon niet worden uitgevoerd" }, { status: 500 });
  }
}
