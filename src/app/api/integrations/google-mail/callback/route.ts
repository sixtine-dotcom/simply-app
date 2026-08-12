import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectGoogleMail } from "@/lib/google-mail";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  if (!user || !["ADMIN", "SUPERADMIN"].includes(user.role) || !code || !state) return NextResponse.redirect(new URL("/admin/email-campaigns?google=failed", request.url));
  try {
    const parsed = JSON.parse(Buffer.from(state, "base64url").toString("utf8")) as { userId?: string; at?: number };
    if (parsed.userId !== user.id || !parsed.at || Date.now() - parsed.at > 10 * 60_000) throw new Error("Ongeldige OAuth state");
    const connection = await connectGoogleMail(user.id, code);
    if (connection.accountName?.toLowerCase() !== "sixtine@simplyinbalance.com") {
      await (await import("@/lib/db")).db.integrationConnection.delete({ where: { id: connection.id } });
      return NextResponse.redirect(new URL("/admin/email-campaigns?google=wrong-account", request.url));
    }
    return NextResponse.redirect(new URL("/admin/email-campaigns?google=connected", request.url));
  } catch (error) {
    console.error("Google mail callback error:", error);
    return NextResponse.redirect(new URL("/admin/email-campaigns?google=failed", request.url));
  }
}
