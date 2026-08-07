import Stripe from "stripe";
import { getPlanDefinition } from "@/lib/billing";

const APP_URL = process.env.APP_URL || "http://localhost:3000";

let stripeClient: Stripe | null = null;

export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getStripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY ontbreekt.");
  }

  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  }

  return stripeClient;
}

function getPriceEnvKey(plan: "STARTER" | "PRO" | "ENTERPRISE", interval: "monthly" | "yearly") {
  return `STRIPE_PRICE_${plan}_${interval.toUpperCase()}` as const;
}

export function getStripePriceId(plan: "STARTER" | "PRO" | "ENTERPRISE", interval: "monthly" | "yearly") {
  const envKey = getPriceEnvKey(plan, interval);
  const priceId = process.env[envKey];
  if (!priceId) {
    throw new Error(`${envKey} ontbreekt.`);
  }
  return priceId;
}

export function getPlanFromStripePrice(priceId: string | null | undefined) {
  if (!priceId) return null;

  for (const plan of ["STARTER", "PRO", "ENTERPRISE"] as const) {
    for (const interval of ["monthly", "yearly"] as const) {
      if (process.env[getPriceEnvKey(plan, interval)] === priceId) {
        return { plan, interval };
      }
    }
  }

  return null;
}

export async function createStripeCheckoutSession(input: {
  tenantId: string;
  tenantName: string;
  email: string;
  plan: "STARTER" | "PRO" | "ENTERPRISE";
  interval: "monthly" | "yearly";
  existingCustomerId?: string | null;
}) {
  const stripe = getStripeClient();
  const definition = getPlanDefinition(input.plan);
  const priceId = getStripePriceId(input.plan, input.interval);

  return stripe.checkout.sessions.create({
    mode: "subscription",
    customer: input.existingCustomerId || undefined,
    customer_email: input.existingCustomerId ? undefined : input.email,
    billing_address_collection: "required",
    allow_promotion_codes: true,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${APP_URL}/admin/billing?checkout=success`,
    cancel_url: `${APP_URL}/admin/billing?checkout=cancelled`,
    client_reference_id: input.tenantId,
    automatic_tax: { enabled: true },
    tax_id_collection: { enabled: true },
    metadata: {
      tenantId: input.tenantId,
      tenantName: input.tenantName,
      plan: input.plan,
      interval: input.interval,
      platformFeePercent: String(definition.platformFeePercent),
    },
    subscription_data: {
      metadata: {
        tenantId: input.tenantId,
        plan: input.plan,
        interval: input.interval,
        platformFeePercent: String(definition.platformFeePercent),
      },
    },
  });
}

export async function createStripeBillingPortalSession(customerId: string) {
  const stripe = getStripeClient();
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${APP_URL}/admin/billing`,
  });
}
