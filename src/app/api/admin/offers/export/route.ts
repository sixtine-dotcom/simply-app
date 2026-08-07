import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

function escapeCsv(value: string | number | null | undefined) {
  const stringValue = value == null ? "" : String(value);
  return `"${stringValue.replace(/"/g, '""')}"`;
}

function formatDate(value: Date | null | undefined) {
  return value ? value.toISOString() : "";
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN")) {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    const type = request.nextUrl.searchParams.get("type");
    const query = request.nextUrl.searchParams.get("query")?.trim() || "";
    const publication = request.nextUrl.searchParams.get("publication");
    const leadStatus = request.nextUrl.searchParams.get("leadStatus");

    const offerWhere = {
      ...(query
        ? {
            OR: [
              { title: { contains: query, mode: "insensitive" as const } },
              { slug: { contains: query, mode: "insensitive" as const } },
            ],
          }
        : {}),
      ...(publication === "live"
        ? { isPublished: true }
        : publication === "draft"
          ? { isPublished: false }
          : {}),
    };

    if (type === "leads") {
      const leads = await db.offerLead.findMany({
        where: {
          ...(leadStatus && ["new", "contacted", "converted"].includes(leadStatus)
            ? { status: leadStatus }
            : {}),
          offer: offerWhere,
        },
        orderBy: { createdAt: "desc" },
        include: {
          offer: {
            select: {
              title: true,
              slug: true,
              pricingType: true,
              priceCents: true,
              billingInterval: true,
              isPublished: true,
            },
          },
        },
      });

      const csv = [
        [
          "offer_title",
          "offer_slug",
          "pricing_type",
          "price_cents",
          "billing_interval",
          "offer_is_published",
          "lead_first_name",
          "lead_last_name",
          "lead_email",
          "lead_status",
          "lead_note",
          "created_at",
          "updated_at",
        ].join(","),
        ...leads.map((lead) =>
          [
            escapeCsv(lead.offer.title),
            escapeCsv(lead.offer.slug),
            escapeCsv(lead.offer.pricingType),
            escapeCsv(lead.offer.priceCents),
            escapeCsv(lead.offer.billingInterval),
            escapeCsv(lead.offer.isPublished ? "yes" : "no"),
            escapeCsv(lead.firstName),
            escapeCsv(lead.lastName),
            escapeCsv(lead.email),
            escapeCsv(lead.status),
            escapeCsv(lead.note),
            escapeCsv(formatDate(lead.createdAt)),
            escapeCsv(formatDate(lead.updatedAt)),
          ].join(",")
        ),
      ].join("\n");

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="offers-leads.csv"',
        },
      });
    }

    if (type === "assignments") {
      const assignments = await db.offerAssignment.findMany({
        where: {
          offer: offerWhere,
        },
        orderBy: { createdAt: "desc" },
        include: {
          offer: {
            include: {
              courses: {
                include: {
                  course: {
                    select: {
                      title: true,
                    },
                  },
                },
              },
            },
          },
          user: {
            select: {
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          enrollments: {
            select: {
              course: {
                select: {
                  title: true,
                },
              },
            },
          },
        },
      });

      const csv = [
        [
          "offer_title",
          "offer_slug",
          "pricing_type",
          "user_email",
          "user_first_name",
          "user_last_name",
          "assignment_status",
          "start_date",
          "end_date",
          "revoked_at",
          "created_at",
          "updated_at",
          "offer_courses",
          "granted_enrollments",
          "enrollment_courses",
        ].join(","),
        ...assignments.map((assignment) =>
          [
            escapeCsv(assignment.offer.title),
            escapeCsv(assignment.offer.slug),
            escapeCsv(assignment.offer.pricingType),
            escapeCsv(assignment.user.email),
            escapeCsv(assignment.user.firstName),
            escapeCsv(assignment.user.lastName),
            escapeCsv(assignment.revokedAt ? "revoked" : "active"),
            escapeCsv(formatDate(assignment.startDate)),
            escapeCsv(formatDate(assignment.endDate)),
            escapeCsv(formatDate(assignment.revokedAt)),
            escapeCsv(formatDate(assignment.createdAt)),
            escapeCsv(formatDate(assignment.updatedAt)),
            escapeCsv(assignment.offer.courses.map((entry) => entry.course.title).join(" | ")),
            escapeCsv(assignment.enrollments.length),
            escapeCsv(
              assignment.enrollments.map((entry) => entry.course.title).join(" | ")
            ),
          ].join(",")
        ),
      ].join("\n");

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="offers-assignments.csv"',
        },
      });
    }

    return NextResponse.json(
      { error: "Ongeldig export type. Gebruik 'leads' of 'assignments'." },
      { status: 400 }
    );
  } catch (error) {
    console.error("Export offers error:", error);
    return NextResponse.json({ error: "Er is iets misgegaan" }, { status: 500 });
  }
}
