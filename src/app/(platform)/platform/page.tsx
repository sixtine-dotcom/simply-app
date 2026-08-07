import Link from "next/link";
import { db } from "@/lib/db";
import { formatEuroFromCents, getPlatformBillingOverview } from "@/lib/billing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Building2, Users, Euro, Shield } from "lucide-react";

export default async function PlatformDashboardPage() {
  const [tenantCount, usersTotal, billingOverview] =
    await Promise.all([
      db.tenant.count(),
      db.user.count(),
      getPlatformBillingOverview(),
    ]);

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="app-panel app-halo mb-8 overflow-hidden">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="app-kicker">Control plane</p>
            <h1 className="mt-3 font-display text-3xl tracking-tight text-slate-950 md:text-5xl">
              SuperAdmin Dashboard
            </h1>
            <p className="mt-3 text-muted-foreground">
              Platform-overzicht over alle tenants en gebruik.
            </p>
          </div>
          <Button asChild>
            <Link href="/platform/tenants">
              <Building2 className="mr-2 h-4 w-4" />
              Tenants beheren
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="app-halo">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-primary" />
              Tenants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{tenantCount}</p>
            <p className="text-xs text-muted-foreground">Totaal</p>
          </CardContent>
        </Card>
        <Card className="app-halo">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Shield className="h-4 w-4 text-primary" />
              Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              Actief: <span className="font-semibold">{billingOverview.activeTenants}</span>
            </p>
            <p className="text-sm">
              Opgeschort: <span className="font-semibold">{billingOverview.suspendedTenants}</span>
            </p>
            <p className="text-sm">
              Trial: <span className="font-semibold">{billingOverview.trialTenants}</span>
            </p>
          </CardContent>
        </Card>
        <Card className="app-halo">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-primary" />
              Gebruikers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{usersTotal}</p>
            <p className="text-xs text-muted-foreground">Over alle tenants</p>
          </CardContent>
        </Card>
        <Card className="app-halo">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Euro className="h-4 w-4 text-primary" />
              Omzet
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {billingOverview.mrrEstimate > 0
                ? formatEuroFromCents(billingOverview.mrrEstimate)
                : "-"}
            </p>
            <p className="text-xs text-muted-foreground">
              Geschatte MRR
            </p>
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
              <span>
                {billingOverview.pastDueTenants} past due, {billingOverview.atRiskCount} kritiek
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="app-halo">
          <CardHeader>
            <CardTitle>Platform health</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="app-panel-muted px-4 py-4 shadow-none">
              <p className="text-sm text-muted-foreground">Actieve tenants</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{billingOverview.activeTenants}</p>
              <p className="mt-1 text-xs text-muted-foreground">Productieomgevingen die live zijn</p>
            </div>
            <div className="app-panel-muted px-4 py-4 shadow-none">
              <p className="text-sm text-muted-foreground">Past due</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{billingOverview.pastDueTenants}</p>
              <p className="mt-1 text-xs text-muted-foreground">Billing opvolging vereist</p>
            </div>
            <div className="app-panel-muted px-4 py-4 shadow-none">
              <p className="text-sm text-muted-foreground">Kritisch risico</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{billingOverview.atRiskCount}</p>
              <p className="mt-1 text-xs text-muted-foreground">Tenants met directe operationele aandacht</p>
            </div>
          </CardContent>
        </Card>

        <Card className="app-halo">
          <CardHeader>
            <CardTitle>Command center</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="app-panel-muted px-4 py-4 shadow-none">
              <p className="text-sm font-medium text-slate-950">Tenant operations</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Open tenantdetailpagina’s om onboarding risk, billing state en feature flags per omgeving te beheren.
              </p>
            </div>
            <div className="app-panel-muted px-4 py-4 shadow-none">
              <p className="text-sm font-medium text-slate-950">Revenue oversight</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Gebruik de MRR- en past-due signalen als dagelijkse control-plane voor het platform.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
