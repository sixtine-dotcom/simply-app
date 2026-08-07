import { db } from "@/lib/db";

type PlanTier = "STARTER" | "PRO" | "ENTERPRISE";
type BillingInterval = "monthly" | "yearly";

export type PlanDefinition = {
  key: PlanTier;
  name: string;
  monthlyPriceCents: number;
  yearlyPriceCents: number;
  memberLimit: number | null;
  storageGb: number | null;
  programLimit: number | null;
  platformFeePercent: number;
  features: string[];
};

export type BillingProfile = {
  companyName: string;
  contactName: string;
  email: string;
  vatNumber: string;
  street: string;
  postalCode: string;
  city: string;
  country: string;
};

export type BillingInvoice = {
  id: string;
  invoiceNumber: string;
  date: Date;
  dueDate: Date;
  plan: PlanTier;
  interval: string | null;
  status: string;
  currency: string;
  subtotalCents: number;
  vatCents: number;
  totalCents: number;
  periodStart: Date | null;
  periodEnd: Date | null;
};

export const PLAN_DEFINITIONS: PlanDefinition[] = [
  {
    key: "STARTER",
    name: "Starter",
    monthlyPriceCents: 4900,
    yearlyPriceCents: 49000,
    memberLimit: 250,
    storageGb: 10,
    programLimit: 3,
    platformFeePercent: 5,
    features: [
      "Tot 250 leden",
      "10 GB opslag",
      "Tot 3 programma's",
      "Community basisfeed",
      "Subdomein",
    ],
  },
  {
    key: "PRO",
    name: "Pro",
    monthlyPriceCents: 12900,
    yearlyPriceCents: 129000,
    memberLimit: 2500,
    storageGb: 100,
    programLimit: null,
    platformFeePercent: 2,
    features: [
      "Tot 2.500 leden",
      "100 GB opslag",
      "Onbeperkte programma's",
      "Custom domain",
      "White-label + email marketing",
    ],
  },
  {
    key: "ENTERPRISE",
    name: "Enterprise",
    monthlyPriceCents: 34900,
    yearlyPriceCents: 349000,
    memberLimit: null,
    storageGb: null,
    programLimit: null,
    platformFeePercent: 0,
    features: [
      "Onbeperkte leden",
      "Custom storage",
      "0% platform fee",
      "Custom CSS + API/webhooks",
      "Dedicated support",
    ],
  },
];

export function getPlanDefinition(plan: PlanTier): PlanDefinition {
  const definition = PLAN_DEFINITIONS.find((entry) => entry.key === plan);
  if (!definition) {
    throw new Error(`Onbekend plan: ${plan}`);
  }
  return definition;
}

export function formatEuroFromCents(cents: number) {
  return new Intl.NumberFormat("nl-BE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

function formatInvoiceDate(date: Date) {
  return date.toLocaleDateString("nl-BE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getBillingProfileFromTenant(
  tenant: {
    name: string;
    settings?: {
      billingCompanyName: string | null;
      billingContactName: string | null;
      billingEmail: string | null;
      billingVatNumber: string | null;
      billingStreet: string | null;
      billingPostalCode: string | null;
      billingCity: string | null;
      billingCountry: string | null;
      emailReplyTo: string | null;
    } | null;
  }
): BillingProfile {
  return {
    companyName: tenant.settings?.billingCompanyName || tenant.name,
    contactName: tenant.settings?.billingContactName || "",
    email: tenant.settings?.billingEmail || tenant.settings?.emailReplyTo || "",
    vatNumber: tenant.settings?.billingVatNumber || "",
    street: tenant.settings?.billingStreet || "",
    postalCode: tenant.settings?.billingPostalCode || "",
    city: tenant.settings?.billingCity || "",
    country: tenant.settings?.billingCountry || "België",
  };
}

function buildInvoiceNumber(subscription: { createdAt: Date; id: string }) {
  const year = subscription.createdAt.getFullYear();
  const month = String(subscription.createdAt.getMonth() + 1).padStart(2, "0");
  return `SIM-${year}${month}-${subscription.id.slice(-6).toUpperCase()}`;
}

function buildInvoiceFromSubscription(subscription: {
  id: string;
  plan: PlanTier;
  status: string;
  billingInterval: string | null;
  currency: string | null;
  priceCents: number | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  createdAt: Date;
}): BillingInvoice {
  const subtotalCents = subscription.priceCents || 0;
  const vatCents = Math.round(subtotalCents * 0.21);
  const date = subscription.currentPeriodStart || subscription.createdAt;
  const dueDate = new Date(date);
  dueDate.setDate(dueDate.getDate() + 14);

  return {
    id: subscription.id,
    invoiceNumber: buildInvoiceNumber(subscription),
    date,
    dueDate,
    plan: subscription.plan,
    interval: subscription.billingInterval,
    status: subscription.status,
    currency: subscription.currency || "EUR",
    subtotalCents,
    vatCents,
    totalCents: subtotalCents + vatCents,
    periodStart: subscription.currentPeriodStart,
    periodEnd: subscription.currentPeriodEnd,
  };
}

function escapeCsv(value: string | number | null) {
  const text = value === null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function addBillingPeriod(startDate: Date, interval: BillingInterval) {
  const nextDate = new Date(startDate);
  if (interval === "yearly") {
    nextDate.setFullYear(nextDate.getFullYear() + 1);
  } else {
    nextDate.setMonth(nextDate.getMonth() + 1);
  }
  return nextDate;
}

export async function getTenantBillingSnapshot(tenantId: string) {
  const now = new Date();
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    include: {
      settings: true,
      subscriptions: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!tenant) {
    return null;
  }

  const activeSubscription =
    tenant.subscriptions.find((subscription) =>
      ["active", "trialing", "past_due"].includes(subscription.status)
    ) || null;

  const pastDueAgeInDays =
    activeSubscription?.pastDueStartedAt
      ? Math.max(
          0,
          Math.floor(
            (now.getTime() - activeSubscription.pastDueStartedAt.getTime()) /
              (24 * 60 * 60 * 1000)
          )
        )
      : null;

  const suspensionDate =
    activeSubscription?.pastDueStartedAt
      ? new Date(activeSubscription.pastDueStartedAt.getTime() + 10 * 24 * 60 * 60 * 1000)
      : null;

  const dunning = activeSubscription
    ? {
        isPastDue: activeSubscription.status === "past_due",
        pastDueStartedAt: activeSubscription.pastDueStartedAt,
        lastPaymentFailureAt: activeSubscription.lastPaymentFailureAt,
        pastDueAgeInDays,
        suspensionDate,
        daysUntilSuspension:
          suspensionDate && activeSubscription.status === "past_due"
            ? Math.max(
                0,
                Math.ceil((suspensionDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
              )
            : null,
        reminders: [
          {
            day: 1,
            sentAt: activeSubscription.dunningReminder1SentAt,
          },
          {
            day: 4,
            sentAt: activeSubscription.dunningReminder4SentAt,
          },
          {
            day: 7,
            sentAt: activeSubscription.dunningReminder7SentAt,
          },
        ],
      }
    : null;

  return {
    tenant,
    activeSubscription,
    dunning,
    billingProfile: getBillingProfileFromTenant(tenant),
    invoices: tenant.subscriptions.map(buildInvoiceFromSubscription),
    plans: PLAN_DEFINITIONS.map((plan) => ({
      ...plan,
      monthlyPriceLabel: formatEuroFromCents(plan.monthlyPriceCents),
      yearlyPriceLabel: formatEuroFromCents(plan.yearlyPriceCents),
    })),
  };
}

export async function updateTenantBillingProfile(
  tenantId: string,
  input: BillingProfile
) {
  return db.tenantSettings.upsert({
    where: { tenantId },
    update: {
      billingCompanyName: input.companyName,
      billingContactName: input.contactName || null,
      billingEmail: input.email || null,
      billingVatNumber: input.vatNumber || null,
      billingStreet: input.street || null,
      billingPostalCode: input.postalCode || null,
      billingCity: input.city || null,
      billingCountry: input.country || null,
    },
    create: {
      tenantId,
      billingCompanyName: input.companyName,
      billingContactName: input.contactName || null,
      billingEmail: input.email || null,
      billingVatNumber: input.vatNumber || null,
      billingStreet: input.street || null,
      billingPostalCode: input.postalCode || null,
      billingCity: input.city || null,
      billingCountry: input.country || null,
    },
  });
}

export async function getTenantBillingInvoiceData(tenantId: string) {
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    include: {
      settings: true,
      subscriptions: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!tenant) return null;

  return {
    tenant,
    profile: getBillingProfileFromTenant(tenant),
    invoices: tenant.subscriptions.map(buildInvoiceFromSubscription),
  };
}

export function buildInvoicesCsv(invoices: BillingInvoice[]) {
  const rows = [
    [
      "factuurnummer",
      "datum",
      "vervaldatum",
      "plan",
      "interval",
      "status",
      "subtotal",
      "btw",
      "totaal",
      "periode_start",
      "periode_einde",
    ],
    ...invoices.map((invoice) => [
      invoice.invoiceNumber,
      formatInvoiceDate(invoice.date),
      formatInvoiceDate(invoice.dueDate),
      invoice.plan,
      invoice.interval || "",
      invoice.status,
      (invoice.subtotalCents / 100).toFixed(2),
      (invoice.vatCents / 100).toFixed(2),
      (invoice.totalCents / 100).toFixed(2),
      invoice.periodStart ? formatInvoiceDate(invoice.periodStart) : "",
      invoice.periodEnd ? formatInvoiceDate(invoice.periodEnd) : "",
    ]),
  ];

  return rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
}

export function buildInvoiceHtml(input: {
  tenantName: string;
  profile: BillingProfile;
  invoices: BillingInvoice[];
  invoiceId?: string;
}) {
  const invoices = input.invoiceId
    ? input.invoices.filter((invoice) => invoice.id === input.invoiceId)
    : input.invoices;

  const invoiceBlocks = invoices
    .map(
      (invoice) => `
        <section class="invoice">
          <div class="row">
            <div>
              <p class="kicker">Factuur</p>
              <h1>${invoice.invoiceNumber}</h1>
              <p>${formatInvoiceDate(invoice.date)} · vervalt op ${formatInvoiceDate(invoice.dueDate)}</p>
            </div>
            <div class="right">
              <strong>Simply</strong>
              <p>Simply in Balance</p>
              <p>noreply@simplyinbalance.com</p>
            </div>
          </div>
          <div class="bill-to">
            <strong>Factureren aan</strong>
            <p>${input.profile.companyName}</p>
            ${input.profile.contactName ? `<p>${input.profile.contactName}</p>` : ""}
            ${input.profile.street ? `<p>${input.profile.street}</p>` : ""}
            <p>${[input.profile.postalCode, input.profile.city].filter(Boolean).join(" ")}</p>
            <p>${input.profile.country}</p>
            ${input.profile.vatNumber ? `<p>BTW: ${input.profile.vatNumber}</p>` : ""}
            ${input.profile.email ? `<p>${input.profile.email}</p>` : ""}
          </div>
          <table>
            <thead>
              <tr>
                <th>Omschrijving</th>
                <th>Periode</th>
                <th class="right">Bedrag</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${invoice.plan}${invoice.interval ? ` · ${invoice.interval}` : ""}</td>
                <td>${
                  invoice.periodStart && invoice.periodEnd
                    ? `${formatInvoiceDate(invoice.periodStart)} - ${formatInvoiceDate(invoice.periodEnd)}`
                    : "—"
                }</td>
                <td class="right">${formatEuroFromCents(invoice.subtotalCents)}</td>
              </tr>
            </tbody>
          </table>
          <div class="totals">
            <p><span>Subtotaal</span><strong>${formatEuroFromCents(invoice.subtotalCents)}</strong></p>
            <p><span>BTW 21%</span><strong>${formatEuroFromCents(invoice.vatCents)}</strong></p>
            <p class="grand"><span>Totaal</span><strong>${formatEuroFromCents(invoice.totalCents)}</strong></p>
          </div>
        </section>
      `
    )
    .join("");

  return `<!DOCTYPE html>
    <html lang="nl">
      <head>
        <meta charset="utf-8" />
        <title>Facturen ${input.tenantName}</title>
        <style>
          body { font-family: Arial, sans-serif; color: #172033; margin: 0; padding: 32px; background: #f7f3ed; }
          .invoice { max-width: 820px; margin: 0 auto 24px; padding: 32px; background: white; border-radius: 18px; page-break-after: always; }
          .row { display: flex; justify-content: space-between; gap: 24px; }
          .right { text-align: right; }
          .kicker { margin: 0 0 8px; color: #5c6f5e; text-transform: uppercase; letter-spacing: 0.08em; font-size: 12px; }
          h1 { margin: 0 0 8px; font-size: 30px; }
          p { margin: 4px 0; color: #5f6570; }
          .bill-to { margin: 32px 0; padding: 18px; background: #f5f7f1; border-radius: 14px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: left; }
          .totals { margin-left: auto; margin-top: 24px; max-width: 280px; }
          .totals p { display: flex; justify-content: space-between; gap: 20px; }
          .grand { padding-top: 12px; border-top: 1px solid #cfd6ca; font-size: 18px; color: #172033; }
        </style>
      </head>
      <body>${invoiceBlocks || "<p>Geen facturen beschikbaar.</p>"}</body>
    </html>`;
}

export async function getPlatformBillingOverview() {
  const now = new Date();
  const [
    subscriptions,
    activeTenants,
    pastDueTenants,
    suspendedTenants,
    trialTenants,
  ] = await Promise.all([
    db.tenantSubscription.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        tenantId: true,
        status: true,
        billingInterval: true,
        priceCents: true,
        pastDueStartedAt: true,
      },
    }),
    db.tenant.count({ where: { status: "ACTIVE" } }),
    db.tenantSubscription.count({ where: { status: "past_due" } }),
    db.tenant.count({ where: { status: "SUSPENDED" } }),
    db.tenant.count({ where: { status: "TRIAL" } }),
  ]);

  return {
    mrrEstimate: estimateMonthlyRecurringRevenue(subscriptions),
    activeTenants,
    pastDueTenants,
    suspendedTenants,
    trialTenants,
    atRiskCount: subscriptions.filter(
      (subscription) =>
        subscription.status === "past_due" &&
        subscription.pastDueStartedAt &&
        now.getTime() - subscription.pastDueStartedAt.getTime() >= 7 * 24 * 60 * 60 * 1000
    ).length,
  };
}

export async function startTenantPaidSubscription(input: {
  tenantId: string;
  plan: PlanTier;
  interval: BillingInterval;
}) {
  const definition = getPlanDefinition(input.plan);
  const now = new Date();
  const currentPeriodEnd = addBillingPeriod(now, input.interval);
  const priceCents =
    input.interval === "yearly"
      ? definition.yearlyPriceCents
      : definition.monthlyPriceCents;

  return db.$transaction(async (tx) => {
    await tx.tenantSubscription.updateMany({
      where: {
        tenantId: input.tenantId,
        status: { in: ["active", "trialing", "past_due"] },
      },
      data: {
        status: "cancelled",
        cancelAtPeriodEnd: false,
        cancelledAt: now,
      },
    });

    const subscription = await tx.tenantSubscription.create({
      data: {
        tenantId: input.tenantId,
        plan: input.plan,
        status: "active",
        billingInterval: input.interval,
        currency: "EUR",
        priceCents,
        platformFeePercent: definition.platformFeePercent,
        currentPeriodStart: now,
        currentPeriodEnd,
      },
    });

    const tenant = await tx.tenant.update({
      where: { id: input.tenantId },
      data: {
        plan: input.plan,
        status: "ACTIVE",
        trialEndsAt: null,
        suspendedAt: null,
        suspendedReason: null,
      },
    });

    return { tenant, subscription };
  });
}

export async function scheduleTenantCancellation(tenantId: string) {
  const now = new Date();

  return db.$transaction(async (tx) => {
    const activeSubscription = await tx.tenantSubscription.findFirst({
      where: {
        tenantId,
        status: { in: ["active", "trialing", "past_due"] },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!activeSubscription) {
      throw new Error("Geen actieve subscription gevonden.");
    }

    const subscription = await tx.tenantSubscription.update({
      where: { id: activeSubscription.id },
      data: {
        cancelAtPeriodEnd: true,
        cancelledAt: now,
      },
    });

    return subscription;
  });
}

export async function resumeTenantSubscription(tenantId: string) {
  return db.$transaction(async (tx) => {
    const activeSubscription = await tx.tenantSubscription.findFirst({
      where: {
        tenantId,
        status: { in: ["active", "trialing", "past_due"] },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!activeSubscription) {
      throw new Error("Geen actieve subscription gevonden.");
    }

    const subscription = await tx.tenantSubscription.update({
      where: { id: activeSubscription.id },
      data: {
        cancelAtPeriodEnd: false,
        cancelledAt: null,
      },
    });

    return subscription;
  });
}

export async function markExpiredTenantSubscriptions(now = new Date()) {
  const expiringSubscriptions = await db.tenantSubscription.findMany({
    where: {
      status: "active",
      cancelAtPeriodEnd: true,
      currentPeriodEnd: { lt: now },
    },
    select: {
      id: true,
      tenantId: true,
    },
  });

  if (expiringSubscriptions.length === 0) {
    return { count: 0 };
  }

  await db.$transaction(async (tx) => {
    await tx.tenantSubscription.updateMany({
      where: {
        id: { in: expiringSubscriptions.map((subscription) => subscription.id) },
      },
      data: {
        status: "cancelled",
      },
    });

    for (const subscription of expiringSubscriptions) {
      await tx.tenant.update({
        where: { id: subscription.tenantId },
        data: {
          status: "SUSPENDED",
          suspendedAt: now,
          suspendedReason: "Subscription verlopen na geplande opzegging.",
        },
      });
    }
  });

  return { count: expiringSubscriptions.length };
}

export function estimateMonthlyRecurringRevenue(input: Array<{
  status: string;
  billingInterval: string | null;
  priceCents: number | null;
}>) {
  return input.reduce((total, subscription) => {
    if (!["active", "trialing", "past_due"].includes(subscription.status)) {
      return total;
    }

    if (!subscription.priceCents) {
      return total;
    }

    if (subscription.billingInterval === "yearly") {
      return total + Math.round(subscription.priceCents / 12);
    }

    return total + subscription.priceCents;
  }, 0);
}

export async function markTenantSubscriptionPastDue(
  stripeSubscriptionId: string,
  occurredAt = new Date()
) {
  const existing = await db.tenantSubscription.findFirst({
    where: { stripeSubscriptionId },
    select: {
      id: true,
      tenantId: true,
      pastDueStartedAt: true,
    },
  });

  if (!existing) {
    return null;
  }

  const subscription = await db.tenantSubscription.update({
    where: { id: existing.id },
    data: {
      status: "past_due",
      lastPaymentFailureAt: occurredAt,
      pastDueStartedAt: existing.pastDueStartedAt ?? occurredAt,
    },
  });

  await db.tenant.update({
    where: { id: existing.tenantId },
    data: {
      status: "ACTIVE",
      suspendedAt: null,
      suspendedReason: null,
    },
  });

  return subscription;
}

export async function restoreTenantSubscriptionFromPayment(
  stripeSubscriptionId: string
) {
  const existing = await db.tenantSubscription.findFirst({
    where: { stripeSubscriptionId },
    select: {
      id: true,
      tenantId: true,
      plan: true,
    },
  });

  if (!existing) {
    return null;
  }

  const subscription = await db.tenantSubscription.update({
    where: { id: existing.id },
    data: {
      status: "active",
      lastPaymentFailureAt: null,
      pastDueStartedAt: null,
      dunningReminder1SentAt: null,
      dunningReminder4SentAt: null,
      dunningReminder7SentAt: null,
    },
  });

  await db.tenant.update({
    where: { id: existing.tenantId },
    data: {
      plan: existing.plan,
      status: "ACTIVE",
      suspendedAt: null,
      suspendedReason: null,
    },
  });

  return subscription;
}

export async function processBillingDunning(now = new Date()) {
  const subscriptions = await db.tenantSubscription.findMany({
    where: {
      status: "past_due",
      pastDueStartedAt: { not: null },
    },
    include: {
      tenant: true,
    },
    orderBy: { pastDueStartedAt: "asc" },
  });

  const results = {
    checked: subscriptions.length,
    remindersSent: 0,
    suspended: 0,
  };

  for (const subscription of subscriptions) {
    if (!subscription.pastDueStartedAt) continue;

    const ageInDays = Math.floor(
      (now.getTime() - subscription.pastDueStartedAt.getTime()) / (24 * 60 * 60 * 1000)
    );

    const admins = await db.user.findMany({
      where: {
        tenantId: subscription.tenantId,
        role: { in: ["ADMIN", "SUPPORT"] },
        deletedAt: null,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
      },
    });

    const reminderDay =
      ageInDays >= 7 && !subscription.dunningReminder7SentAt
        ? 7
        : ageInDays >= 4 && !subscription.dunningReminder4SentAt
          ? 4
          : ageInDays >= 1 && !subscription.dunningReminder1SentAt
            ? 1
            : null;

    if (reminderDay) {
      for (const admin of admins) {
        await db.notification.create({
          data: {
            userId: admin.id,
            type: "billing",
            title:
              reminderDay === 7
                ? "Laatste betalingsherinnering"
                : "Betalingsherinnering",
            body:
              reminderDay === 7
                ? "Werk je betaalmethode vandaag nog bij om schorsing van je platform te voorkomen."
                : `Je platformbetaling staat ${reminderDay} dag(en) open. Werk je betaalmethode bij via billing.`,
            link: "/admin/billing",
          },
        });
      }

      const reminderField =
        reminderDay === 1
          ? "dunningReminder1SentAt"
          : reminderDay === 4
            ? "dunningReminder4SentAt"
            : "dunningReminder7SentAt";

      await db.tenantSubscription.update({
        where: { id: subscription.id },
        data: {
          [reminderField]: now,
        },
      });

      results.remindersSent += admins.length;
    }

    if (ageInDays >= 10 && subscription.tenant.status !== "SUSPENDED") {
      await db.tenant.update({
        where: { id: subscription.tenantId },
        data: {
          status: "SUSPENDED",
          suspendedAt: now,
          suspendedReason: "Onbetaalde subscription langer dan 10 dagen past due.",
        },
      });
      results.suspended += 1;
    }
  }

  return results;
}
