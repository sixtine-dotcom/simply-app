import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  const { id } = await params;
  const plan = await db.nutritionPlan.findFirst({
    where: { id, userId: user.id, availableAt: { lte: new Date() } },
  });
  if (!plan) return NextResponse.json({ error: "Voedingsschema niet beschikbaar" }, { status: 404 });

  const sourceUrl = plan.fileUrl.startsWith("/")
    ? new URL(plan.fileUrl, request.nextUrl.origin).toString()
    : plan.fileUrl;
  const source = await fetch(sourceUrl);
  if (!source.ok) return NextResponse.json({ error: "PDF kon niet worden geladen" }, { status: 502 });

  const fileName = plan.displayFileName || "Voedingsschema.pdf";
  return new NextResponse(await source.arrayBuffer(), {
    headers: {
      "Content-Type": source.headers.get("content-type") || "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
