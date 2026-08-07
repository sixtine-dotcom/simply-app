import { BiologicalSex } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAuditLog, requireAdminUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { syncNutritionPlansForCourse } from "@/lib/nutrition-plan-assignment";

const templateSchema = z.object({
  biologicalSex: z.nativeEnum(BiologicalSex),
  fileUrl: z.string().min(1),
  title: z.string().trim().min(1),
});

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAdminUser("/admin/courses");
    const { id: courseId } = await params;
    const body = templateSchema.parse(await request.json());

    const template = await db.nutritionPlanTemplate.upsert({
      where: {
        courseId_biologicalSex: { courseId, biologicalSex: body.biologicalSex },
      },
      update: { fileUrl: body.fileUrl, title: body.title, isActive: true },
      create: { courseId, biologicalSex: body.biologicalSex, fileUrl: body.fileUrl, title: body.title },
    });

    const syncResults = await syncNutritionPlansForCourse(courseId);
    await createAuditLog("nutrition_plan_template.updated", user.id, {
      courseId,
      templateId: template.id,
      biologicalSex: body.biologicalSex,
      assignedPlans: syncResults.filter((result) => result.status === "assigned").length,
    });
    return NextResponse.json({ template });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Nutrition template update error:", error);
    return NextResponse.json({ error: "Template opslaan is niet gelukt" }, { status: 500 });
  }
}
