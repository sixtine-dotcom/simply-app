import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAuditLog, getCurrentUser } from "@/lib/auth";
import { createStripeCheckoutSession, isStripeConfigured } from "@/lib/stripe";
import { getTenantBillingSnapshot } from "@/lib/billing";

const checkoutSchema = z.object({
  plan: z.enum(["STARTER", "PRO", "ENTERPRISE"]),
  interval: z.enum(["monthly", "yearly"]),
});

async function requireTenantAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN" && user.role !== "SUPERADMIN" || !user.tenantId) {
    return null;
  }
  return user;
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireTenantAdmin();
    if (!user) {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }
    if (!isStripeConfigured()) {
      return NextResponse.json({ error: "Stripe is nog niet geconfigureerd." }, { status: 400 });
    }

    const body = checkoutSchema.parse(await request.json());
    const billing = await getTenantBillingSnapshot(user.tenantId!);
    if (!billing) {
      return NextResponse.json({ error: "Tenant niet gevonden" }, { status: 404 });
    }

    const checkoutSession = await createStripeCheckoutSession({
      tenantId: billing.tenant.id,
      tenantName: billing.tenant.name,
      email: user.email,
      plan: body.plan,
      interval: body.interval,
      existingCustomerId: billing.activeSubscription?.stripeCustomerId || null,
    });

    await createAuditLog(
      "tenant.subscription.checkout_started",
      user.id,
      {
        tenantId: user.tenantId,
        plan: body.plan,
        interval: body.interval,
        checkoutSessionId: checkoutSession.id,
      },
      undefined,
      user.tenantId
    );

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Er is iets misgegaan" },
      { status: 500 }
    );
  }
}
