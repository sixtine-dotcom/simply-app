import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { createAuditLog, getCurrentUser } from "@/lib/auth";

const addMembersSchema = z.object({
  emails: z.array(z.string().email()).min(1, "Add at least one valid email address"),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN")) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { id } = await params;
    const members = await db.spaceMember.findMany({
      where: { spaceId: id },
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            createdAt: true,
          },
        },
      },
    });

    return NextResponse.json({ members });
  } catch (error) {
    console.error("Get space members error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN")) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { id } = await params;
    const body = addMembersSchema.parse(await request.json());

    const space = await db.space.findUnique({
      where: { id },
      select: { id: true, name: true },
    });
    if (!space) {
      return NextResponse.json({ error: "Space not found" }, { status: 404 });
    }

    const users = await db.user.findMany({
      where: {
        email: {
          in: body.emails.map((email) => email.trim().toLowerCase()),
        },
        deletedAt: null,
      },
      select: {
        id: true,
        email: true,
      },
    });

    if (users.length === 0) {
      return NextResponse.json(
        { error: "No existing users were found for these email addresses." },
        { status: 400 }
      );
    }

    let added = 0;
    let skipped = 0;

    for (const targetUser of users) {
      const existing = await db.spaceMember.findUnique({
        where: {
          userId_spaceId: {
            userId: targetUser.id,
            spaceId: space.id,
          },
        },
        select: { id: true },
      });

      if (existing) {
        skipped += 1;
        continue;
      }

      await db.spaceMember.create({
        data: {
          userId: targetUser.id,
          spaceId: space.id,
        },
      });
      added += 1;
    }

    await createAuditLog(
      "space.members_added",
      user.id,
      {
        spaceId: space.id,
        emails: body.emails,
        added,
        skipped,
      },
      undefined,
      user.tenantId
    );

    return NextResponse.json({
      success: true,
      added,
      skipped,
      matchedUsers: users.length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Add space members error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
