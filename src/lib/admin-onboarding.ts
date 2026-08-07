import { FormAssignmentAudienceType, FormResponseStatus, FormStatus } from "@prisma/client";
import { db } from "@/lib/db";

const DEFAULT_PRIMARY_COLOR = "#385739";
const DEFAULT_SECONDARY_COLOR = "#B18A4A";

export async function getAdminOnboardingState(tenantId: string) {
  const [
    tenant,
    adminTeamCount,
    createdCourseCount,
    createdSpaceCount,
    createdLandingPageCount,
    createdOfferCount,
    createdFormCount,
    grantedAccessCount,
    pendingActivationCount,
    pendingRequiredFormsCount,
    recentAuditLogs,
  ] = await Promise.all([
    db.tenant.findUnique({
      where: { id: tenantId },
      include: {
        settings: true,
        domains: {
          select: { id: true },
          take: 1,
        },
      },
    }),
    db.user.count({
      where: {
        tenantId,
        deletedAt: null,
        role: { in: ["ADMIN", "STAFF", "COACH", "SUPPORT"] },
      },
    }),
    db.auditLog.count({
      where: {
        tenantId,
        action: "course.created",
      },
    }),
    db.auditLog.count({
      where: {
        tenantId,
        action: "space.created",
      },
    }),
    db.auditLog.count({
      where: {
        tenantId,
        action: "landing_page.created",
      },
    }),
    db.auditLog.count({
      where: {
        tenantId,
        action: "offer.created",
      },
    }),
    db.form.count({
      where: {
        tenantId,
      },
    }),
    db.auditLog.count({
      where: {
        tenantId,
        action: {
          in: ["offer.access_assigned", "offer.lead_converted"],
        },
      },
    }),
    db.user.count({
      where: {
        tenantId,
        deletedAt: null,
        lastLoginAt: null,
        emailVerified: null,
        role: { in: ["CLIENT", "COACH", "SUPPORT"] },
      },
    }),
    db.formAssignment.count({
      where: {
        tenantId,
        isActive: true,
        isRequired: true,
        audienceType: FormAssignmentAudienceType.USER,
        userId: { not: null },
        form: {
          status: FormStatus.PUBLISHED,
        },
        OR: [
          { responses: { none: { status: FormResponseStatus.SUBMITTED } } },
        ],
      },
    }),
    db.auditLog.findMany({
      where: {
        tenantId,
        action: {
          in: [
            "course.created",
            "space.created",
            "landing_page.created",
            "offer.created",
            "user.created",
            "offer.access_assigned",
            "offer.lead_converted",
          ],
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  if (!tenant) {
    return null;
  }

  const brandingConfigured = Boolean(
    tenant.settings?.logoUrl ||
      tenant.settings?.faviconUrl ||
      tenant.settings?.loginBackgroundUrl ||
      tenant.settings?.loginVideoUrl ||
      tenant.settings?.footerText ||
      (tenant.settings?.platformName &&
        tenant.settings.platformName.trim() !== tenant.name.trim()) ||
      (tenant.settings?.primaryColor &&
        tenant.settings.primaryColor !== DEFAULT_PRIMARY_COLOR) ||
      (tenant.settings?.secondaryColor &&
        tenant.settings.secondaryColor !== DEFAULT_SECONDARY_COLOR)
  );

  const customDomainConnected = tenant.domains.length > 0;
  const teamInvited = adminTeamCount > 1;
  const firstProductCreated = createdCourseCount > 0;
  const firstSpaceCreated = createdSpaceCount > 0;
  const firstLandingPageCreated = createdLandingPageCount > 0;
  const firstOfferCreated = createdOfferCount > 0;
  const firstFormCreated = createdFormCount > 0;
  const firstAccessGranted = grantedAccessCount > 0;
  const onboardingCompleted = Boolean(tenant.settings?.onboardingCompletedAt);

  const steps = [
    {
      key: "branding",
      title: "Merk instellen",
      description: "Werk naam, logo, kleuren en login-ervaring van je platform bij.",
      href: "/admin/branding",
      isComplete: brandingConfigured,
      isRequired: true,
    },
    {
      key: "product",
      title: "Eerste product maken",
      description: "Maak je eerste programma of cursus zodat je platform meteen inhoud heeft.",
      href: "/admin/onboarding",
      isComplete: firstProductCreated,
      isRequired: true,
    },
    {
      key: "member",
      title: "Eerste lid uitnodigen",
      description: "Voeg je eerste klant, coach of teamlid toe om je workflow te testen.",
      href: "/admin/onboarding",
      isComplete: teamInvited,
      isRequired: true,
    },
    {
      key: "offer",
      title: "Eerste offer maken",
      description: "Koppel je product aan een echt verkoopbaar aanbod of membership.",
      href: "/admin/onboarding",
      isComplete: firstOfferCreated,
      isRequired: true,
    },
    {
      key: "form",
      title: "Vragenlijst klaarzetten",
      description: "Maak een eerste intake- of onboardingformulier dat je leden moeten invullen.",
      href: "/admin/forms",
      isComplete: firstFormCreated,
      isRequired: true,
    },
    {
      key: "domain",
      title: "Domein koppelen",
      description: "Voeg je eigen domein toe zodat klanten op jouw merk inloggen.",
      href: "/admin/branding",
      isComplete: customDomainConnected,
      isRequired: false,
    },
    {
      key: "community",
      title: "Community klaarzetten",
      description: "Maak minstens een eerste space zodat je groep direct een plek heeft.",
      href: "/admin/onboarding",
      isComplete: firstSpaceCreated,
      isRequired: true,
    },
    {
      key: "site",
      title: "Eerste pagina maken",
      description: "Zet je eerste landing page klaar voor verkeer of verkoop.",
      href: "/admin/onboarding",
      isComplete: firstLandingPageCreated,
      isRequired: true,
    },
    {
      key: "access",
      title: "Eerste toegang testen",
      description: "Geef een eerste lid toegang tot je offer en controleer de klantreis.",
      href: "/admin/onboarding",
      isComplete: firstAccessGranted,
      isRequired: false,
    },
  ];

  const completedSteps = steps.filter((step) => step.isComplete).length;
  const requiredSteps = steps.filter((step) => step.isRequired);
  const requiredCompletedSteps = requiredSteps.filter((step) => step.isComplete).length;

  const latestIds = {
    courseId:
      ((recentAuditLogs.find((log) => log.action === "course.created")?.metadata as
        | Record<string, unknown>
        | undefined)?.courseId as string | undefined) ?? null,
    offerId:
      ((recentAuditLogs.find((log) => log.action === "offer.created")?.metadata as
        | Record<string, unknown>
        | undefined)?.offerId as string | undefined) ?? null,
    spaceId:
      ((recentAuditLogs.find((log) => log.action === "space.created")?.metadata as
        | Record<string, unknown>
        | undefined)?.spaceId as string | undefined) ?? null,
    landingPageId:
      ((recentAuditLogs.find((log) => log.action === "landing_page.created")?.metadata as
        | Record<string, unknown>
        | undefined)?.landingPageId as string | undefined) ?? null,
    memberId:
      ((recentAuditLogs.find((log) => log.action === "user.created")?.metadata as
        | Record<string, unknown>
        | undefined)?.targetUserId as string | undefined) ?? null,
    grantedMemberId:
      ((recentAuditLogs.find((log) => log.action === "offer.access_assigned")?.metadata as
        | Record<string, unknown>
        | undefined)?.userId as string | undefined) ??
      ((recentAuditLogs.find((log) => log.action === "offer.lead_converted")?.metadata as
        | Record<string, unknown>
        | undefined)?.userId as string | undefined) ??
      null,
  };

  const [latestCourse, latestOffer, latestSpace, latestLandingPage, latestMember, grantedMember] =
    await Promise.all([
      latestIds.courseId
        ? db.course.findUnique({
            where: { id: latestIds.courseId },
            select: { id: true, title: true, slug: true, isPublished: true },
          })
        : Promise.resolve(null),
      latestIds.offerId
        ? db.offer.findUnique({
            where: { id: latestIds.offerId },
            select: { id: true, title: true, slug: true, isPublished: true },
          })
        : Promise.resolve(null),
      latestIds.spaceId
        ? db.space.findUnique({
            where: { id: latestIds.spaceId },
            select: { id: true, name: true, slug: true, isPublic: true },
          })
        : Promise.resolve(null),
      latestIds.landingPageId
        ? db.landingPage.findUnique({
            where: { id: latestIds.landingPageId },
            select: { id: true, title: true, slug: true, isPublished: true },
          })
        : Promise.resolve(null),
      latestIds.memberId
        ? db.user.findUnique({
            where: { id: latestIds.memberId },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          })
        : Promise.resolve(null),
      latestIds.grantedMemberId
        ? db.user.findUnique({
            where: { id: latestIds.grantedMemberId },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          })
        : Promise.resolve(null),
    ]);

  const nextRecommendedAction =
    steps.find((step) => step.isRequired && !step.isComplete) ??
    steps.find((step) => !step.isComplete) ??
    null;

  return {
    tenant: {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      plan: tenant.plan,
      status: tenant.status,
      trialEndsAt: tenant.trialEndsAt,
    },
    onboardingCompleted,
    onboardingCompletedAt: tenant.settings?.onboardingCompletedAt ?? null,
    completedSteps,
    totalSteps: steps.length,
    requiredCompletedSteps,
    totalRequiredSteps: requiredSteps.length,
    canCompleteOnboarding: requiredCompletedSteps === requiredSteps.length,
    progress: Math.round((completedSteps / steps.length) * 100),
    assetCounts: {
      products: createdCourseCount,
      offers: createdOfferCount,
      forms: createdFormCount,
      spaces: createdSpaceCount,
      landingPages: createdLandingPageCount,
      teamMembers: adminTeamCount,
      grantedAccess: grantedAccessCount,
      pendingActivations: pendingActivationCount,
      pendingRequiredForms: pendingRequiredFormsCount,
    },
    latestAssets: {
      course: latestCourse
        ? {
            id: latestCourse.id,
            title: latestCourse.title,
            slug: latestCourse.slug,
            manageHref: `/admin/courses/${latestCourse.id}`,
            viewHref: `/courses/${latestCourse.slug}`,
            isPublished: latestCourse.isPublished,
          }
        : null,
      offer: latestOffer
        ? {
            id: latestOffer.id,
            title: latestOffer.title,
            slug: latestOffer.slug,
            manageHref: `/admin/offers`,
            viewHref: `/offers/${latestOffer.slug}`,
            isPublished: latestOffer.isPublished,
          }
        : null,
      space: latestSpace
        ? {
            id: latestSpace.id,
            title: latestSpace.name,
            slug: latestSpace.slug,
            manageHref: `/admin/community/spaces/${latestSpace.id}`,
            viewHref: `/community/${latestSpace.slug}`,
            isPublished: latestSpace.isPublic,
          }
        : null,
      landingPage: latestLandingPage
        ? {
            id: latestLandingPage.id,
            title: latestLandingPage.title,
            slug: latestLandingPage.slug,
            manageHref: `/admin/landing-pages/${latestLandingPage.id}`,
            viewHref: `/landing/${latestLandingPage.slug}`,
            isPublished: latestLandingPage.isPublished,
          }
        : null,
      member: latestMember
        ? {
            id: latestMember.id,
            title:
              `${latestMember.firstName ?? ""} ${latestMember.lastName ?? ""}`.trim() ||
              latestMember.email,
            subtitle: latestMember.email,
            role: latestMember.role,
            manageHref: "/admin/users",
          }
        : null,
      grantedMember: grantedMember
        ? {
            id: grantedMember.id,
            title:
              `${grantedMember.firstName ?? ""} ${grantedMember.lastName ?? ""}`.trim() ||
              grantedMember.email,
            subtitle: grantedMember.email,
            role: grantedMember.role,
            manageHref: "/admin/users",
          }
        : null,
    },
    readiness: {
      isReadyForSoftLaunch:
        brandingConfigured &&
        firstProductCreated &&
        firstOfferCreated &&
        firstLandingPageCreated &&
        pendingActivationCount === 0 &&
        pendingRequiredFormsCount === 0,
      hasPublicSurface: firstLandingPageCreated || firstOfferCreated,
      hasTestedAccess: firstAccessGranted,
      hasPendingActivations: pendingActivationCount > 0,
      hasPendingRequiredForms: pendingRequiredFormsCount > 0,
      nextRecommendedAction,
    },
    steps,
  };
}
