import { NextResponse } from "next/server";
import { logout, getCurrentUser, createAuditLog } from "@/lib/auth";

export async function POST() {
  try {
    const user = await getCurrentUser();
    
    if (user) {
      await createAuditLog("auth.logout", user.id);
    }

    await logout();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan" },
      { status: 500 }
    );
  }
}
