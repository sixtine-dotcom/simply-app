import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  exportCommunityQuestionInsightsAsCsv,
  exportCommunityQuestionInsightsAsMarkdown,
  getCommunityQuestionInsights,
} from "@/lib/community-question-insights";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN")) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { id } = await params;
    const insights = await getCommunityQuestionInsights(id);

    if (!insights) {
      return NextResponse.json({ error: "Space not found" }, { status: 404 });
    }

    const format = request.nextUrl.searchParams.get("format");
    if (format === "markdown") {
      return new NextResponse(exportCommunityQuestionInsightsAsMarkdown(insights), {
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": `attachment; filename="${insights.space.slug}-questions.md"`,
        },
      });
    }

    if (format === "csv") {
      return new NextResponse(exportCommunityQuestionInsightsAsCsv(insights), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${insights.space.slug}-questions.csv"`,
        },
      });
    }

    return NextResponse.json({ insights });
  } catch (error) {
    console.error("Get community question insights error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
