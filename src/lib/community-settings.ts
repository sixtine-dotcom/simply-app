import { db } from "@/lib/db";

export type CommunityExperienceSettings = {
  introTitle: string;
  introBody: string;
  flowTitle: string;
  flowBody: string;
  flowSteps: Array<{
    title: string;
    body: string;
  }>;
};

export const DEFAULT_COMMUNITY_EXPERIENCE: CommunityExperienceSettings = {
  introTitle: "A calm place to share questions, wins, and support.",
  introBody:
    "Your community is part of the journey. Use it to get quick answers, share progress, and stay connected between sessions and lessons.",
  flowTitle: "Community flow",
  flowBody: "A simple rhythm that keeps your space warm, useful, and easy to follow.",
  flowSteps: [
    {
      title: "1. Share small updates",
      body: "Keep it simple: questions, wins, and obstacles are more than enough.",
    },
    {
      title: "2. Use the right space",
      body: "Program-specific spaces keep conversations relevant and easier to follow.",
    },
    {
      title: "3. Check announcements",
      body: "Important updates, deadlines, and practical information live there.",
    },
  ],
};

export async function getCommunityExperienceSettings(
  tenantId: string | null | undefined
): Promise<CommunityExperienceSettings> {
  if (!tenantId) {
    return DEFAULT_COMMUNITY_EXPERIENCE;
  }

  const settings = await db.tenantSettings.findUnique({
    where: { tenantId },
    select: {
      communityIntroTitle: true,
      communityIntroBody: true,
      communityFlowTitle: true,
      communityFlowBody: true,
      communityFlowStep1Title: true,
      communityFlowStep1Body: true,
      communityFlowStep2Title: true,
      communityFlowStep2Body: true,
      communityFlowStep3Title: true,
      communityFlowStep3Body: true,
    },
  });

  if (!settings) {
    return DEFAULT_COMMUNITY_EXPERIENCE;
  }

  return {
    introTitle: settings.communityIntroTitle?.trim() || DEFAULT_COMMUNITY_EXPERIENCE.introTitle,
    introBody: settings.communityIntroBody?.trim() || DEFAULT_COMMUNITY_EXPERIENCE.introBody,
    flowTitle: settings.communityFlowTitle?.trim() || DEFAULT_COMMUNITY_EXPERIENCE.flowTitle,
    flowBody: settings.communityFlowBody?.trim() || DEFAULT_COMMUNITY_EXPERIENCE.flowBody,
    flowSteps: [
      {
        title:
          settings.communityFlowStep1Title?.trim() ||
          DEFAULT_COMMUNITY_EXPERIENCE.flowSteps[0].title,
        body:
          settings.communityFlowStep1Body?.trim() ||
          DEFAULT_COMMUNITY_EXPERIENCE.flowSteps[0].body,
      },
      {
        title:
          settings.communityFlowStep2Title?.trim() ||
          DEFAULT_COMMUNITY_EXPERIENCE.flowSteps[1].title,
        body:
          settings.communityFlowStep2Body?.trim() ||
          DEFAULT_COMMUNITY_EXPERIENCE.flowSteps[1].body,
      },
      {
        title:
          settings.communityFlowStep3Title?.trim() ||
          DEFAULT_COMMUNITY_EXPERIENCE.flowSteps[2].title,
        body:
          settings.communityFlowStep3Body?.trim() ||
          DEFAULT_COMMUNITY_EXPERIENCE.flowSteps[2].body,
      },
    ],
  };
}
