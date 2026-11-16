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
  if (!plan?.fileUrl) return NextResponse.json({ error: "Voedingsschema niet beschikbaar" }, { status: 404 });

  try {
    const sourceUrl = plan.fileUrl.startsWith("/")
      ? new URL(plan.fileUrl, request.nextUrl.origin).toString()
      : plan.fileUrl;
    const source = await fetch(sourceUrl, { cache: "no-store" });
    if (!source.ok) return NextResponse.json({ error: "Het schema kon niet worden geladen. Probeer het opnieuw." }, { status: 502 });

    const fileName = (plan.displayFileName || "Voedingsschema.pdf").replace(/[\r\n]/g, "");
    const fallbackName = fileName.replace(/[^\x20-\x7e]/g, "_").replace(/[\\"]/g, "_");
    const encodedName = encodeURIComponent(fileName).replace(/['()*]/g, character => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
    return new NextResponse(await source.arrayBuffer(), {
      headers: {
        "Content-Type": source.headers.get("content-type") || "application/pdf",
        "Content-Disposition": `attachment; filename="${fallbackName}"; filename*=UTF-8''${encodedName}`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Downloaden lukt momenteel niet. Probeer het opnieuw." }, { status: 502 });
  }
}
