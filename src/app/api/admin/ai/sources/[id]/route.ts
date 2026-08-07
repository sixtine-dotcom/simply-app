import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdminUser("/admin/ai");
    const { id } = await params;
    const body = await req.json();

    const source = await db.aiSource.findFirst({
      where: {
        id,
        ...(user.tenantId ? { OR: [{ tenantId: user.tenantId }, { tenantId: null }] } : {}),
      },
    });

    if (!source) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await db.aiSource.update({
      where: { id },
      data: {
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.content !== undefined ? { content: body.content } : {}),
        ...(body.type !== undefined ? { type: body.type } : {}),
        ...(body.tags !== undefined ? { tags: body.tags } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdminUser("/admin/ai");
    const { id } = await params;

    const source = await db.aiSource.findFirst({
      where: {
        id,
        ...(user.tenantId ? { OR: [{ tenantId: user.tenantId }, { tenantId: null }] } : {}),
      },
    });

    if (!source) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await db.aiSource.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
