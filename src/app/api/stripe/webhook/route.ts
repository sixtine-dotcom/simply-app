import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createAuditLog } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  getPlanDefinition,
  markTenantSubscriptionPastDue,
  restoreTenantSubscriptionFromPayment,
} from "@/lib/billing";
import { getPlanFromStripePrice, getStripeClient, isStripeConfigured } from "@/lib/stripe";

export const dynamic = "force-dynamic";

function mapStripeStatus(status: Stripe.Subscription.Status) {
  if (status === "active") return "active";
  if (status === "trialing") return "trialing";
  if (status === "past_due") return "past_due";
  if (status === "canceled" || status === "unpaid" || status === "incomplete_expired") {
    return "cancelled";
  }
  return status;
}

async function syncStripeSubscription(subscription: Stripe.Subscription) {
  const subscriptionItem = subscription.items.data[0];
  const price = subscriptionItem?.price;
  const mappedPlan =
    getPlanFromStripePrice(price?.id) ||
    (subscription.metadata.plan &&
    ["STARTER", "PRO", "ENTERPRISE"].includes(subscription.metadata.plan)
      ? {
          plan: subscription.metadata.plan as "STARTER" | "PRO" | "ENTERPRISE",
          interval: (subscription.metadata.interval as "monthly" | "yearly") || "monthly",
        }
      : null);

  const subscriptionPeriods = subscription as Stripe.Subscription & {
    current_period_start?: number;
    current_period_end?: number;
  };

  const tenantId =
    subscription.metadata.tenantId ||
    (
      await db.tenantSubscription.findFirst({
        where: { stripeSubscriptionId: subscription.id },
        select: { tenantId: true },
      })
    )?.tenantId;

  if (!tenantId || !mappedPlan) {
    return;
  }

  const status = mapStripeStatus(subscription.status);
  const definition = getPlanDefinition(mappedPlan.plan);
  const currentPeriodStart = subscriptionPeriods.current_period_start
    ? new Date(subscriptionPeriods.current_period_start * 1000)
    : null;
  const currentPeriodEnd = subscriptionPeriods.current_period_end
    ? new Date(subscriptionPeriods.current_period_end * 1000)
    : null;
  const existingSubscription = await db.tenantSubscription.findFirst({
    where: { stripeSubscriptionId: subscription.id },
    select: { id: true },
  });

  await db.$transaction(async (tx) => {
    const subscriptionData = {
      tenantId,
      plan: mappedPlan.plan,
      status,
      billingInterval: mappedPlan.interval,
      currency: price?.currency?.toUpperCase() || "EUR",
      priceCents: price?.unit_amount ?? null,
      platformFeePercent: definition.platformFeePercent,
      stripeCustomerId:
        typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id,
      stripeSubscriptionId: subscription.id,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      cancelledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
      currentPeriodStart,
      currentPeriodEnd,
    };

    if (existingSubscription) {
      await tx.tenantSubscription.update({
        where: { id: existingSubscription.id },
        data: subscriptionData,
      });
    } else {
      await tx.tenantSubscription.create({
        data: subscriptionData,
      });
    }

    await tx.tenant.update({
      where: { id: tenantId },
      data: {
        plan: mappedPlan.plan,
        status: status === "cancelled" ? "SUSPENDED" : "ACTIVE",
        trialEndsAt: null,
        suspendedAt: status === "cancelled" ? new Date() : null,
        suspendedReason: status === "cancelled" ? "Stripe subscription is inactief." : null,
      },
    });
  });

  await createAuditLog(
    "tenant.subscription.synced_from_stripe",
    null,
    {
      tenantId,
      stripeSubscriptionId: subscription.id,
      status,
      plan: mappedPlan.plan,
      interval: mappedPlan.interval,
    },
    undefined,
    tenantId
  );
}

export async function POST(request: NextRequest) {
  try {
    if (!isStripeConfigured()) {
      return NextResponse.json({ error: "Stripe is niet geconfigureerd." }, { status: 400 });
    }
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET ontbreekt." }, { status: 400 });
    }

    const stripe = getStripeClient();
    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      return NextResponse.json({ error: "Stripe signature ontbreekt." }, { status: 400 });
    }

    const payload = await request.text();
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await createAuditLog("tenant.subscription.checkout_completed", null, {
          tenantId: session.client_reference_id,
          checkoutSessionId: session.id,
          stripeCustomerId: typeof session.customer === "string" ? session.customer : session.customer?.id,
        }, undefined, session.client_reference_id || undefined);
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice & {
          subscription?: string | Stripe.Subscription | null;
        };
        const stripeSubscriptionId =
          typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;

        if (stripeSubscriptionId) {
          const subscription = await markTenantSubscriptionPastDue(stripeSubscriptionId);
          if (subscription) {
            await createAuditLog("tenant.subscription.payment_failed", null, {
              tenantId: subscription.tenantId,
              stripeSubscriptionId,
              invoiceId: invoice.id,
            }, undefined, subscription.tenantId);
          }
        }
        break;
      }
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice & {
          subscription?: string | Stripe.Subscription | null;
        };
        const stripeSubscriptionId =
          typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;

        if (stripeSubscriptionId) {
          const subscription = await restoreTenantSubscriptionFromPayment(stripeSubscriptionId);
          if (subscription) {
            await createAuditLog("tenant.subscription.payment_recovered", null, {
              tenantId: subscription.tenantId,
              stripeSubscriptionId,
              invoiceId: invoice.id,
            }, undefined, subscription.tenantId);
          }
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await syncStripeSubscription(event.data.object as Stripe.Subscription);
        break;
      }
      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook verwerking mislukt" },
      { status: 400 }
    );
  }
}
