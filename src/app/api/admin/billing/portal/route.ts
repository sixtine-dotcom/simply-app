import { NextResponse } from "next/server";
import { createAuditLog, getCurrentUser } from "@/lib/auth";
import { createStripeBillingPortalSession, isStripeConfigured } from "@/lib/stripe";
import { getTenantBillingSnapshot } from "@/lib/billing";

async function requireTenantAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN" && user.role !== "SUPERADMIN" || !user.tenantId) {
    return null;
  }
  return user;
}

export async function POST() {
  try {
    const user = await requireTenantAdmin();
    if (!user) {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }
    if (!isStripeConfigured()) {
      return NextResponse.json({ error: "Stripe is nog niet geconfigureerd." }, { status: 400 });
    }

    const billing = await getTenantBillingSnapshot(user.tenantId!);
    const customerId = billing?.activeSubscription?.stripeCustomerId;
    if (!customerId) {
      return NextResponse.json(
        { error: "Er is nog geen Stripe-klant gekoppeld aan deze tenant." },
        { status: 400 }
      );
    }

    const portalSession = await createStripeBillingPortalSession(customerId);

    await createAuditLog(
      "tenant.subscription.portal_opened",
      user.id,
      { tenantId: user.tenantId, customerId },
      undefined,
      user.tenantId
    );

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Er is iets misgegaan" },
      { status: 500 }
    );
  }
}
