import { requireAdminUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { CampaignForm } from "./campaign-form";

export default async function EmailCampaignsPage() {
  const user = await requireAdminUser("/admin/email-campaigns");
  const customers = await db.user.findMany({ where: { tenantId: user.tenantId, role: "CLIENT", deletedAt: null, marketingConsent: true }, orderBy: [{ firstName: "asc" }, { lastName: "asc" }], select: { email: true, firstName: true, lastName: true } });
  return <div className="p-4 md:p-6"><div className="mx-auto max-w-6xl"><div className="mb-5"><h1 className="text-xl font-semibold">E-mailcampagnes</h1><p className="mt-1 text-sm text-muted-foreground">Shopify-klanten met nieuwsbrief-toestemming worden automatisch aan deze lijst toegevoegd.</p></div><CampaignForm customers={customers} adminEmail={user.email} /></div></div>;
}
