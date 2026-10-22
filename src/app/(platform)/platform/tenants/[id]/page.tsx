"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, CheckCircle2, ExternalLink, History, Loader2, Save, ShieldAlert, Trash2 } from "lucide-react";

type TenantDomain = {
  id: string;
  domain: string;
  isPrimary: boolean;
  isVerified: boolean;
  createdAt: string;
};

type TenantSubscription = {
  id: string;
  plan: "STARTER" | "PRO" | "ENTERPRISE";
  status: string;
  billingInterval: string | null;
  priceCents: number | null;
  platformFeePercent: number | null;
  cancelAtPeriodEnd: boolean;
  lastPaymentFailureAt: string | null;
  pastDueStartedAt: string | null;
  dunningReminder1SentAt: string | null;
  dunningReminder4SentAt: string | null;
  dunningReminder7SentAt: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  createdAt: string;
};

type TenantDetail = {
  id: string;
  name: string;
  slug: string;
  plan: "STARTER" | "PRO" | "ENTERPRISE";
  status: "ACTIVE" | "SUSPENDED" | "TRIAL";
  trialEndsAt: string | null;
  suspendedReason: string | null;
  createdAt: string;
  _count: {
    users: number;
    domains: number;
    subscriptions: number;
  };
  risk: {
    pendingActivations: number;
    pendingRequiredForms: number;
  };
  domains: TenantDomain[];
  subscriptions: TenantSubscription[];
  featureFlags: {
    key: string;
    isEnabled: boolean;
  }[];
};

type AuditLogEntry = {
  id: string;
  userId: string | null;
  tenantId: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
};

type ResolvedFeature = {
  key: string;
  label: string;
  description: string;
  includedByPlan: boolean;
  overridden: boolean;
  enabled: boolean;
};

type TenantForm = {
  name: string;
  slug: string;
  plan: TenantDetail["plan"];
  status: TenantDetail["status"];
  trialEndsAt: string;
  suspendedReason: string;
};

const emptyForm: TenantForm = {
  name: "",
  slug: "",
  plan: "STARTER",
  status: "TRIAL",
  trialEndsAt: "",
  suspendedReason: "",
};

export default function PlatformTenantDetailPage() {
  const params = useParams<{ id: string }>();
  const tenantId = params.id;
  const { toast } = useToast();
  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [form, setForm] = useState<TenantForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [domainValue, setDomainValue] = useState("");
  const [addingDomain, setAddingDomain] = useState(false);
  const [runningFollowUp, setRunningFollowUp] = useState(false);
  const [features, setFeatures] = useState<ResolvedFeature[]>([]);
  const [togglingFeature, setTogglingFeature] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/platform/tenants/${tenantId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Kon tenant niet laden");
      const featureRes = await fetch(`/api/platform/tenants/${tenantId}/features`);
      const featureData = await featureRes.json();
      if (!featureRes.ok) throw new Error(featureData.error || "Kon features niet laden");

      setTenant(data.tenant);
      setFeatures(featureData.features || []);
      setAuditLogs(data.auditLogs || []);
      setForm({
        name: data.tenant.name,
        slug: data.tenant.slug,
        plan: data.tenant.plan,
        status: data.tenant.status,
        trialEndsAt: data.tenant.trialEndsAt ? data.tenant.trialEndsAt.slice(0, 10) : "",
        suspendedReason: data.tenant.suspendedReason || "",
      });
    } catch (error) {
      toast({
        title: "Fout",
        description: error instanceof Error ? error.message : "Kon tenant niet laden",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleFeature = async (key: string, enabled: boolean) => {
    setTogglingFeature(key);
    try {
      const res = await fetch(`/api/platform/tenants/${tenantId}/features`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, enabled }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Feature update mislukt");
      setFeatures(data.features || []);
      toast({ title: "Feature bijgewerkt" });
    } catch (error) {
      toast({
        title: "Fout",
        description: error instanceof Error ? error.message : "Feature update mislukt",
        variant: "destructive",
      });
    } finally {
      setTogglingFeature(null);
    }
  };

  useEffect(() => {
    if (tenantId) {
      load();
    }
  }, [tenantId]);

  const saveTenant = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/platform/tenants/${tenantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          trialEndsAt: form.trialEndsAt ? new Date(form.trialEndsAt).toISOString() : null,
          suspendedReason: form.suspendedReason.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Tenant opslaan mislukt");
      toast({ title: "Tenant bijgewerkt" });
      await load();
    } catch (error) {
      toast({
        title: "Fout",
        description: error instanceof Error ? error.message : "Tenant opslaan mislukt",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const addDomain = async () => {
    if (!domainValue.trim()) return;
    setAddingDomain(true);
    try {
      const res = await fetch(`/api/platform/tenants/${tenantId}/domains`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: domainValue.trim(), isPrimary: tenant?.domains.length === 0 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Domein toevoegen mislukt");
      setDomainValue("");
      toast({ title: "Domein toegevoegd" });
      await load();
    } catch (error) {
      toast({
        title: "Fout",
        description: error instanceof Error ? error.message : "Domein toevoegen mislukt",
        variant: "destructive",
      });
    } finally {
      setAddingDomain(false);
    }
  };

  const updateDomain = async (domainId: string, values: { isPrimary: boolean; isVerified: boolean }) => {
    try {
      const res = await fetch(`/api/platform/tenants/${tenantId}/domains/${domainId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Domein bijwerken mislukt");
      toast({ title: "Domein bijgewerkt" });
      await load();
    } catch (error) {
      toast({
        title: "Fout",
        description: error instanceof Error ? error.message : "Domein bijwerken mislukt",
        variant: "destructive",
      });
    }
  };

  const deleteDomain = async (domainId: string) => {
    try {
      const res = await fetch(`/api/platform/tenants/${tenantId}/domains/${domainId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Domein verwijderen mislukt");
      toast({ title: "Domein verwijderd" });
      await load();
    } catch (error) {
      toast({
        title: "Fout",
        description: error instanceof Error ? error.message : "Domein verwijderen mislukt",
        variant: "destructive",
      });
    }
  };

  const runFollowUp = async () => {
    setRunningFollowUp(true);
    try {
      const res = await fetch(`/api/platform/tenants/${tenantId}/follow-up`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Follow-up mislukt");
      toast({
        title: "Follow-up uitgevoerd",
        description: `${data.activationsSent || 0} activaties, ${data.formsSent || 0} formulierreminders.`,
      });
      await load();
    } catch (error) {
      toast({
        title: "Fout",
        description: error instanceof Error ? error.message : "Follow-up mislukt",
        variant: "destructive",
      });
    } finally {
      setRunningFollowUp(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!tenant) return null;

  const formatAuditAction = (action: string) =>
    action
      .replace(/\./g, " ")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <Link
        href="/platform/tenants"
        className="mb-6 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Terug naar tenants
      </Link>

      <div className="app-panel app-halo mb-8 overflow-hidden">
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="app-kicker">Tenant command center</p>
            <h1 className="mt-3 font-display text-3xl tracking-tight text-slate-950 md:text-5xl">
              {tenant.name}
            </h1>
          <p className="mt-2 text-muted-foreground">
            Tenant details, status, abonnement en domeinen.
          </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={runFollowUp} disabled={runningFollowUp} variant="outline">
              {runningFollowUp ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldAlert className="mr-2 h-4 w-4" />}
              Follow-up uitvoeren
            </Button>
            <Button asChild variant="outline">
              <Link href="/platform/tenants">
                Terug
              </Link>
            </Button>
            <Button onClick={saveTenant} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Opslaan
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <form onSubmit={saveTenant} className="space-y-6">
          <Card className="app-halo">
            <CardHeader>
              <CardTitle>Basisgegevens</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Naam</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={form.slug}
                  onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plan">Plan</Label>
                <select
                  id="plan"
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                  value={form.plan}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, plan: e.target.value as TenantDetail["plan"] }))
                  }
                >
                  <option value="STARTER">Starter</option>
                  <option value="PRO">Pro</option>
                  <option value="ENTERPRISE">Enterprise</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                  value={form.status}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, status: e.target.value as TenantDetail["status"] }))
                  }
                >
                  <option value="TRIAL">Trial</option>
                  <option value="ACTIVE">Active</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="trialEndsAt">Trial eindigt op</Label>
                <Input
                  id="trialEndsAt"
                  type="date"
                  value={form.trialEndsAt}
                  onChange={(e) => setForm((prev) => ({ ...prev, trialEndsAt: e.target.value }))}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="suspendedReason">Reden opschorting</Label>
                <textarea
                  id="suspendedReason"
                  value={form.suspendedReason}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, suspendedReason: e.target.value }))
                  }
                  className="min-h-[110px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="app-halo">
            <CardHeader>
              <CardTitle>Custom domains</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={domainValue}
                  onChange={(e) => setDomainValue(e.target.value)}
                  placeholder="academy.example.com"
                />
                <Button type="button" onClick={addDomain} disabled={addingDomain}>
                  {addingDomain ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Toevoegen
                </Button>
              </div>

              <div className="space-y-3">
                {tenant.domains.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nog geen custom domains gekoppeld.</p>
                ) : (
                  tenant.domains.map((domain) => (
                    <div key={domain.id} className="app-panel-muted p-4 shadow-none">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-medium">{domain.domain}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                            {domain.isPrimary ? (
                              <span className="rounded bg-primary/10 px-2 py-1 text-primary">Primair</span>
                            ) : null}
                            {domain.isVerified ? (
                              <span className="rounded bg-green-100 px-2 py-1 text-green-700">Verified</span>
                            ) : (
                              <span className="rounded bg-yellow-100 px-2 py-1 text-yellow-700">Pending SSL</span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {!domain.isPrimary ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                updateDomain(domain.id, {
                                  isPrimary: true,
                                  isVerified: domain.isVerified,
                                })
                              }
                            >
                              Primair maken
                            </Button>
                          ) : null}
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              updateDomain(domain.id, {
                                isPrimary: domain.isPrimary,
                                isVerified: !domain.isVerified,
                              })
                            }
                          >
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            {domain.isVerified ? "Markeer pending" : "Markeer verified"}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            asChild
                          >
                            <a href={`https://${domain.domain}`} target="_blank" rel="noreferrer">
                              <ExternalLink className="mr-2 h-4 w-4" />
                              Open
                            </a>
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => deleteDomain(domain.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Verwijder
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="app-halo">
            <CardHeader>
              <CardTitle>Feature flags</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {features.map((feature) => (
                <div key={feature.key} className="app-panel-muted p-4 shadow-none">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="max-w-[32rem]">
                      <p className="font-medium">{feature.label}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {feature.description}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <span
                          className={`rounded px-2 py-1 ${
                            feature.includedByPlan
                              ? "bg-primary/10 text-primary"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {feature.includedByPlan ? "Inbegrepen in plan" : "Niet inbegrepen in plan"}
                        </span>
                        {feature.overridden ? (
                          <span className="rounded bg-amber-100 px-2 py-1 text-amber-700">
                            Override actief
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant={feature.enabled ? "default" : "outline"}
                      disabled={togglingFeature === feature.key}
                      onClick={() => toggleFeature(feature.key, !feature.enabled)}
                    >
                      {togglingFeature === feature.key ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      {feature.enabled ? "Uitschakelen" : "Inschakelen"}
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </form>

        <div className="space-y-6">
          <Card className="app-halo">
            <CardHeader>
              <CardTitle>Overzicht</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="rounded-[24px] border border-amber-200 bg-amber-50/90 p-4">
                <p className="font-medium text-foreground">Onboarding risk</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {tenant.risk.pendingActivations > 0 ? (
                    <span className="rounded bg-amber-100 px-2 py-1 text-xs text-amber-700">
                      {tenant.risk.pendingActivations} activaties open
                    </span>
                  ) : null}
                  {tenant.risk.pendingRequiredForms > 0 ? (
                    <span className="rounded bg-orange-100 px-2 py-1 text-xs text-orange-700">
                      {tenant.risk.pendingRequiredForms} formulieren open
                    </span>
                  ) : null}
                  {tenant.risk.pendingActivations === 0 && tenant.risk.pendingRequiredForms === 0 ? (
                    <span className="rounded bg-green-100 px-2 py-1 text-xs text-green-700">
                      Geen open onboarding-risico&apos;s
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Gebruikers</span>
                <span className="font-medium">{tenant._count.users}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Domains</span>
                <span className="font-medium">{tenant._count.domains}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Abonnementen</span>
                <span className="font-medium">{tenant._count.subscriptions}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Aangemaakt</span>
                <span className="font-medium">
                  {new Date(tenant.createdAt).toLocaleDateString("nl-BE")}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="app-halo">
            <CardHeader>
              <CardTitle>Laatste abonnementen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {tenant.subscriptions.length === 0 ? (
                <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                  Nog geen abonnementshistoriek beschikbaar.
                </div>
              ) : (
                tenant.subscriptions.map((subscription) => (
                  <div key={subscription.id} className="app-panel-muted p-4 shadow-none">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">{subscription.plan}</p>
                        <p className="text-xs text-muted-foreground">
                          {subscription.status}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(subscription.createdAt).toLocaleDateString("nl-BE")}
                      </span>
                    </div>
                    <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                      {subscription.billingInterval ? (
                        <p>Interval: {subscription.billingInterval}</p>
                      ) : null}
                      {typeof subscription.priceCents === "number" ? (
                        <p>Prijs: €{(subscription.priceCents / 100).toFixed(2)}</p>
                      ) : null}
                      {typeof subscription.platformFeePercent === "number" ? (
                        <p>Platform fee: {subscription.platformFeePercent}%</p>
                      ) : null}
                      {subscription.lastPaymentFailureAt ? (
                        <p>
                          Laatste betaalfout:{" "}
                          {new Date(subscription.lastPaymentFailureAt).toLocaleDateString("nl-BE")}
                        </p>
                      ) : null}
                      {subscription.pastDueStartedAt ? (
                        <p>
                          Past due sinds{" "}
                          {new Date(subscription.pastDueStartedAt).toLocaleDateString("nl-BE")}
                        </p>
                      ) : null}
                      {subscription.cancelAtPeriodEnd ? (
                        <p>Opzegging gepland aan het einde van de periode</p>
                      ) : null}
                    </div>
                    {subscription.currentPeriodEnd ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Loopt tot {new Date(subscription.currentPeriodEnd).toLocaleDateString("nl-BE")}
                      </p>
                    ) : null}
                    {(subscription.dunningReminder1SentAt ||
                      subscription.dunningReminder4SentAt ||
                      subscription.dunningReminder7SentAt) ? (
                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        {subscription.dunningReminder1SentAt ? (
                          <span className="rounded bg-amber-100 px-2 py-1 text-amber-700">
                            Dag 1 verzonden
                          </span>
                        ) : null}
                        {subscription.dunningReminder4SentAt ? (
                          <span className="rounded bg-amber-100 px-2 py-1 text-amber-700">
                            Dag 4 verzonden
                          </span>
                        ) : null}
                        {subscription.dunningReminder7SentAt ? (
                          <span className="rounded bg-amber-100 px-2 py-1 text-amber-700">
                            Dag 7 verzonden
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {tenant.status === "SUSPENDED" && tenant.suspendedReason ? (
            <Card className="app-halo border-amber-300 bg-amber-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-950">
                  <ShieldAlert className="h-5 w-5" />
                  Opschortingsnotitie
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-amber-950/85">
                {tenant.suspendedReason}
              </CardContent>
            </Card>
          ) : null}

          <Card className="app-halo">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Audit log
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {auditLogs.length === 0 ? (
                <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                  Nog geen auditgeschiedenis voor deze tenant.
                </div>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="app-panel-muted p-4 shadow-none">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{formatAuditAction(log.action)}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {new Date(log.createdAt).toLocaleString("nl-BE")}
                          {log.ipAddress ? ` · IP ${log.ipAddress}` : ""}
                        </p>
                      </div>
                      {log.entityType ? (
                        <span className="rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
                          {log.entityType}
                        </span>
                      ) : null}
                    </div>
                    {log.metadata ? (
                      <pre className="mt-3 overflow-x-auto rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    ) : null}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
