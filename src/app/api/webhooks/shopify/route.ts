import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { createMagicLink, createAuditLog } from "@/lib/auth";
import { syncEnrollmentToRecurringGroupPlans } from "@/lib/coaching";
import { sendWelcomeEmail, sendCourseAccessEmail } from "@/lib/email";

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

  return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(signature));
}

interface ShopifyCustomer {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
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

async function handleOrderPaid(order: ShopifyOrder) {
  const { customer, line_items } = order;

  if (!customer?.email) {
    console.error("Order has no customer email:", order.id);
    return;
  }

  const email = customer.email.toLowerCase();

  // De Shopify-shop hoort in deze installatie bij één actieve organisatie.
  // Zonder tenantId kan de klant geen toegewezen intakeformulieren zien.
  const activeTenants = await db.tenant.findMany({
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
    take: 2,
    select: { id: true },
  });
  const tenantId = activeTenants.length === 1 ? activeTenants[0].id : null;

  // Find or create user
  let user = await db.user.findUnique({ where: { email } });

  const isNewUser = !user;

  if (!user) {
    user = await db.user.create({
      data: {
        email,
        firstName: customer.first_name || "Klant",
        lastName: customer.last_name || "",
        phone: customer.phone || null,
        shopifyCustomerId: customer.id.toString(),
        role: "CLIENT",
        tenantId,
      },
    });

    await createAuditLog("user.created", user.id, {
      source: "shopify",
      orderId: order.id,
    });
  } else if (!user.shopifyCustomerId || (!user.tenantId && tenantId)) {
    // Link existing user to Shopify customer
    await db.user.update({
      where: { id: user.id },
      data: {
        ...(!user.shopifyCustomerId && { shopifyCustomerId: customer.id.toString() }),
        ...(!user.tenantId && tenantId && { tenantId }),
      },
    });
  }

  // Create enrollments for each product that has a mapping; collect course titles for emails
  const newCourseTitles: string[] = [];
  for (const item of line_items) {
    const mapping = await db.shopifyProductMapping.findUnique({
      where: { shopifyProductId: item.product_id.toString() },
      include: {
        course: {
          select: { title: true, trajectoryStartDate: true, trajectoryEndDate: true },
        },
      },
    });

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

        newCourseTitles.push(mapping.course.title);

        await createAuditLog("enrollment.created", user.id, {
          courseId: mapping.courseId,
          source: "shopify",
          orderId: order.id,
        });
      }
    }
  }

  // Emails: new user → welcome met cursus; bestaande user met nieuwe toegang → course access
  if (isNewUser && newCourseTitles.length > 0) {
    const token = await createMagicLink(email);
    await sendWelcomeEmail(email, user.firstName, token, { courseTitles: newCourseTitles });
  } else if (isNewUser) {
    const token = await createMagicLink(email);
    await sendWelcomeEmail(email, user.firstName, token);
  } else if (newCourseTitles.length > 0) {
    const token = await createMagicLink(email);
    await sendCourseAccessEmail(email, user.firstName, token, newCourseTitles);
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
