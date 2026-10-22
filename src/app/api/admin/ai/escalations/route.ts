export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAdminUser("/admin/ai/inbox");
    const status = new URL(req.url).searchParams.get("status") || "open";
    const items = await db.aiEscalation.findMany({
      where: {
        status,
        ...(user.tenantId ? { tenantId: user.tenantId } : {}),
      },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      take: 200,
    });
    return NextResponse.json(items);
  } catch (error) {
    console.error("AI escalations GET failed:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
