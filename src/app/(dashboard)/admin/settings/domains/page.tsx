import Link from "next/link";
import { CheckCircle2, Globe2, Plus, ShieldAlert } from "lucide-react";
import { requireAdminUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminDomainSettingsPage() {
  const user = await requireAdminUser("/admin/settings/domains");
  const tenant = user.tenantId
    ? await db.tenant.findUnique({
        where: { id: user.tenantId },
        include: { domains: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] } },
      })
    : null;

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <p className="app-kicker">Instellingen</p>
          <h1 className="mt-3 font-display text-3xl tracking-tight text-slate-950 md:text-4xl">
            Domeinnaam
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Bekijk welke domeinen aan je platform gekoppeld zijn en controleer de status.
          </p>
        </div>

        <Card className="app-halo">
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Globe2 className="h-5 w-5 text-primary" />
                  Gekoppelde domeinen
                </CardTitle>
                <CardDescription>
                  Domeinen worden gebruikt om bezoekers naar de juiste tenant te sturen.
                </CardDescription>
              </div>
              <Button asChild variant="outline">
                <Link href="/admin/branding">
                  <Plus className="mr-2 h-4 w-4" />
                  Branding openen
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {tenant?.domains.length ? (
              tenant.domains.map((domain) => (
                <div
                  key={domain.id}
                  className="flex flex-col gap-3 rounded-[22px] border border-white/70 bg-white/75 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium text-slate-950">{domain.domain}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {domain.isPrimary ? "Primair domein" : "Extra domein"}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white px-3 py-1 text-sm text-muted-foreground">
                    {domain.isVerified ? (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    ) : (
                      <ShieldAlert className="h-4 w-4 text-amber-600" />
                    )}
                    {domain.isVerified ? "Geverifieerd" : "DNS controleren"}
                  </span>
                </div>
              ))
            ) : (
              <div className="rounded-[22px] border border-white/70 bg-white/75 p-5 text-sm text-muted-foreground">
                Er zijn nog geen extra domeinen gekoppeld.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
