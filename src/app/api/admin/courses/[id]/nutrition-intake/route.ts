import { NextResponse } from "next/server";
import { requireAdminUser, createAuditLog } from "@/lib/auth";
import { ensureNutritionIntakeForCourse } from "@/lib/nutrition-intake";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAdminUser("/admin/courses");
    if (!user.tenantId) {
      return NextResponse.json({ error: "Geen organisatie gekoppeld" }, { status: 400 });
    }
    const { id } = await params;
    const assignment = await ensureNutritionIntakeForCourse({
      tenantId: user.tenantId,
      courseId: id,
    });
    await createAuditLog("course.nutrition_intake.enabled", user.id, {
      courseId: id,
      formId: assignment.formId,
    });
    return NextResponse.json({
      success: true,
      formId: assignment.formId,
      formSlug: assignment.form.slug,
    });
  } catch (error) {
    console.error("Enable nutrition intake error:", error);
    return NextResponse.json({ error: "Voedingsintake aanmaken is niet gelukt" }, { status: 500 });
  }
}
