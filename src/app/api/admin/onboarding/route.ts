import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAuditLog, getCurrentUser } from "@/lib/auth";
import { getAdminOnboardingState } from "@/lib/admin-onboarding";
import { db } from "@/lib/db";

const onboardingActionSchema = z.object({
  action: z.enum(["complete", "reset"]),
});

async function requireTenantAdmin() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN") || !user.tenantId) {
    return null;
  }
  return user;
}

export async function GET() {
  try {
    const user = await requireTenantAdmin();
    if (!user) {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    const onboarding = await getAdminOnboardingState(user.tenantId!);
    if (!onboarding) {
      return NextResponse.json({ error: "Tenant niet gevonden" }, { status: 404 });
    }

    return NextResponse.json({ onboarding });
  } catch (error) {
    console.error("Get onboarding error:", error);
    return NextResponse.json({ error: "Er is iets misgegaan" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireTenantAdmin();
    if (!user) {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    const body = onboardingActionSchema.parse(await request.json());
    const currentState = await getAdminOnboardingState(user.tenantId!);
    if (!currentState) {
      return NextResponse.json({ error: "Tenant niet gevonden" }, { status: 404 });
    }
    if (body.action === "complete" && !currentState.canCompleteOnboarding) {
      return NextResponse.json(
        { error: "Rond eerst alle verplichte setup-stappen af." },
        { status: 400 }
      );
    }
    const onboardingCompletedAt = body.action === "complete" ? new Date() : null;

    await db.tenantSettings.upsert({
      where: { tenantId: user.tenantId! },
      update: { onboardingCompletedAt },
      create: {
        tenantId: user.tenantId!,
        onboardingCompletedAt,
      },
    });

    await createAuditLog(
      body.action === "complete"
        ? "tenant.onboarding.completed"
        : "tenant.onboarding.reset",
      user.id,
      { tenantId: user.tenantId },
      undefined,
      user.tenantId
    );

    const onboarding = await getAdminOnboardingState(user.tenantId!);
    return NextResponse.json({ success: true, onboarding });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Update onboarding error:", error);
    return NextResponse.json({ error: "Er is iets misgegaan" }, { status: 500 });
  }
}
