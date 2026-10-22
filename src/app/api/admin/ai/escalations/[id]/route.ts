import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdminUser("/admin/ai/inbox");
    const { id } = await params;
    const { status, resolution, addToKnowledge } = await req.json();
    const item = await db.aiEscalation.findFirst({
      where: { id, ...(admin.tenantId ? { tenantId: admin.tenantId } : {}) },
    });
    if (!item) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });

    const cleanResolution = typeof resolution === "string" ? resolution.trim() : "";
    if (addToKnowledge && cleanResolution) {
      const sourceRef = `ai-escalation:${item.id}`;
      const data = {
        tenantId: item.tenantId,
        title: `FAQ: ${item.question.slice(0, 100)}`,
        content: `Vraag:\n${item.question}\n\nAntwoord van Sixtine:\n${cleanResolution}`,
        type: "qa",
        sourceRef,
        tags: ["faq", "ai-inbox"],
        isActive: true,
      };
      const existing = await db.aiSource.findFirst({ where: { sourceRef, tenantId: item.tenantId } });
      if (existing) await db.aiSource.update({ where: { id: existing.id }, data });
      else await db.aiSource.create({ data });
    }

    const updated = await db.aiEscalation.update({
      where: { id },
      data: {
        status: ["resolved", "dismissed"].includes(status) ? status : item.status,
        resolution: cleanResolution || null,
        resolvedAt: status === "resolved" ? new Date() : item.resolvedAt,
      },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("AI escalation PATCH failed:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
