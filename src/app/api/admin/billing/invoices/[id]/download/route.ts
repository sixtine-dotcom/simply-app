import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { buildInvoiceHtml, getTenantBillingInvoiceData } from "@/lib/billing";

async function requireTenantAdmin() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN") || !user.tenantId) {
    return null;
  }
  return user;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireTenantAdmin();
    if (!user) {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    const data = await getTenantBillingInvoiceData(user.tenantId!);
    if (!data) {
      return NextResponse.json({ error: "Tenant niet gevonden" }, { status: 404 });
    }

    const invoice = data.invoices.find((entry) => entry.id === id);
    if (!invoice) {
      return NextResponse.json({ error: "Factuur niet gevonden" }, { status: 404 });
    }

    const html = buildInvoiceHtml({
      tenantName: data.tenant.name,
      profile: data.profile,
      invoices: data.invoices,
      invoiceId: id,
    });

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="${invoice.invoiceNumber}.html"`,
      },
    });
  } catch (error) {
    console.error("Download invoice error:", error);
    return NextResponse.json({ error: "Er is iets misgegaan" }, { status: 500 });
  }
}
