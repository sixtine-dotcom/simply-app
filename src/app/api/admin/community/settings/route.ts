import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAuditLog, getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  DEFAULT_COMMUNITY_EXPERIENCE,
  getCommunityExperienceSettings,
} from "@/lib/community-settings";

const optionalText = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z.string().trim().max(4000).nullable()
);

const communitySettingsSchema = z.object({
  introTitle: optionalText,
  introBody: optionalText,
  flowTitle: optionalText,
  flowBody: optionalText,
  flowStep1Title: optionalText,
  flowStep1Body: optionalText,
  flowStep2Title: optionalText,
  flowStep2Body: optionalText,
  flowStep3Title: optionalText,
  flowStep3Body: optionalText,
});

async function requireAdminOrCoachWithTenant() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN" && user.role !== "COACH")) {
    return null;
  }
  if (!user.tenantId) {
    return { user, tenantId: null };
  }
  return { user, tenantId: user.tenantId };
}

export async function GET() {
  try {
    const auth = await requireAdminOrCoachWithTenant();
    if (!auth) {
      return NextResponse.json({ error: "No access" }, { status: 403 });
    }
    if (!auth.tenantId) {
      return NextResponse.json({ error: "No tenant linked to this account." }, { status: 400 });
    }

    const settings = await getCommunityExperienceSettings(auth.tenantId);
    return NextResponse.json({
      settings: {
        introTitle: settings.introTitle,
        introBody: settings.introBody,
        flowTitle: settings.flowTitle,
        flowBody: settings.flowBody,
        flowStep1Title: settings.flowSteps[0]?.title ?? DEFAULT_COMMUNITY_EXPERIENCE.flowSteps[0].title,
        flowStep1Body: settings.flowSteps[0]?.body ?? DEFAULT_COMMUNITY_EXPERIENCE.flowSteps[0].body,
        flowStep2Title: settings.flowSteps[1]?.title ?? DEFAULT_COMMUNITY_EXPERIENCE.flowSteps[1].title,
        flowStep2Body: settings.flowSteps[1]?.body ?? DEFAULT_COMMUNITY_EXPERIENCE.flowSteps[1].body,
        flowStep3Title: settings.flowSteps[2]?.title ?? DEFAULT_COMMUNITY_EXPERIENCE.flowSteps[2].title,
        flowStep3Body: settings.flowSteps[2]?.body ?? DEFAULT_COMMUNITY_EXPERIENCE.flowSteps[2].body,
      },
    });
  } catch (error) {
    console.error("Get community settings error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAdminOrCoachWithTenant();
    if (!auth) {
      return NextResponse.json({ error: "No access" }, { status: 403 });
    }
    if (!auth.tenantId) {
      return NextResponse.json({ error: "No tenant linked to this account." }, { status: 400 });
    }

    const parsed = communitySettingsSchema.parse(await request.json());

    await db.tenantSettings.upsert({
      where: { tenantId: auth.tenantId },
      update: {
        communityIntroTitle: parsed.introTitle,
        communityIntroBody: parsed.introBody,
        communityFlowTitle: parsed.flowTitle,
        communityFlowBody: parsed.flowBody,
        communityFlowStep1Title: parsed.flowStep1Title,
        communityFlowStep1Body: parsed.flowStep1Body,
        communityFlowStep2Title: parsed.flowStep2Title,
        communityFlowStep2Body: parsed.flowStep2Body,
        communityFlowStep3Title: parsed.flowStep3Title,
        communityFlowStep3Body: parsed.flowStep3Body,
      },
      create: {
        tenantId: auth.tenantId,
        communityIntroTitle: parsed.introTitle,
        communityIntroBody: parsed.introBody,
        communityFlowTitle: parsed.flowTitle,
        communityFlowBody: parsed.flowBody,
        communityFlowStep1Title: parsed.flowStep1Title,
        communityFlowStep1Body: parsed.flowStep1Body,
        communityFlowStep2Title: parsed.flowStep2Title,
        communityFlowStep2Body: parsed.flowStep2Body,
        communityFlowStep3Title: parsed.flowStep3Title,
        communityFlowStep3Body: parsed.flowStep3Body,
      },
    });

    await createAuditLog(
      "community.settings.updated",
      auth.user.id,
      { tenantId: auth.tenantId },
      undefined,
      auth.tenantId
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Update community settings error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
