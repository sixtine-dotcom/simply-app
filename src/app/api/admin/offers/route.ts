import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAuditLog, getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

const createOfferSchema = z.object({
  title: z.string().trim().min(2, "Titel is verplicht"),
  slug: z.string().trim().min(2, "Slug is verplicht"),
  description: z.string().trim().max(1000).nullable().optional(),
  pricingType: z.enum(["one_time", "subscription", "payment_plan"]),
  priceCents: z.number().int().min(0, "Prijs moet positief zijn"),
  billingInterval: z.enum(["monthly", "yearly"]).nullable().optional(),
  trialDays: z.number().int().min(0).nullable().optional(),
  installmentCount: z.number().int().min(2).nullable().optional(),
  accessDurationDays: z.number().int().min(1).nullable().optional(),
  isPublished: z.boolean().default(false),
  courseIds: z.array(z.string()).default([]),
});

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN")) {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    const createTimeline = () => {
      const formatter = new Intl.DateTimeFormat("nl-BE", {
        month: "short",
      });
      const now = new Date();

      return Array.from({ length: 6 }, (_, index) => {
        const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

        return {
          key,
          label: formatter.format(date),
          leads: 0,
          convertedLeads: 0,
          assignments: 0,
        };
      });
    };

    const getTimelineKey = (value: Date) =>
      `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}`;

    const daysAgo = (days: number) => {
      const date = new Date();
      date.setDate(date.getDate() - days);
      return date;
    };

    const recentLeadThreshold = daysAgo(30);

    const [offers, courses, assignmentStats, recentAssignments, leadStats] = await Promise.all([
      db.offer.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          courses: {
            include: {
              course: {
                select: { id: true, title: true, slug: true },
              },
            },
          },
          assignments: {
            where: { revokedAt: null },
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
            orderBy: { createdAt: "desc" },
            take: 10,
          },
          leads: {
            orderBy: { createdAt: "desc" },
            take: 10,
          },
        },
      }),
      db.course.findMany({
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true, slug: true, isPublished: true },
      }),
      db.offerAssignment.findMany({
        select: {
          offerId: true,
          createdAt: true,
          revokedAt: true,
          _count: {
            select: {
              enrollments: true,
            },
          },
        },
      }),
      db.offerAssignment.findMany({
        orderBy: { updatedAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      db.offerLead.findMany({
        select: {
          offerId: true,
          status: true,
          createdAt: true,
        },
      }),
    ]);

    const statsMap = assignmentStats.reduce<
      Record<
        string,
        {
          activeAssignments: number;
          totalAssignments: number;
          revokedAssignments: number;
          totalEnrollmentsGranted: number;
          leadCount: number;
          newLeadCount: number;
          contactedLeadCount: number;
          convertedLeadCount: number;
          leadsLast30Days: number;
          assignmentsLast30Days: number;
          lastAssignedAt: Date | null;
          lastRevokedAt: Date | null;
          timeline: ReturnType<typeof createTimeline>;
        }
      >
    >((accumulator, assignment) => {
      const current =
        accumulator[assignment.offerId] ||
        {
          activeAssignments: 0,
          totalAssignments: 0,
          revokedAssignments: 0,
          totalEnrollmentsGranted: 0,
          leadCount: 0,
          newLeadCount: 0,
          contactedLeadCount: 0,
          convertedLeadCount: 0,
          leadsLast30Days: 0,
          assignmentsLast30Days: 0,
          lastAssignedAt: null,
          lastRevokedAt: null,
          timeline: createTimeline(),
        };

      current.totalAssignments += 1;
      current.totalEnrollmentsGranted += assignment._count.enrollments;
      if (assignment.createdAt >= recentLeadThreshold) {
        current.assignmentsLast30Days += 1;
      }
      if (assignment.revokedAt) {
        current.revokedAssignments += 1;
        current.lastRevokedAt =
          !current.lastRevokedAt || assignment.revokedAt > current.lastRevokedAt
            ? assignment.revokedAt
            : current.lastRevokedAt;
      } else {
        current.activeAssignments += 1;
      }
      current.lastAssignedAt =
        !current.lastAssignedAt || assignment.createdAt > current.lastAssignedAt
          ? assignment.createdAt
          : current.lastAssignedAt;
      const bucket = current.timeline.find((item) => item.key === getTimelineKey(assignment.createdAt));
      if (bucket) {
        bucket.assignments += 1;
      }

      accumulator[assignment.offerId] = current;
      return accumulator;
    }, {});

    for (const lead of leadStats) {
      const current =
        statsMap[lead.offerId] ||
        {
          activeAssignments: 0,
          totalAssignments: 0,
          revokedAssignments: 0,
          totalEnrollmentsGranted: 0,
          leadCount: 0,
          newLeadCount: 0,
          contactedLeadCount: 0,
          convertedLeadCount: 0,
          leadsLast30Days: 0,
          assignmentsLast30Days: 0,
          lastAssignedAt: null,
          lastRevokedAt: null,
          timeline: createTimeline(),
        };

      current.leadCount += 1;
      if (lead.status === "converted") {
        current.convertedLeadCount += 1;
      } else if (lead.status === "contacted") {
        current.contactedLeadCount += 1;
      } else {
        current.newLeadCount += 1;
      }
      if (lead.createdAt >= recentLeadThreshold) {
        current.leadsLast30Days += 1;
      }

      const bucket = current.timeline.find((item) => item.key === getTimelineKey(lead.createdAt));
      if (bucket) {
        bucket.leads += 1;
        if (lead.status === "converted") {
          bucket.convertedLeads += 1;
        }
      }

      statsMap[lead.offerId] = current;
    }

    const recentAssignmentsMap = recentAssignments.reduce<
      Record<string, typeof recentAssignments>
    >((accumulator, assignment) => {
      if (!accumulator[assignment.offerId]) {
        accumulator[assignment.offerId] = [];
      }
      if (accumulator[assignment.offerId].length < 8) {
        accumulator[assignment.offerId].push(assignment);
      }
      return accumulator;
    }, {});

    const enrichedOffers = offers.map((offer) => {
      const stats = statsMap[offer.id] || {
        activeAssignments: 0,
        totalAssignments: 0,
        revokedAssignments: 0,
        totalEnrollmentsGranted: 0,
        leadCount: 0,
        newLeadCount: 0,
        contactedLeadCount: 0,
        convertedLeadCount: 0,
        leadsLast30Days: 0,
        assignmentsLast30Days: 0,
        lastAssignedAt: null,
        lastRevokedAt: null,
        timeline: createTimeline(),
      };

      const recurringMonthlyValueCents =
        offer.pricingType === "subscription"
          ? stats.activeAssignments *
            (offer.billingInterval === "yearly"
              ? Math.round(offer.priceCents / 12)
              : offer.priceCents)
          : 0;
      const conversionRate =
        stats.leadCount > 0 ? Math.round((stats.convertedLeadCount / stats.leadCount) * 100) : 0;
      const contactRate =
        stats.leadCount > 0
          ? Math.round(
              ((stats.contactedLeadCount + stats.convertedLeadCount) / stats.leadCount) * 100
            )
          : 0;

      return {
        ...offer,
        recentAssignments: recentAssignmentsMap[offer.id] || [],
        stats: {
          ...stats,
          recurringMonthlyValueCents,
          conversionRate,
          contactRate,
        },
      };
    });

    const summary = enrichedOffers.reduce(
      (accumulator, offer) => {
        accumulator.totalOffers += 1;
        if (offer.isPublished) {
          accumulator.publishedOffers += 1;
        }
        accumulator.activeAssignments += offer.stats.activeAssignments;
        accumulator.totalEnrollmentsGranted += offer.stats.totalEnrollmentsGranted;
        accumulator.projectedMonthlyRecurringCents += offer.stats.recurringMonthlyValueCents;
        accumulator.totalLeads += offer.leads.length;
        return accumulator;
      },
      {
        totalOffers: 0,
        publishedOffers: 0,
        activeAssignments: 0,
        totalEnrollmentsGranted: 0,
        projectedMonthlyRecurringCents: 0,
        totalLeads: 0,
      }
    );

    return NextResponse.json({ offers: enrichedOffers, courses, summary });
  } catch (error) {
    console.error("Get offers error:", error);
    return NextResponse.json({ error: "Er is iets misgegaan" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN")) {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    const body = createOfferSchema.parse(await request.json());
    const normalizedSlug = slugify(body.slug);
    if (!normalizedSlug) {
      return NextResponse.json({ error: "Ongeldige slug" }, { status: 400 });
    }

    const existing = await db.offer.findUnique({
      where: { slug: normalizedSlug },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({ error: "Deze slug is al in gebruik" }, { status: 400 });
    }

    if (body.pricingType !== "subscription" && body.billingInterval) {
      return NextResponse.json(
        { error: "Billing interval kan alleen bij subscriptions." },
        { status: 400 }
      );
    }

    if (body.pricingType !== "payment_plan" && body.installmentCount) {
      return NextResponse.json(
        { error: "Termijnen zijn alleen geldig voor payment plans." },
        { status: 400 }
      );
    }

    const offer = await db.offer.create({
      data: {
        title: body.title,
        slug: normalizedSlug,
        description: body.description || null,
        pricingType: body.pricingType,
        priceCents: body.priceCents,
        billingInterval: body.pricingType === "subscription" ? body.billingInterval || "monthly" : null,
        trialDays: body.pricingType === "subscription" ? body.trialDays || null : null,
        installmentCount: body.pricingType === "payment_plan" ? body.installmentCount || null : null,
        accessDurationDays: body.accessDurationDays || null,
        isPublished: body.isPublished,
        courses: {
          create: body.courseIds.map((courseId) => ({
            courseId,
          })),
        },
      },
      include: {
        courses: {
          include: {
            course: {
              select: { id: true, title: true, slug: true },
            },
          },
        },
      },
    });

    await createAuditLog(
      "offer.created",
      user.id,
      {
        offerId: offer.id,
        pricingType: offer.pricingType,
        courseIds: body.courseIds,
      },
      undefined,
      user.tenantId
    );

    return NextResponse.json({ offer }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Create offer error:", error);
    return NextResponse.json({ error: "Er is iets misgegaan" }, { status: 500 });
  }
}
