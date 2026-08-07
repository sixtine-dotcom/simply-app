import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatFormAnswerValue } from "@/lib/forms";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN" && user.role !== "SUPERADMIN" || !user.tenantId) return null;
  return user;
}

function toCsvRow(values: string[]) {
  return values
    .map((value) => `"${value.replace(/"/g, '""')}"`)
    .join(",");
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin();
    if (!user) {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    const { id } = await params;
    const format = request.nextUrl.searchParams.get("format") || "json";

    const form = await db.form.findFirst({
      where: {
        id,
        tenantId: user.tenantId!,
      },
      include: {
        questions: {
          orderBy: { position: "asc" },
          select: {
            id: true,
            title: true,
          },
        },
        responses: {
          orderBy: { updatedAt: "desc" },
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            assignment: {
              select: {
                title: true,
                audienceType: true,
                isRequired: true,
                dueAt: true,
              },
            },
            answers: {
              include: {
                question: {
                  select: {
                    id: true,
                    title: true,
                  },
                },
              },
              orderBy: {
                question: {
                  position: "asc",
                },
              },
            },
          },
        },
      },
    });

    if (!form) {
      return NextResponse.json({ error: "Formulier niet gevonden" }, { status: 404 });
    }

    const rows = form.responses.map((response) => {
      const answerMap = new Map(
        response.answers.map((answer) => [answer.questionId, formatFormAnswerValue(answer.value)])
      );

      return {
        id: response.id,
        status: response.status,
        submittedAt: response.submittedAt,
        updatedAt: response.updatedAt,
        assignmentTitle: response.assignment?.title || null,
        assignmentAudienceType: response.assignment?.audienceType || null,
        assignmentRequired: response.assignment?.isRequired || false,
        assignmentDueAt: response.assignment?.dueAt || null,
        user: response.user,
        answers: form.questions.map((question) => ({
          questionId: question.id,
          questionTitle: question.title,
          value: answerMap.get(question.id) || "",
        })),
      };
    });

    if (format === "csv") {
      const headers = [
        "response_id",
        "status",
        "submitted_at",
        "updated_at",
        "assignment_title",
        "assignment_audience_type",
        "assignment_required",
        "assignment_due_at",
        "user_name",
        "user_email",
        ...form.questions.map((question) => question.title),
      ];

      const csv = [
        toCsvRow(headers),
        ...rows.map((row) =>
          toCsvRow([
            row.id,
            row.status,
            row.submittedAt ? row.submittedAt.toISOString() : "",
            row.updatedAt.toISOString(),
            row.assignmentTitle || "",
            row.assignmentAudienceType || "",
            row.assignmentRequired ? "yes" : "no",
            row.assignmentDueAt ? row.assignmentDueAt.toISOString() : "",
            `${row.user.firstName ?? ""} ${row.user.lastName ?? ""}`.trim(),
            row.user.email,
            ...row.answers.map((answer) => answer.value),
          ])
        ),
      ].join("\n");

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename=\"${form.slug}-responses.csv\"`,
        },
      });
    }

    return NextResponse.json({
      form: {
        id: form.id,
        title: form.title,
        slug: form.slug,
      },
      responses: rows,
    });
  } catch (error) {
    console.error("Export form responses error:", error);
    return NextResponse.json({ error: "Er is iets misgegaan" }, { status: 500 });
  }
}
