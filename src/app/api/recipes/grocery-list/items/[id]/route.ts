import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { isChecked } = body;

    // Verify user owns the list
    const item = await db.groceryItem.findUnique({
      where: { id },
      include: {
        groceryList: {
          select: { userId: true },
        },
      },
    });

    if (!item || item.groceryList.userId !== user.id) {
      return NextResponse.json(
        { error: "Geen toegang" },
        { status: 403 }
      );
    }

    const updated = await db.groceryItem.update({
      where: { id },
      data: { isChecked },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update grocery item error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan" },
      { status: 500 }
    );
  }
}
