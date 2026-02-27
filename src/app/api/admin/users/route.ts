import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser, createAuditLog } from "@/lib/auth";
import { db } from "@/lib/db";

const createUserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(["ADMIN", "COACH", "CLIENT", "SUPPORT"]).default("CLIENT"),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }
    const body = await request.json();
    const data = createUserSchema.parse(body);
    const email = data.email.toLowerCase().trim();
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "Dit email adres bestaat al." },
        { status: 400 }
      );
    }
    const newUser = await db.user.create({
      data: {
        email,
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        role: data.role,
      },
    });
    await createAuditLog("user.created", user.id, {
      targetUserId: newUser.id,
      email: newUser.email,
    });
    return NextResponse.json(newUser);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error("Create user error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || (user.role !== "ADMIN" && user.role !== "COACH")) {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");

    const where: any = {
      deletedAt: null,
    };

    if (role) {
      where.role = role;
    }

    const users = await db.user.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        avatarUrl: true,
      },
      orderBy: { firstName: "asc" },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Get users error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan" },
      { status: 500 }
    );
  }
}
