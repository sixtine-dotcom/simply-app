"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { ChevronLeft, Eye, Loader2, LogIn, Plus, Search } from "lucide-react";

type Tenant = {
  id: string;
  name: string;
  slug: string;
  plan: "STARTER" | "PRO" | "ENTERPRISE";
  status: "ACTIVE" | "SUSPENDED" | "TRIAL";
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
  subscriptions: Array<{
    id: string;
    status: string;
    billingInterval: string | null;
    priceCents: number | null;
    pastDueStartedAt: string | null;
    currentPeriodEnd: string | null;
  }>;
};

export default function PlatformTenantsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState({
    name: "",
    slug: "",
    plan: "STARTER" as Tenant["plan"],
    status: "TRIAL" as Tenant["status"],
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tenants;
    return tenants.filter(
      (tenant) =>
        tenant.name.toLowerCase().includes(q) ||
        tenant.slug.toLowerCase().includes(q)
    );
  }, [query, tenants]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/platform/tenants");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Kon tenants niet laden");
      setTenants(data.tenants || []);
    } catch (error) {
      toast({
        title: "Fout",
        description:
          error instanceof Error ? error.message : "Kon tenants niet laden",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/platform/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Tenant aanmaken mislukt");
      toast({ title: "Tenant aangemaakt" });
      setForm({ name: "", slug: "", plan: "STARTER", status: "TRIAL" });
      load();
    } catch (error) {
      toast({
        title: "Fout",
        description:
          error instanceof Error ? error.message : "Tenant aanmaken mislukt",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (tenantId: string, status: Tenant["status"]) => {
    try {
      const res = await fetch(`/api/platform/tenants/${tenantId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Status updaten mislukt");
      setTenants((prev) =>
        prev.map((tenant) =>
          tenant.id === tenantId ? { ...tenant, status: data.tenant.status } : tenant
        )
      );
    } catch (error) {
      toast({
        title: "Fout",
        description:
          error instanceof Error ? error.message : "Status update mislukt",
        variant: "destructive",
      });
    }
  };

  const impersonateTenant = async (tenantId: string) => {
    try {
      const res = await fetch(`/api/platform/tenants/${tenantId}/impersonate`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Impersonatie mislukt");
      window.location.href = data.redirectTo || "/";
    } catch (error) {
      toast({
        title: "Fout",
        description:
          error instanceof Error ? error.message : "Impersonatie mislukt",
        variant: "destructive",
      });
    }
  };

  const autoSlug = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <Link
        href="/platform"
        className="mb-6 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="mr-1 h-4 w-4" />
        Terug naar SuperAdmin
      </Link>

      <div className="app-panel app-halo mb-8 overflow-hidden">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="app-kicker">Tenant operations</p>
            <h1 className="mt-3 font-display text-3xl tracking-tight text-slate-950 md:text-5xl">
              Tenants
            </h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Beheer onboarding risk, billing health en supporttoegang voor elke omgeving vanuit één control plane.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="app-panel-muted min-w-[140px] px-4 py-4 text-center shadow-none">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Totaal</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{tenants.length}</p>
            </div>
            <div className="app-panel-muted min-w-[140px] px-4 py-4 text-center shadow-none">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Risico</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">
                {tenants.filter((tenant) => tenant.risk.pendingActivations > 0 || tenant.risk.pendingRequiredForms > 0).length}
              </p>
            </div>
            <div className="app-panel-muted min-w-[140px] px-4 py-4 text-center shadow-none">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Past due</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">
                {tenants.filter((tenant) => tenant.subscriptions[0]?.status === "past_due").length}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="app-halo lg:col-span-1">
          <CardHeader>
            <CardTitle>Nieuwe tenant</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>Naam</Label>
                <Input
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      name: e.target.value,
                      slug: !prev.slug || prev.slug === autoSlug(prev.name)
                        ? autoSlug(e.target.value)
                        : prev.slug,
                    }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input
                  value={form.slug}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, slug: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Plan</Label>
                <select
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                  value={form.plan}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      plan: e.target.value as Tenant["plan"],
                    }))
                  }
                >
                  <option value="STARTER">Starter</option>
                  <option value="PRO">Pro</option>
                  <option value="ENTERPRISE">Enterprise</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <select
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                  value={form.status}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      status: e.target.value as Tenant["status"],
                    }))
                  }
                >
                  <option value="TRIAL">Trial</option>
                  <option value="ACTIVE">Active</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Opslaan...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Tenant aanmaken
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="app-halo lg:col-span-2">
          <CardHeader>
            <CardTitle>Tenants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-10"
                placeholder="Zoek op naam of slug..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            {loading ? (
              <div className="py-12 text-center">
                <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Geen tenants gevonden.
              </p>
            ) : (
              <div className="space-y-2">
                {filtered.map((tenant) => (
                  <div key={tenant.id} className="app-panel-muted p-4 shadow-none">
                    <div className="flex flex-wrap items-center gap-3">
                    <div className="min-w-[200px] flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-slate-950">{tenant.name}</p>
                        <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-white">
                          {tenant.plan}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {tenant.slug} • {tenant.plan} • {tenant._count.users} users
                      </p>
                      {tenant.subscriptions[0] ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Billing: {tenant.subscriptions[0].status}
                          {tenant.subscriptions[0].billingInterval
                            ? ` • ${tenant.subscriptions[0].billingInterval}`
                            : ""}
                          {tenant.subscriptions[0].priceCents
                            ? ` • €${(tenant.subscriptions[0].priceCents / 100).toFixed(2)}`
                            : ""}
                          {tenant.subscriptions[0].currentPeriodEnd
                            ? ` • tot ${new Date(tenant.subscriptions[0].currentPeriodEnd).toLocaleDateString("nl-BE")}`
                            : ""}
                        </p>
                      ) : null}
                      {(tenant.risk.pendingActivations > 0 || tenant.risk.pendingRequiredForms > 0) ? (
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
                        </div>
                      ) : null}
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        tenant.status === "ACTIVE"
                          ? "bg-green-100 text-green-700"
                          : tenant.status === "TRIAL"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                      }`}
                    >
                      {tenant.status}
                    </span>
                    {tenant.subscriptions[0]?.status === "past_due" ? (
                      <span className="rounded bg-amber-100 px-2 py-1 text-xs text-amber-700">
                        Past due
                      </span>
                    ) : null}
                    {tenant.status === "SUSPENDED" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatus(tenant.id, "ACTIVE")}
                      >
                        Activeer
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatus(tenant.id, "SUSPENDED")}
                      >
                        Schors
                      </Button>
                    )}
                    <Button size="sm" onClick={() => impersonateTenant(tenant.id)}>
                      <LogIn className="mr-2 h-4 w-4" />
                      Login as admin
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/platform/tenants/${tenant.id}`}>
                        <Eye className="mr-2 h-4 w-4" />
                        Details
                      </Link>
                    </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
