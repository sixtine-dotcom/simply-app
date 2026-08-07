import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAuditLog, getCurrentUser } from "@/lib/auth";
import {
  getTenantBillingSnapshot,
  resumeTenantSubscription,
  startTenantPaidSubscription,
  scheduleTenantCancellation,
  updateTenantBillingProfile,
} from "@/lib/billing";
import { isStripeConfigured } from "@/lib/stripe";

const optionalText = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? "" : value),
  z.string().trim().max(240)
);

const billingActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("start_subscription"),
    plan: z.enum(["STARTER", "PRO", "ENTERPRISE"]),
    interval: z.enum(["monthly", "yearly"]),
  }),
  z.object({
    action: z.literal("schedule_cancellation"),
  }),
  z.object({
    action: z.literal("resume_subscription"),
  }),
  z.object({
    action: z.literal("update_billing_profile"),
    companyName: z.string().trim().min(2, "Bedrijfsnaam is verplicht").max(160),
    contactName: optionalText,
    email: z.preprocess(
      (value) => (typeof value === "string" && value.trim() === "" ? "" : value),
      z.union([z.string().trim().email("E-mail is ongeldig"), z.literal("")])
    ),
    vatNumber: optionalText,
    street: optionalText,
    postalCode: optionalText,
    city: optionalText,
    country: optionalText,
  }),
]);

async function requireTenantAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN" && user.role !== "SUPERADMIN" || !user.tenantId) {
    return null;
  }
  return user;
}

export async function GET() {
  try {
    const user = await requireTenantAdmin();
    if (!user) {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    const billing = await getTenantBillingSnapshot(user.tenantId!);
    if (!billing) {
      return NextResponse.json({ error: "Tenant niet gevonden" }, { status: 404 });
    }

    return NextResponse.json({
      billing: {
        ...billing,
        stripeEnabled: isStripeConfigured(),
        canOpenPortal: Boolean(billing.activeSubscription?.stripeCustomerId),
      },
    });
  } catch (error) {
    console.error("Get billing error:", error);
    return NextResponse.json({ error: "Er is iets misgegaan" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireTenantAdmin();
    if (!user) {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    const body = billingActionSchema.parse(await request.json());

    if (body.action === "start_subscription") {
      const result = await startTenantPaidSubscription({
        tenantId: user.tenantId!,
        plan: body.plan,
        interval: body.interval,
      });

      await createAuditLog(
        "tenant.subscription.started",
        user.id,
        {
          tenantId: user.tenantId,
          plan: body.plan,
          interval: body.interval,
        },
        undefined,
        user.tenantId
      );

      return NextResponse.json({ success: true, tenant: result.tenant, subscription: result.subscription });
    }

    if (body.action === "schedule_cancellation") {
      const subscription = await scheduleTenantCancellation(user.tenantId!);
      await createAuditLog(
        "tenant.subscription.cancel_scheduled",
        user.id,
        { tenantId: user.tenantId, subscriptionId: subscription.id },
        undefined,
        user.tenantId
      );
      return NextResponse.json({ success: true, subscription });
    }

    if (body.action === "update_billing_profile") {
      await updateTenantBillingProfile(user.tenantId!, {
        companyName: body.companyName,
        contactName: body.contactName,
        email: body.email,
        vatNumber: body.vatNumber,
        street: body.street,
        postalCode: body.postalCode,
        city: body.city,
        country: body.country || "België",
      });

      await createAuditLog(
        "tenant.billing_profile.updated",
        user.id,
        { tenantId: user.tenantId },
        undefined,
        user.tenantId
      );

      return NextResponse.json({ success: true });
    }

    const subscription = await resumeTenantSubscription(user.tenantId!);
    await createAuditLog(
      "tenant.subscription.resumed",
      user.id,
      { tenantId: user.tenantId, subscriptionId: subscription.id },
      undefined,
      user.tenantId
    );

    return NextResponse.json({ success: true, subscription });
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
