export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getHealthProfileStatus } from "@/lib/health-profile";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Niet ingelogd" },
        { status: 401 }
      );
    }

    const healthProfileStatus =
      user.role === "CLIENT" ? await getHealthProfileStatus(user.id) : { isComplete: true };

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        phone: user.phone,
        role: user.role,
        preferredLanguage: user.preferredLanguage === "en" ? "en" : "nl",
        healthProfileCompleted: healthProfileStatus.isComplete,
        impersonation: user.impersonation ?? null,
      },
    });
  } catch (error) {
    console.error("Get user error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan" },
      { status: 500 }
    );
  }
}
