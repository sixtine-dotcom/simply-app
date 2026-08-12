import { requireAdminUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { CampaignForm } from "./campaign-form";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function EmailCampaignsPage() {
  const user = await requireAdminUser("/admin/email-campaigns");
  const customers = await db.user.findMany({ where: { tenantId: user.tenantId, role: "CLIENT", deletedAt: null, marketingConsent: true }, orderBy: [{ firstName: "asc" }, { lastName: "asc" }], select: { email: true, firstName: true, lastName: true } });
  const googleMail = await db.integrationConnection.findUnique({ where: { userId_provider: { userId: user.id, provider: "google_mail" } }, select: { accountName: true } });
  return <div className="p-4 md:p-6"><div className="mx-auto max-w-6xl"><div className="mb-5 flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-xl font-semibold">E-mailcampagnes</h1><p className="mt-1 text-sm text-muted-foreground">Shopify-klanten met nieuwsbrief-toestemming worden automatisch aan deze lijst toegevoegd.</p></div><Button asChild variant={googleMail ? "outline" : "default"}><Link href="/api/integrations/google-mail/connect">{googleMail ? `Google gekoppeld: ${googleMail.accountName}` : "Google e-mail koppelen"}</Link></Button></div><CampaignForm customers={customers} adminEmail={user.email} /></div></div>;
}
