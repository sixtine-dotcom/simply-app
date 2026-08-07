import { NextRequest, NextResponse } from "next/server";
import { FormStatus, Role } from "@prisma/client";
import { z } from "zod";
import { createAuditLog, createRegistrationToken, getCurrentUser } from "@/lib/auth";
import { getAdminOnboardingState } from "@/lib/admin-onboarding";
import { createPost } from "@/lib/community";
import { db } from "@/lib/db";
import { slugifyFormValue } from "@/lib/forms";
import { assignOfferAccessToUser } from "@/lib/offer-access";
import { sendRegistrationEmail } from "@/lib/email";

const createCourseSchema = z.object({
  action: z.literal("create_course"),
  title: z.string().trim().min(2, "Titel is verplicht"),
  slug: z.string().trim().min(2, "Slug is verplicht"),
  description: z.string().trim().max(500).optional().or(z.literal("")),
});

const inviteMemberSchema = z.object({
  action: z.literal("invite_member"),
  email: z.string().email("Ongeldig email adres"),
  firstName: z.string().trim().min(1, "Voornaam is verplicht"),
  lastName: z.string().trim().min(1, "Achternaam is verplicht"),
  role: z.enum(["CLIENT", "COACH", "SUPPORT"]).default("CLIENT"),
});

const createSpaceSchema = z.object({
  action: z.literal("create_space"),
  name: z.string().trim().min(2, "Naam is verplicht"),
  slug: z.string().trim().min(2, "Slug is verplicht"),
  description: z.string().trim().max(240).optional().or(z.literal("")),
  iconEmoji: z.string().trim().min(1).max(4).optional().or(z.literal("")),
});

const createLandingPageSchema = z.object({
  action: z.literal("create_landing_page"),
  title: z.string().trim().min(2, "Titel is verplicht"),
  slug: z.string().trim().min(2, "Slug is verplicht"),
  headline: z.string().trim().max(140).optional().or(z.literal("")),
  subheadline: z.string().trim().max(320).optional().or(z.literal("")),
});

const createOfferSchema = z.object({
  action: z.literal("create_offer"),
  title: z.string().trim().min(2, "Titel is verplicht"),
  slug: z.string().trim().min(2, "Slug is verplicht"),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  pricingType: z.enum(["one_time", "subscription", "payment_plan"]).default("one_time"),
  priceEuros: z.string().trim().min(1, "Prijs is verplicht"),
  courseIds: z.array(z.string()).default([]),
});

const publishOfferSchema = z.object({
  action: z.literal("publish_offer"),
});

const publishLandingPageSchema = z.object({
  action: z.literal("publish_landing_page"),
});

const publishCourseSchema = z.object({
  action: z.literal("publish_course"),
});

const grantAccessSchema = z.object({
  action: z.literal("grant_access"),
});

const createStarterSetupSchema = z.object({
  action: z.literal("create_starter_setup"),
});

const actionSchema = z.discriminatedUnion("action", [
  createCourseSchema,
  inviteMemberSchema,
  createSpaceSchema,
  createLandingPageSchema,
  createOfferSchema,
  publishCourseSchema,
  grantAccessSchema,
  publishOfferSchema,
  publishLandingPageSchema,
  createStarterSetupSchema,
]);

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

async function requireTenantAdmin() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN") || !user.tenantId) {
    return null;
  }
  return user;
}

async function getLatestEntityIdForTenant(
  tenantId: string,
  action: string,
  metadataKey: string
) {
  const latestLog = await db.auditLog.findFirst({
    where: {
      tenantId,
      action,
    },
    orderBy: { createdAt: "desc" },
  });

  const value = (latestLog?.metadata as Record<string, unknown> | undefined)?.[metadataKey];
  return typeof value === "string" ? value : null;
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireTenantAdmin();
    if (!user) {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }
    const tenantId = user.tenantId!;

    const body = actionSchema.parse(await request.json());

    if (body.action === "create_starter_setup") {
      const existingCounts = await Promise.all([
        db.auditLog.count({ where: { tenantId, action: "course.created" } }),
        db.auditLog.count({ where: { tenantId, action: "space.created" } }),
        db.auditLog.count({ where: { tenantId, action: "offer.created" } }),
        db.auditLog.count({ where: { tenantId, action: "landing_page.created" } }),
        db.form.count({ where: { tenantId } }),
      ]);

      let createdCourseId: string | null = null;
      let createdOfferId: string | null = null;
      let createdSpaceId: string | null = null;
      let createdLandingPageId: string | null = null;

      if (existingCounts[0] === 0) {
        const courseSlug = slugify(`${tenantId}-startprogramma`);
        const course = await db.$transaction(async (tx) => {
          const createdCourse = await tx.course.create({
            data: {
              title: "Startprogramma",
              slug: courseSlug,
              description:
                "Een helder starterstraject om je klanten welkom te heten en meteen de eerste stappen te laten zetten.",
              isPublished: false,
              isPrivate: false,
              hasCommunity: true,
            },
          });

          const starterModule = await tx.module.create({
            data: {
              courseId: createdCourse.id,
              title: "Welkom & eerste stap",
              description: "Start met de onboarding, verwachtingen en je eerste concrete opdracht.",
              position: 0,
            },
          });

          await tx.lesson.create({
            data: {
              moduleId: starterModule.id,
              title: "Welkom in je traject",
              content:
                "Welkom in je traject. Gebruik deze eerste les om de klantreis uit te leggen, de eerste opdracht te geven en leden naar de juiste community space te sturen.",
              position: 0,
            },
          });

          return createdCourse;
        });

        createdCourseId = course.id;
        await createAuditLog("course.created", user.id, { courseId: course.id, source: "starter_setup" }, undefined, tenantId);
        await createAuditLog("module.created", user.id, { courseId: course.id, source: "starter_setup" }, undefined, tenantId);
        await createAuditLog("lesson.created", user.id, { courseId: course.id, source: "starter_setup" }, undefined, tenantId);
      }

      if (existingCounts[1] === 0) {
        const maxPosition = await db.space.aggregate({ _max: { position: true } });
        const space = await db.space.create({
          data: {
            name: "Algemeen",
            slug: slugify(`${tenantId}-algemeen`),
            description: "De hoofdcommunity voor vragen, wins, support en updates.",
            iconEmoji: "💬",
            isPublic: true,
            isHostOnly: false,
            isActive: true,
            position: (maxPosition._max.position || 0) + 1,
          },
        });

        createdSpaceId = space.id;
        const welcomePost = await createPost(
          user.id,
          space.id,
          null,
          "Welkom in de hoofdcommunity. Deel hier je vragen, kleine wins, obstakels en updates zodat leden en coaches elkaar sneller kunnen helpen."
        );

        await createAuditLog("space.created", user.id, { spaceId: space.id, source: "starter_setup" }, undefined, tenantId);
        await createAuditLog(
          "post.created",
          user.id,
          { postId: welcomePost.id, spaceId: space.id, source: "starter_setup" },
          undefined,
          tenantId
        );
      }

      const courseId =
        createdCourseId ?? (await getLatestEntityIdForTenant(tenantId, "course.created", "courseId"));

      if (existingCounts[2] === 0 && courseId) {
        const offer = await db.offer.create({
          data: {
            title: "Startaanbod",
            slug: slugify(`${tenantId}-startaanbod`),
            description: "Je eerste verkoopbare aanbod met toegang tot het startprogramma.",
            pricingType: "one_time",
            priceCents: 4900,
            isPublished: false,
            courses: {
              create: [{ courseId }],
            },
          },
        });

        createdOfferId = offer.id;
        await createAuditLog(
          "offer.created",
          user.id,
          { offerId: offer.id, source: "starter_setup", courseIds: [courseId] },
          undefined,
          tenantId
        );
      }

      const offerId =
        createdOfferId ?? (await getLatestEntityIdForTenant(tenantId, "offer.created", "offerId"));
      const landingPageId =
        createdLandingPageId ??
        (await getLatestEntityIdForTenant(tenantId, "landing_page.created", "landingPageId"));

      if (existingCounts[3] === 0) {
        const offer =
          typeof offerId === "string"
            ? await db.offer.findUnique({
                where: { id: offerId },
                select: { slug: true, title: true },
              })
            : null;

        const page = await db.landingPage.create({
          data: {
            title: "Welkomspagina",
            slug: slugify(`${tenantId}-welkom`),
            headline: "Jouw traject start hier",
            subheadline:
              "Gebruik deze eerste pagina om helder uit te leggen voor wie je aanbod bedoeld is, wat iemand krijgt en wat de volgende stap is.",
            isPublished: false,
            blocks: [
              {
                type: "heading",
                level: 2,
                text: "Een rustige start voor je klanten",
              },
              {
                type: "text",
                content:
                  "Vertel hier in duidelijke taal wat iemand mag verwachten, welke resultaten centraal staan en waarom nu instappen logisch is.",
              },
              ...(offer
                ? [
                    {
                      type: "cta",
                      label: `Bekijk ${offer.title}`,
                      href: `/offers/${offer.slug}`,
                      primary: true,
                    },
                  ]
                : []),
            ],
          },
        });

        createdLandingPageId = page.id;
        await createAuditLog(
          "landing_page.created",
          user.id,
          { landingPageId: page.id, source: "starter_setup" },
          undefined,
          tenantId
        );
      }

      if (existingCounts[4] === 0) {
        const form = await db.form.create({
          data: {
            tenantId,
            title: "Onboarding vragenlijst",
            slug: slugifyFormValue(`${tenantId}-onboarding-vragenlijst`),
            description: "Een rustige intakeflow voor nieuwe klanten direct na de eerste toegang.",
            status: FormStatus.PUBLISHED,
            introTitle: "Welkom, vertel even waar je nu staat",
            introDescription:
              "Beantwoord deze vragen zodat je coach sneller context heeft en jouw traject meteen goed kan starten.",
            submitButtonLabel: "Mijn intake versturen",
            successTitle: "Intake ontvangen",
            successDescription: "Bedankt. Je antwoorden zijn opgeslagen en je coach kan hiermee verder.",
            isOnboardingForm: true,
            questions: {
              create: [
                {
                  title: "Wat wil je met dit traject het liefst bereiken?",
                  type: "LONG_TEXT",
                  position: 0,
                  isRequired: true,
                },
                {
                  title: "Wat is momenteel je grootste uitdaging?",
                  type: "LONG_TEXT",
                  position: 1,
                  isRequired: true,
                },
                {
                  title: "Hoeveel energie heb je gemiddeld op een weekdag?",
                  type: "MULTIPLE_CHOICE",
                  position: 2,
                  isRequired: true,
                  options: ["Heel laag", "Wisselend", "Redelijk stabiel", "Hoog"],
                },
                {
                  title: "Zijn er aandachtspunten waar je coach rekening mee moet houden?",
                  type: "LONG_TEXT",
                  position: 3,
                  isRequired: false,
                },
              ],
            },
            assignments: {
              create: [
                {
                  tenantId,
                  audienceType: "ROLE",
                  audienceRole: Role.CLIENT,
                  title: "Nieuwe klant intake",
                  isRequired: true,
                  isActive: true,
                },
              ],
            },
          },
        });

        await createAuditLog(
          "form.created",
          user.id,
          { formId: form.id, source: "starter_setup" },
          undefined,
          tenantId
        );
      }

      const publishTargets = await Promise.all([
        createdCourseId
          ? db.course.findUnique({ where: { id: createdCourseId }, select: { id: true, isPublished: true } })
          : null,
        offerId
          ? db.offer.findUnique({ where: { id: offerId }, select: { id: true, isPublished: true } })
          : null,
        landingPageId
          ? db.landingPage.findUnique({
              where: { id: landingPageId },
              select: { id: true, isPublished: true },
            })
          : null,
      ]);

      if (publishTargets[0] && !publishTargets[0].isPublished) {
        await db.course.update({
          where: { id: publishTargets[0].id },
          data: { isPublished: true },
        });
        await createAuditLog(
          "course.updated",
          user.id,
          { courseId: publishTargets[0].id, source: "starter_setup", isPublished: true },
          undefined,
          tenantId
        );
      }

      if (publishTargets[1] && !publishTargets[1].isPublished) {
        await db.offer.update({
          where: { id: publishTargets[1].id },
          data: { isPublished: true },
        });
        await createAuditLog(
          "offer.updated",
          user.id,
          { offerId: publishTargets[1].id, source: "starter_setup", isPublished: true },
          undefined,
          tenantId
        );
      }

      if (publishTargets[2] && !publishTargets[2].isPublished) {
        await db.landingPage.update({
          where: { id: publishTargets[2].id },
          data: { isPublished: true },
        });
        await createAuditLog(
          "landing_page.updated",
          user.id,
          { landingPageId: publishTargets[2].id, source: "starter_setup", isPublished: true },
          undefined,
          tenantId
        );
      }

      return NextResponse.json({
        success: true,
        message:
          "De starter setup staat klaar: basisproduct, community, offer, onboardingformulier en landing page zijn aangemaakt en gepubliceerd waar mogelijk.",
        onboarding: await getAdminOnboardingState(tenantId),
      });
    }

    if (body.action === "create_course") {
      const normalizedSlug = slugify(body.slug);
      if (!normalizedSlug) {
        return NextResponse.json({ error: "Ongeldige slug" }, { status: 400 });
      }

      const existingCourse = await db.course.findUnique({
        where: { slug: normalizedSlug },
        select: { id: true },
      });
      if (existingCourse) {
        return NextResponse.json({ error: "Deze slug is al in gebruik" }, { status: 400 });
      }

      const course = await db.$transaction(async (tx) => {
        const createdCourse = await tx.course.create({
          data: {
            title: body.title.trim(),
            slug: normalizedSlug,
            description: body.description?.trim() || null,
            isPublished: false,
            isPrivate: false,
            hasCommunity: true,
          },
        });

        const starterModule = await tx.module.create({
          data: {
            courseId: createdCourse.id,
            title: "Welkom & start hier",
            description: "Begin met de introductie en ontdek hoe je dit traject het best doorloopt.",
            position: 0,
          },
        });

        await tx.lesson.create({
          data: {
            moduleId: starterModule.id,
            title: "Welkom bij je programma",
            content:
              "Gebruik deze eerste les om je klanten welkom te heten, uit te leggen wat ze mogen verwachten en welke eerste stap je van hen vraagt.",
            position: 0,
          },
        });

        return createdCourse;
      });

      await createAuditLog(
        "course.created",
        user.id,
        { courseId: course.id, source: "onboarding" },
        undefined,
        tenantId
      );
      await createAuditLog(
        "module.created",
        user.id,
        { courseId: course.id, source: "onboarding" },
        undefined,
        tenantId
      );
      await createAuditLog(
        "lesson.created",
        user.id,
        { courseId: course.id, source: "onboarding" },
        undefined,
        tenantId
      );

      return NextResponse.json({
        success: true,
        onboarding: await getAdminOnboardingState(tenantId),
      });
    }

    if (body.action === "publish_course") {
      const latestCourseLog = await db.auditLog.findFirst({
        where: {
          tenantId,
          action: "course.created",
        },
        orderBy: { createdAt: "desc" },
      });

      const courseId = (latestCourseLog?.metadata as Record<string, unknown> | undefined)?.courseId;
      if (typeof courseId !== "string") {
        return NextResponse.json(
          { error: "Er is nog geen cursus om te publiceren." },
          { status: 400 }
        );
      }

      const course = await db.course.findUnique({
        where: { id: courseId },
        include: {
          modules: {
            include: {
              lessons: {
                select: { id: true },
                take: 1,
              },
            },
          },
        },
      });

      if (!course) {
        return NextResponse.json({ error: "Cursus niet gevonden." }, { status: 404 });
      }

      const hasLesson = course.modules.some((module) => module.lessons.length > 0);
      if (!hasLesson) {
        return NextResponse.json(
          { error: "Voeg eerst minstens een les toe aan deze cursus." },
          { status: 400 }
        );
      }

      await db.course.update({
        where: { id: course.id },
        data: { isPublished: true },
      });

      await createAuditLog(
        "course.updated",
        user.id,
        { courseId: course.id, source: "onboarding", isPublished: true },
        undefined,
        tenantId
      );

      return NextResponse.json({
        success: true,
        onboarding: await getAdminOnboardingState(tenantId),
      });
    }

    if (body.action === "grant_access") {
      const [latestOfferLog, latestUserLog] = await Promise.all([
        db.auditLog.findFirst({
          where: {
            tenantId,
            action: "offer.created",
          },
          orderBy: { createdAt: "desc" },
        }),
        db.auditLog.findFirst({
          where: {
            tenantId,
            action: "user.created",
          },
          orderBy: { createdAt: "desc" },
        }),
      ]);

      const offerId = (latestOfferLog?.metadata as Record<string, unknown> | undefined)?.offerId;
      const userId = (latestUserLog?.metadata as Record<string, unknown> | undefined)?.targetUserId;

      if (typeof offerId !== "string" || typeof userId !== "string") {
        return NextResponse.json(
          { error: "Maak eerst een offer en een lid aan voordat je toegang kunt testen." },
          { status: 400 }
        );
      }

      const member = await db.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          role: true,
          tenantId: true,
        },
      });

      if (!member || member.tenantId !== tenantId) {
        return NextResponse.json({ error: "Lid niet gevonden." }, { status: 404 });
      }

      const result = await assignOfferAccessToUser({
        offerId,
        userId: member.id,
      });

      await createAuditLog(
        "offer.access_assigned",
        user.id,
        {
          offerId,
          userId: member.id,
          email: member.email,
          role: member.role,
          createdEnrollments: result.createdEnrollments,
          skippedEnrollments: result.skippedEnrollments,
          source: "onboarding",
        },
        undefined,
        tenantId
      );

      return NextResponse.json({
        success: true,
        onboarding: await getAdminOnboardingState(tenantId),
      });
    }

    if (body.action === "invite_member") {
      const email = body.email.toLowerCase().trim();
      const existingUser = await db.user.findUnique({
        where: { email },
        select: { id: true },
      });
      if (existingUser) {
        return NextResponse.json({ error: "Dit email adres bestaat al." }, { status: 400 });
      }

      const member = await db.user.create({
        data: {
          tenantId,
          email,
          firstName: body.firstName.trim(),
          lastName: body.lastName.trim(),
          role: body.role,
        },
      });

      await createAuditLog(
        "user.created",
        user.id,
        { targetUserId: member.id, email: member.email, source: "onboarding" },
        undefined,
        tenantId
      );

      const registrationToken = await createRegistrationToken(email, {
        accountType: "client",
      });
      const appUrl = process.env.APP_URL || "http://localhost:3000";
      const registrationLink = `${appUrl}/register/complete?token=${registrationToken}`;

      let inviteSent = false;
      try {
        const emailResult = await sendRegistrationEmail(email, registrationToken);
        inviteSent = emailResult.success;
      } catch (error) {
        console.error("Onboarding invite email error:", error);
      }

      return NextResponse.json({
        success: true,
        message: inviteSent
          ? "Lid toegevoegd en activatielink verstuurd."
          : "Lid toegevoegd. De activatielink kon niet per email worden verstuurd.",
        devRegistrationLink:
          process.env.NODE_ENV === "development" ? registrationLink : undefined,
        onboarding: await getAdminOnboardingState(tenantId),
      });
    }

    if (body.action === "create_space") {
      const normalizedSlug = slugify(body.slug);
      if (!normalizedSlug) {
        return NextResponse.json({ error: "Ongeldige slug" }, { status: 400 });
      }

      const existingSpace = await db.space.findUnique({
        where: { slug: normalizedSlug },
        select: { id: true },
      });
      if (existingSpace) {
        return NextResponse.json({ error: "Deze slug is al in gebruik" }, { status: 400 });
      }

      const maxPosition = await db.space.aggregate({
        _max: { position: true },
      });

      const space = await db.space.create({
        data: {
          name: body.name.trim(),
          slug: normalizedSlug,
          description: body.description?.trim() || null,
          iconEmoji: body.iconEmoji?.trim() || "💬",
          isPublic: true,
          isHostOnly: false,
          position: (maxPosition._max.position || 0) + 1,
        },
      });

      const welcomePost = await createPost(
        user.id,
        space.id,
        null,
        `Welkom in ${space.name}. Gebruik deze eerste post om leden te ontvangen, uit te leggen wat ze hier kunnen delen en hoe je wilt dat de community werkt.`
      );

      await createAuditLog(
        "space.created",
        user.id,
        { spaceId: space.id, source: "onboarding" },
        undefined,
        tenantId
      );
      await createAuditLog(
        "post.created",
        user.id,
        { postId: welcomePost.id, spaceId: space.id, source: "onboarding" },
        undefined,
        tenantId
      );
    }

    if (body.action === "create_landing_page") {
      const normalizedSlug = slugify(body.slug);
      if (!normalizedSlug) {
        return NextResponse.json({ error: "Ongeldige slug" }, { status: 400 });
      }

      const existingPage = await db.landingPage.findUnique({
        where: { slug: normalizedSlug },
        select: { id: true },
      });
      if (existingPage) {
        return NextResponse.json({ error: "Deze slug is al in gebruik" }, { status: 400 });
      }

      const latestOfferLog = await db.auditLog.findFirst({
        where: {
          tenantId,
          action: "offer.created",
        },
        orderBy: { createdAt: "desc" },
      });

      const latestOfferId = (latestOfferLog?.metadata as Record<string, unknown> | undefined)?.offerId;
      const latestOffer =
        typeof latestOfferId === "string"
          ? await db.offer.findUnique({
              where: { id: latestOfferId },
              select: { slug: true, title: true },
            })
          : null;

      const defaultBlocks = [
        {
          type: "heading",
          level: 2,
          text: body.headline?.trim() || body.title.trim(),
        },
        {
          type: "text",
          content:
            body.subheadline?.trim() ||
            "Vertel hier helder wat jouw programma oplevert, voor wie het bedoeld is en waarom iemand vandaag wil instappen.",
        },
        ...(latestOffer
          ? [
              {
                type: "cta",
                label: `Bekijk ${latestOffer.title}`,
                href: `/offers/${latestOffer.slug}`,
                primary: true,
              },
            ]
          : []),
      ];

      const page = await db.landingPage.create({
        data: {
          title: body.title.trim(),
          slug: normalizedSlug,
          headline: body.headline?.trim() || body.title.trim(),
          subheadline: body.subheadline?.trim() || null,
          isPublished: false,
          blocks: defaultBlocks,
        },
      });

      await createAuditLog(
        "landing_page.created",
        user.id,
        { landingPageId: page.id, source: "onboarding" },
        undefined,
        tenantId
      );
    }

    if (body.action === "create_offer") {
      const normalizedSlug = slugify(body.slug);
      if (!normalizedSlug) {
        return NextResponse.json({ error: "Ongeldige slug" }, { status: 400 });
      }

      const existingOffer = await db.offer.findUnique({
        where: { slug: normalizedSlug },
        select: { id: true },
      });
      if (existingOffer) {
        return NextResponse.json({ error: "Deze slug is al in gebruik" }, { status: 400 });
      }

      const priceCents = Math.round(Number(body.priceEuros.replace(",", ".")) * 100);
      if (!Number.isFinite(priceCents) || priceCents < 0) {
        return NextResponse.json({ error: "Ongeldige prijs" }, { status: 400 });
      }

      const offer = await db.offer.create({
        data: {
          title: body.title.trim(),
          slug: normalizedSlug,
          description: body.description?.trim() || null,
          pricingType: body.pricingType,
          priceCents,
          billingInterval: body.pricingType === "subscription" ? "monthly" : null,
          isPublished: false,
          courses: {
            create: body.courseIds.map((courseId) => ({ courseId })),
          },
        },
      });

      await createAuditLog(
        "offer.created",
        user.id,
        { offerId: offer.id, source: "onboarding", courseIds: body.courseIds },
        undefined,
        tenantId
      );
    }

    if (body.action === "publish_offer") {
      const latestOfferLog = await db.auditLog.findFirst({
        where: {
          tenantId,
          action: "offer.created",
        },
        orderBy: { createdAt: "desc" },
      });

      const offerId = (latestOfferLog?.metadata as Record<string, unknown> | undefined)?.offerId;
      if (typeof offerId !== "string") {
        return NextResponse.json(
          { error: "Er is nog geen offer om te publiceren." },
          { status: 400 }
        );
      }

      const offer = await db.offer.findUnique({
        where: { id: offerId },
        include: {
          courses: {
            select: { courseId: true },
          },
        },
      });

      if (!offer) {
        return NextResponse.json({ error: "Offer niet gevonden." }, { status: 404 });
      }

      if (offer.courses.length === 0) {
        return NextResponse.json(
          { error: "Koppel eerst minstens een cursus aan dit offer." },
          { status: 400 }
        );
      }

      await db.offer.update({
        where: { id: offer.id },
        data: { isPublished: true },
      });

      await createAuditLog(
        "offer.updated",
        user.id,
        { offerId: offer.id, source: "onboarding", isPublished: true },
        undefined,
        tenantId
      );

      return NextResponse.json({
        success: true,
        onboarding: await getAdminOnboardingState(tenantId),
      });
    }

    if (body.action === "publish_landing_page") {
      const latestPageLog = await db.auditLog.findFirst({
        where: {
          tenantId,
          action: "landing_page.created",
        },
        orderBy: { createdAt: "desc" },
      });

      const landingPageId = (latestPageLog?.metadata as Record<string, unknown> | undefined)
        ?.landingPageId;
      if (typeof landingPageId !== "string") {
        return NextResponse.json(
          { error: "Er is nog geen pagina om te publiceren." },
          { status: 400 }
        );
      }

      const page = await db.landingPage.findUnique({
        where: { id: landingPageId },
        select: {
          id: true,
          title: true,
          headline: true,
          subheadline: true,
          blocks: true,
        },
      });

      if (!page) {
        return NextResponse.json({ error: "Pagina niet gevonden." }, { status: 404 });
      }

      const blocks = Array.isArray(page.blocks) ? page.blocks : [];
      if (!page.headline && blocks.length === 0) {
        return NextResponse.json(
          { error: "Voeg eerst minstens een headline of content toe aan deze pagina." },
          { status: 400 }
        );
      }

      await db.landingPage.update({
        where: { id: page.id },
        data: { isPublished: true },
      });

      await createAuditLog(
        "landing_page.updated",
        user.id,
        { landingPageId: page.id, source: "onboarding", isPublished: true },
        undefined,
        tenantId
      );

      return NextResponse.json({
        success: true,
        onboarding: await getAdminOnboardingState(tenantId),
      });
    }

    return NextResponse.json({
      success: true,
      onboarding: await getAdminOnboardingState(tenantId),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Onboarding action error:", error);
    return NextResponse.json({ error: "Er is iets misgegaan" }, { status: 500 });
  }
}
