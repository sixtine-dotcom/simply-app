import { NextRequest, NextResponse } from "next/server";
import { processBillingDunning } from "@/lib/billing";
import { db } from "@/lib/db";
import { sendBillingReminderEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const secret = request.nextUrl.searchParams.get("secret");
    const expected = process.env.CRON_SECRET;
    if (expected && secret !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const preview = await db.tenantSubscription.findMany({
      where: {
        status: "past_due",
        pastDueStartedAt: { not: null },
      },
      include: {
        tenant: true,
      },
    });

    for (const subscription of preview) {
      if (!subscription.pastDueStartedAt) continue;

      const ageInDays = Math.floor(
        (Date.now() - subscription.pastDueStartedAt.getTime()) / (24 * 60 * 60 * 1000)
      );

      const reminderDay =
        ageInDays >= 7 && !subscription.dunningReminder7SentAt
          ? 7
          : ageInDays >= 4 && !subscription.dunningReminder4SentAt
            ? 4
            : ageInDays >= 1 && !subscription.dunningReminder1SentAt
              ? 1
              : null;

      if (!reminderDay) continue;

      const admins = await db.user.findMany({
        where: {
          tenantId: subscription.tenantId,
          role: { in: ["ADMIN", "SUPPORT"] },
          deletedAt: null,
        },
        select: {
          email: true,
          firstName: true,
        },
      });

      for (const admin of admins) {
        await sendBillingReminderEmail({
          email: admin.email,
          firstName: admin.firstName,
          tenantName: subscription.tenant.name,
          day: reminderDay as 1 | 4 | 7,
        });
      }
    }

    const result = await processBillingDunning();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("Billing dunning cron error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan" },
      { status: 500 }
    );
  }
}
