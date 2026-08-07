import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import { syncCourseKnowledgeSources } from "@/lib/ai";

export async function POST() {
  try {
    const user = await requireAdminUser("/admin/ai");
    const result = await syncCourseKnowledgeSources(user.tenantId);

    return NextResponse.json(result);
  } catch (error) {
    console.error("AI course sync failed:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
