import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAdminUser("/admin/ai");
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    const sources = await db.aiSource.findMany({
      where: {
        ...(user.tenantId ? { OR: [{ tenantId: user.tenantId }, { tenantId: null }] } : {}),
        ...(type ? { type } : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(sources);
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAdminUser("/admin/ai");
    const { title, content, type, tags } = await req.json();

    if (!title || !content || !type) {
      return NextResponse.json({ error: "Title, content and type are required" }, { status: 400 });
    }

    const source = await db.aiSource.create({
      data: {
        tenantId: user.tenantId,
        title: title.trim(),
        content: content.trim(),
        type,
        tags: Array.isArray(tags) ? tags : [],
        isActive: true,
      },
    });

    return NextResponse.json(source, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
