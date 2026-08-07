import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getTenantBillingInvoiceData } from "@/lib/billing";
import { sendBillingInvoicesEmail } from "@/lib/email";

const APP_URL = process.env.APP_URL || "http://localhost:3000";

async function requireTenantAdmin() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN") || !user.tenantId) {
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

    const data = await getTenantBillingInvoiceData(user.tenantId!);
    if (!data) {
      return NextResponse.json({ error: "Tenant niet gevonden" }, { status: 404 });
    }

    const email = data.profile.email || user.email;
    if (!email) {
      return NextResponse.json(
        { error: "Vul eerst een facturatie e-mailadres in." },
        { status: 400 }
      );
    }

    const result = await sendBillingInvoicesEmail({
      email,
      tenantName: data.tenant.name,
      invoiceCount: data.invoices.length,
      exportUrl: `${APP_URL}/api/admin/billing/invoices/export?format=html`,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "E-mail verzenden mislukt." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Email invoices error:", error);
    return NextResponse.json({ error: "Er is iets misgegaan" }, { status: 500 });
  }
}
