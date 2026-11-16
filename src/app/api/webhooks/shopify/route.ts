import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { deletionEmailDigest } from "@/lib/account-deletion";
import { createMagicLink, createRegistrationToken, createAuditLog } from "@/lib/auth";
import { syncEnrollmentToRecurringGroupPlans } from "@/lib/coaching";
import { sendRegistrationEmail, sendCourseAccessEmail } from "@/lib/email";

// Verify Shopify webhook signature
function verifyShopifyWebhook(body: string, signature: string): boolean {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  if (!secret) {
    console.error("SHOPIFY_WEBHOOK_SECRET not configured");
    return false;
  }

  const hmac = crypto
    .createHmac("sha256", secret)
    .update(body, "utf8")
    .digest("base64");

  const expected = Buffer.from(hmac);
  const supplied = Buffer.from(signature);
  return expected.length === supplied.length && crypto.timingSafeEqual(expected, supplied);
}

interface ShopifyCustomer {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  accepts_marketing?: boolean;
  email_marketing_consent?: {
    state?: string;
    opt_in_level?: string;
    consent_updated_at?: string;
  };
}

interface ShopifyLineItem {
  product_id: number;
  title: string;
  quantity: number;
  price?: string;
}

interface ShopifyOrder {
  id: number;
  name?: string;
  currency?: string;
  financial_status?: string;
  customer: ShopifyCustomer;
  line_items: ShopifyLineItem[];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("x-shopify-hmac-sha256");
    const topic = request.headers.get("x-shopify-topic");

    // Verify webhook signature
    if (!signature || !verifyShopifyWebhook(body, signature)) {
      console.error("Invalid Shopify webhook signature");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = JSON.parse(body);

    switch (topic) {
      case "orders/paid":
        await handleOrderPaid(payload as ShopifyOrder);
        break;

      case "customers/create":
      case "customers/update":
        await syncShopifyCustomer(payload as ShopifyCustomer);
        break;

      case "orders/cancelled":
      case "orders/refunded":
        await handleOrderCancelled(payload as ShopifyOrder);
        break;

      default:
        console.log(`Unhandled Shopify webhook topic: ${topic}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Shopify webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

function marketingConsentValue(customer: ShopifyCustomer): boolean | null {
  const state = customer.email_marketing_consent?.state?.toUpperCase();
  if (state) return state === "SUBSCRIBED";
  if (typeof customer.accepts_marketing === "boolean") return customer.accepts_marketing;
  return null;
}

function marketingConsentDate(customer: ShopifyCustomer) {
  if (marketingConsentValue(customer) !== true) return null;
  const value = customer.email_marketing_consent?.consent_updated_at;
  if (!value) return new Date();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

async function getShopifyTenantId() {
  const activeTenants = await db.tenant.findMany({
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
    take: 2,
    select: { id: true },
  });
  return activeTenants.length === 1 ? activeTenants[0].id : null;
}

async function syncShopifyCustomer(customer: ShopifyCustomer) {
  if (!customer?.email) return null;
  const email = customer.email.trim().toLowerCase();
  const existing = await db.user.findUnique({ where: { email } });
  // A Shopify address book/newsletter account is not a course purchase.
  if (!existing || existing.deletedAt) return null;
  const tenantId = await getShopifyTenantId();
  const consent = marketingConsentValue(customer);
  const data = {
    firstName: customer.first_name || existing?.firstName || "Klant",
    lastName: customer.last_name || existing?.lastName || "",
    phone: customer.phone || existing?.phone || null,
    shopifyCustomerId: customer.id.toString(),
    ...(consent !== null ? {
      marketingConsent: consent,
      marketingSource: "shopify",
      marketingConsentAt: marketingConsentDate(customer),
    } : {}),
    ...(!existing?.tenantId && tenantId ? { tenantId } : {}),
  };
  return db.user.update({ where: { id: existing.id }, data });
}

async function handleOrderPaid(order: ShopifyOrder) {
  const { customer, line_items } = order;

  if (!customer?.email) {
    console.error("Order has no customer email:", order.id);
    return;
  }

  if (order.financial_status !== "paid") return;
  const email = customer.email.trim().toLowerCase();
  const erased = await db.accountDeletionRequest.findMany({ where: { emailDigest: deletionEmailDigest(email), status: "COMPLETED" }, select: { shopifyOrderIds: true } });
  if (erased.some(record => Array.isArray(record.shopifyOrderIds) && record.shopifyOrderIds.includes(order.id.toString()))) return;
  const mappedItems = (await Promise.all(line_items.map(async (item) => {
    if (!item.product_id) return null;
    const mapping = await db.shopifyProductMapping.findUnique({
      where: { shopifyProductId: item.product_id.toString() },
      include: { course: { select: { title: true, trajectoryStartDate: true, trajectoryEndDate: true } } },
    });
    return mapping ? { item, mapping } : null;
  }))).filter((entry): entry is NonNullable<typeof entry> => entry !== null);
  // Only a paid product mapped to a course may provision an app account.
  if (mappedItems.length === 0) return;

  // De Shopify-shop hoort in deze installatie bij één actieve organisatie.
  // Zonder tenantId kan de klant geen toegewezen intakeformulieren zien.
  const tenantId = await getShopifyTenantId();

  // Find or create user
  let user = await db.user.findUnique({ where: { email } });

  if (user?.deletedAt) return;
  const needsActivation = !user?.lastLoginAt;

  if (!user) {
    user = await db.user.create({
      data: {
        email,
        firstName: customer.first_name || "Klant",
        lastName: customer.last_name || "",
        phone: customer.phone || null,
        shopifyCustomerId: customer.id.toString(),
        ...(marketingConsentValue(customer) !== null ? {
          marketingConsent: marketingConsentValue(customer) === true,
          marketingSource: "shopify",
          marketingConsentAt: marketingConsentDate(customer),
        } : {}),
        role: "CLIENT",
        tenantId,
      },
    });

    await createAuditLog("user.created", user.id, {
      source: "shopify",
      orderId: order.id,
    });
  } else {
    // Link existing user to Shopify customer
    await db.user.update({
      where: { id: user.id },
      data: {
        ...(!user.shopifyCustomerId && { shopifyCustomerId: customer.id.toString() }),
        ...(!user.tenantId && tenantId && { tenantId }),
        ...(marketingConsentValue(customer) !== null ? {
          marketingConsent: marketingConsentValue(customer) === true,
          marketingSource: "shopify",
          marketingConsentAt: marketingConsentDate(customer),
        } : {}),
      },
    });
  }

  // Create access only for products mapped to a course.
  for (const { item, mapping } of mappedItems) {
    if (mapping) {
      const existingEnrollment = await db.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId: user.id,
            courseId: mapping.courseId,
          },
        },
      });

      if (!existingEnrollment) {
        const startDate = mapping.course.trajectoryStartDate || new Date();
        const endDate = mapping.course.trajectoryEndDate || (mapping.accessDays
          ? new Date(startDate.getTime() + mapping.accessDays * 24 * 60 * 60 * 1000)
          : null);

        await db.enrollment.create({
          data: {
            userId: user.id,
            courseId: mapping.courseId,
            startDate,
            endDate,
            shopifyOrderId: order.id.toString(),
            shopifyOrderName: order.name || null,
            shopifyProductId: item.product_id.toString(),
            revenueCents: item.price
              ? Math.round(Number.parseFloat(item.price) * item.quantity * 100)
              : null,
            revenueCurrency: order.currency || null,
          },
        });
        await syncEnrollmentToRecurringGroupPlans({
          userId: user.id,
          courseId: mapping.courseId,
        });

        await createAuditLog("enrollment.created", user.id, {
          courseId: mapping.courseId,
          source: "shopify",
          orderId: order.id,
        });
      }
    }
  }

  // Retry failed emails on webhook replay; successful deliveries are recorded
  // per order so a sequential replay does not send another invitation.
  const mailAction = needsActivation ? "auth.purchase_activation_sent" : "auth.course_access_sent";
  const alreadySent = await db.auditLog.findFirst({
    where: { userId: user.id, action: { in: ["auth.purchase_activation_sent", "auth.course_access_sent"] }, metadata: { path: ["orderId"], equals: order.id.toString() } },
    select: { id: true },
  });
  if (!alreadySent) {
    if (needsActivation) {
      const token = await createRegistrationToken(email, { accountType: "client", source: "shopify_paid", orderId: order.id.toString(), courseIds: mappedItems.map(({ mapping }) => mapping.courseId) });
      const sent = await sendRegistrationEmail(email, token);
      if (!sent.success) throw new Error("Purchase activation email failed; Shopify should retry");
    } else {
      const token = await createMagicLink(email);
      const titles = Array.from(new Set(mappedItems.map(({ mapping }) => mapping.course.title)));
      const sent = await sendCourseAccessEmail(email, user.firstName, token, titles);
      if (!sent.success) throw new Error("Course access email failed; Shopify should retry");
    }
    await createAuditLog(mailAction, user.id, { orderId: order.id.toString() });
  }
}

async function handleOrderCancelled(order: ShopifyOrder) {
  // Find enrollments by order ID and revoke them
  const enrollments = await db.enrollment.findMany({
    where: { shopifyOrderId: order.id.toString() },
  });

  for (const enrollment of enrollments) {
    await db.enrollment.delete({
      where: { id: enrollment.id },
    });

    await createAuditLog("enrollment.revoked", enrollment.userId, {
      courseId: enrollment.courseId,
      reason: "order_cancelled",
      orderId: order.id,
    });
  }
}
