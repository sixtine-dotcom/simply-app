import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  buildInvoiceHtml,
  buildInvoicesCsv,
  getTenantBillingInvoiceData,
} from "@/lib/billing";

async function requireTenantAdmin() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN") || !user.tenantId) {
    return null;
  }
  return user;
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireTenantAdmin();
    if (!user) {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    const data = await getTenantBillingInvoiceData(user.tenantId!);
    if (!data) {
      return NextResponse.json({ error: "Tenant niet gevonden" }, { status: 404 });
    }

    const format = request.nextUrl.searchParams.get("format") || "csv";
    if (format === "html") {
      const html = buildInvoiceHtml({
        tenantName: data.tenant.name,
        profile: data.profile,
        invoices: data.invoices,
      });
      return new NextResponse(html, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": 'attachment; filename="facturen.html"',
        },
      });
    }

    return new NextResponse(buildInvoicesCsv(data.invoices), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="facturen.csv"',
      },
    });
  } catch (error) {
    console.error("Export invoices error:", error);
    return NextResponse.json({ error: "Er is iets misgegaan" }, { status: 500 });
  }
}
