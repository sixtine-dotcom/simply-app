"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  CreditCard,
  Download,
  FileText,
  Loader2,
  Mail,
  Pencil,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";

type BillingPlan = {
  key: "STARTER" | "PRO" | "ENTERPRISE";
  name: string;
  monthlyPriceCents: number;
  yearlyPriceCents: number;
  monthlyPriceLabel: string;
  yearlyPriceLabel: string;
  memberLimit: number | null;
  storageGb: number | null;
  programLimit: number | null;
  platformFeePercent: number;
  features: string[];
};

type BillingSubscription = {
  id: string;
  plan: "STARTER" | "PRO" | "ENTERPRISE";
  status: string;
  billingInterval: "monthly" | "yearly" | null;
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

type BillingProfile = {
  companyName: string;
  contactName: string;
  email: string;
  vatNumber: string;
  street: string;
  postalCode: string;
  city: string;
  country: string;
};

type BillingInvoice = {
  id: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  plan: "STARTER" | "PRO" | "ENTERPRISE";
  interval: string | null;
  status: string;
  currency: string;
  subtotalCents: number;
  vatCents: number;
  totalCents: number;
  periodStart: string | null;
  periodEnd: string | null;
};

type BillingDunning = {
  isPastDue: boolean;
  pastDueStartedAt: string | null;
  lastPaymentFailureAt: string | null;
  pastDueAgeInDays: number | null;
  suspensionDate: string | null;
  daysUntilSuspension: number | null;
  reminders: Array<{
    day: number;
    sentAt: string | null;
  }>;
};

type BillingState = {
  tenant: {
    id: string;
    name: string;
    plan: "STARTER" | "PRO" | "ENTERPRISE";
    status: "ACTIVE" | "SUSPENDED" | "TRIAL";
    trialEndsAt: string | null;
    subscriptions: BillingSubscription[];
  };
  activeSubscription: BillingSubscription | null;
  dunning: BillingDunning | null;
  billingProfile: BillingProfile;
  invoices: BillingInvoice[];
  plans: BillingPlan[];
  stripeEnabled: boolean;
  canOpenPortal: boolean;
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("nl-BE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatEuroFromCents(cents: number | null) {
  if (typeof cents !== "number") return "—";
  return new Intl.NumberFormat("nl-BE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

export default function AdminBillingPage() {
  const { toast } = useToast();
  const [data, setData] = useState<BillingState | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [showPlans, setShowPlans] = useState(false);
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);
  const [billingView, setBillingView] = useState<"subscription" | "invoicing">("subscription");
  const [editingBillingProfile, setEditingBillingProfile] = useState(false);
  const [billingProfileForm, setBillingProfileForm] = useState<BillingProfile | null>(null);

  const redirectToUrl = async (endpoint: string, payload?: Record<string, unknown>) => {
    setProcessing(endpoint);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: payload ? { "Content-Type": "application/json" } : undefined,
        body: payload ? JSON.stringify(payload) : undefined,
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Stripe actie mislukt.");
      }
      if (result.url) {
        window.location.href = result.url;
      }
    } catch (error) {
      toast({
        title: "Fout",
        description: error instanceof Error ? error.message : "Stripe actie mislukt.",
        variant: "destructive",
      });
      setProcessing(null);
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/billing");
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Billing kon niet worden geladen.");
      }
      setData(result.billing);
      setBillingProfileForm(result.billing.billingProfile);
    } catch (error) {
      toast({
        title: "Fout",
        description: error instanceof Error ? error.message : "Billing kon niet worden geladen.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const runAction = async (
    payload: Record<string, unknown>,
    successTitle: string,
    processingKey: string
  ) => {
    setProcessing(processingKey);
    try {
      const response = await fetch("/api/admin/billing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Billing actie mislukt.");
      }
      toast({ title: successTitle });
      await load();
    } catch (error) {
      toast({
        title: "Fout",
        description: error instanceof Error ? error.message : "Billing actie mislukt.",
        variant: "destructive",
      });
    } finally {
      setProcessing(null);
    }
  };

  const updateBillingProfile = async () => {
    if (!billingProfileForm) return;
    await runAction(
      { action: "update_billing_profile", ...billingProfileForm },
      "Facturatiegegevens opgeslagen",
      "update_billing_profile"
    );
    setEditingBillingProfile(false);
  };

  const emailInvoices = async () => {
    setProcessing("email_invoices");
    try {
      const response = await fetch("/api/admin/billing/invoices/email", {
        method: "POST",
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Facturen mailen mislukt.");
      }
      toast({ title: "Facturen verzonden" });
    } catch (error) {
      toast({
        title: "Fout",
        description: error instanceof Error ? error.message : "Facturen mailen mislukt.",
        variant: "destructive",
      });
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6 lg:p-8">
        <Card className="app-halo">
          <CardContent className="flex min-h-[240px] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const currentPlan = data.plans.find((plan) => plan.key === data.tenant.plan);
  const invoiceTotal = data.invoices.reduce((total, invoice) => total + invoice.totalCents, 0);

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="app-panel app-halo mb-8 overflow-hidden">
        <p className="app-kicker">Revenue control</p>
        <h1 className="mt-3 font-display text-3xl tracking-tight text-slate-950 md:text-5xl">Billing</h1>
        <p className="mt-3 text-muted-foreground">
          Beheer je platformplan, trial en subscriptionstatus voor {data.tenant.name}.
        </p>
      </div>

      {data.dunning?.isPastDue ? (
        <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 text-amber-700" />
            <div className="space-y-2">
              <p className="font-medium text-amber-900">
                Betaling mislukt. Je platform loopt risico op schorsing.
              </p>
              <p className="text-sm text-amber-800">
                Openstaand sinds {formatDate(data.dunning.pastDueStartedAt)}.
                {typeof data.dunning.daysUntilSuspension === "number"
                  ? ` Automatische schorsing over ${data.dunning.daysUntilSuspension} dag(en), op ${formatDate(data.dunning.suspensionDate)}.`
                  : ""}
              </p>
              <div className="flex flex-wrap gap-2 text-xs">
                {data.dunning.reminders.map((reminder) => (
                  <span
                    key={reminder.day}
                    className={`rounded-full px-2 py-1 ${
                      reminder.sentAt
                        ? "bg-amber-200 text-amber-900"
                        : "bg-white text-amber-700 border border-amber-200"
                    }`}
                  >
                    Dag {reminder.day} {reminder.sentAt ? `verzonden op ${formatDate(reminder.sentAt)}` : "nog niet verzonden"}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mb-6 flex flex-wrap gap-3">
        <Button
          variant={billingView === "subscription" ? "default" : "outline"}
          onClick={() => {
            setBillingView("subscription");
            setShowPlans(false);
          }}
        >
          <CreditCard className="mr-2 h-4 w-4" />
          Abonnement
        </Button>
        <Button
          variant={billingView === "invoicing" ? "default" : "outline"}
          onClick={() => {
            setBillingView("invoicing");
            setShowPlans(false);
          }}
        >
          <FileText className="mr-2 h-4 w-4" />
          Facturatie
        </Button>
      </div>

      <div className="space-y-6">
        {billingView === "invoicing" ? (
          <Card className="app-halo">
            <CardHeader>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Facturatie
                  </CardTitle>
                  <CardDescription>
                    Beheer bedrijfsgegevens, download facturen en exporteer je overzicht.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => window.location.href = "/api/admin/billing/invoices/export?format=csv"}>
                    <Download className="mr-2 h-4 w-4" />
                    CSV
                  </Button>
                  <Button variant="outline" onClick={() => window.location.href = "/api/admin/billing/invoices/export?format=html"}>
                    <Download className="mr-2 h-4 w-4" />
                    Alle facturen
                  </Button>
                  <Button
                    variant="outline"
                    disabled={processing === "email_invoices"}
                    onClick={() => void emailInvoices()}
                  >
                    {processing === "email_invoices" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Mail className="mr-2 h-4 w-4" />
                    )}
                    Mailen
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="app-panel-muted p-5 shadow-none">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="font-medium text-foreground">Bedrijfsgegevens</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Deze gegevens worden automatisch op nieuwe facturen gebruikt.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setBillingProfileForm(data.billingProfile);
                      setEditingBillingProfile((value) => !value);
                    }}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    {editingBillingProfile ? "Sluiten" : "Edit"}
                  </Button>
                </div>

                {editingBillingProfile && billingProfileForm ? (
                  <div className="mt-5 grid gap-3 md:grid-cols-2">
                    {[
                      ["companyName", "Bedrijfsnaam"],
                      ["contactName", "Contactpersoon"],
                      ["email", "Facturatie e-mail"],
                      ["vatNumber", "BTW-nummer"],
                      ["street", "Straat en nummer"],
                      ["postalCode", "Postcode"],
                      ["city", "Stad"],
                      ["country", "Land"],
                    ].map(([key, label]) => (
                      <label key={key} className="space-y-1 text-sm">
                        <span className="text-muted-foreground">{label}</span>
                        <Input
                          value={billingProfileForm[key as keyof BillingProfile]}
                          onChange={(event) =>
                            setBillingProfileForm({
                              ...billingProfileForm,
                              [key]: event.target.value,
                            })
                          }
                        />
                      </label>
                    ))}
                    <div className="flex flex-wrap gap-3 md:col-span-2">
                      <Button
                        disabled={processing === "update_billing_profile"}
                        onClick={() => void updateBillingProfile()}
                      >
                        {processing === "update_billing_profile" ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        Opslaan
                      </Button>
                      <Button variant="outline" onClick={() => setEditingBillingProfile(false)}>
                        Annuleren
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 grid gap-3 text-sm md:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <p className="text-muted-foreground">Bedrijf</p>
                      <p className="font-medium">{data.billingProfile.companyName || "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">E-mail</p>
                      <p className="font-medium">{data.billingProfile.email || "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">BTW</p>
                      <p className="font-medium">{data.billingProfile.vatNumber || "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Adres</p>
                      <p className="font-medium">
                        {[data.billingProfile.street, data.billingProfile.postalCode, data.billingProfile.city]
                          .filter(Boolean)
                          .join(", ") || "—"}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="app-panel-muted px-4 py-4 shadow-none">
                  <p className="text-muted-foreground">Aantal facturen</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-950">{data.invoices.length}</p>
                </div>
                <div className="app-panel-muted px-4 py-4 shadow-none">
                  <p className="text-muted-foreground">Totaal gefactureerd</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-950">{formatEuroFromCents(invoiceTotal)}</p>
                </div>
                <div className="app-panel-muted px-4 py-4 shadow-none">
                  <p className="text-muted-foreground">Automatisch opgemaakt</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-950">Aan</p>
                </div>
              </div>

              <div className="overflow-hidden rounded-[24px] border border-white/70 bg-white/70">
                <div className="grid grid-cols-[1.2fr_0.9fr_0.9fr_0.8fr_auto] gap-3 border-b border-white/80 px-4 py-3 text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  <span>Factuur</span>
                  <span>Datum</span>
                  <span>Plan</span>
                  <span>Totaal</span>
                  <span className="text-right">Actie</span>
                </div>
                {data.invoices.length > 0 ? (
                  data.invoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="grid grid-cols-[1.2fr_0.9fr_0.9fr_0.8fr_auto] items-center gap-3 border-b border-white/70 px-4 py-3 text-sm last:border-b-0"
                    >
                      <span className="font-medium text-foreground">{invoice.invoiceNumber}</span>
                      <span className="text-muted-foreground">{formatDate(invoice.date)}</span>
                      <span className="text-muted-foreground">
                        {invoice.plan}{invoice.interval ? ` · ${invoice.interval}` : ""}
                      </span>
                      <span className="font-medium">{formatEuroFromCents(invoice.totalCents)}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.location.href = `/api/admin/billing/invoices/${invoice.id}/download`}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-8 text-sm text-muted-foreground">
                    Nog geen facturen beschikbaar.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : showPlans ? (
          <Card className="app-halo">
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle>Upgrade plan</CardTitle>
                  <CardDescription>Kies het plan dat past bij je groei.</CardDescription>
                </div>
                <Button variant="outline" onClick={() => setShowPlans(false)}>
                  Terug naar huidig abonnement
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 lg:grid-cols-3">
                {data.plans.map((plan) => (
                  <div key={plan.key} className="app-panel-muted flex h-full flex-col p-5 shadow-none">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium text-foreground">{plan.name}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {plan.monthlyPriceLabel} / maand
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {plan.yearlyPriceLabel} / jaar
                        </p>
                      </div>
                      {data.tenant.plan === plan.key ? (
                        <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                          Huidig
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                      {plan.features.map((feature) => (
                        <div key={feature} className="rounded-2xl bg-white/70 px-3 py-2">
                          {feature}
                        </div>
                      ))}
                    </div>
                    <div className="mt-auto flex flex-col gap-2 pt-5">
                      {data.stripeEnabled ? (
                        <>
                          <Button
                            size="sm"
                            disabled={processing === "/api/admin/billing/checkout"}
                            onClick={() =>
                              void redirectToUrl("/api/admin/billing/checkout", {
                                plan: plan.key,
                                interval: "monthly",
                              })
                            }
                          >
                            Maandelijks upgraden
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={processing === "/api/admin/billing/checkout"}
                            onClick={() =>
                              void redirectToUrl("/api/admin/billing/checkout", {
                                plan: plan.key,
                                interval: "yearly",
                              })
                            }
                          >
                            Jaarlijks upgraden
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            disabled={processing === `start-${plan.key}-monthly`}
                            onClick={() => {
                              void runAction(
                                { action: "start_subscription", plan: plan.key, interval: "monthly" },
                                `${plan.name} maandelijks geactiveerd`,
                                `start-${plan.key}-monthly`
                              );
                            }}
                          >
                            Maandelijks upgraden
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={processing === `start-${plan.key}-yearly`}
                            onClick={() => {
                              void runAction(
                                { action: "start_subscription", plan: plan.key, interval: "yearly" },
                                `${plan.name} jaarlijks geactiveerd`,
                                `start-${plan.key}-yearly`
                              );
                            }}
                          >
                            Jaarlijks upgraden
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="app-halo">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Huidig abonnement
              </CardTitle>
              <CardDescription>
                Bekijk je huidige plan, abonnementsperiode en wat er in je abonnement zit.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="app-panel-muted px-4 py-4 shadow-none">
                  <p className="text-muted-foreground">Tenant status</p>
                  <p className="mt-1 font-medium">{data.tenant.status}</p>
                </div>
                <div className="app-panel-muted px-4 py-4 shadow-none">
                  <p className="text-muted-foreground">Actief plan</p>
                  <p className="mt-1 font-medium">{data.tenant.plan}</p>
                </div>
                <div className="app-panel-muted px-4 py-4 shadow-none">
                  <p className="text-muted-foreground">Trial eindigt op</p>
                  <p className="mt-1 font-medium">{formatDate(data.tenant.trialEndsAt)}</p>
                </div>
                <div className="app-panel-muted px-4 py-4 shadow-none">
                  <p className="text-muted-foreground">Actieve periode</p>
                  <p className="mt-1 font-medium">
                    {data.activeSubscription
                      ? `${formatDate(data.activeSubscription.currentPeriodStart)} t/m ${formatDate(data.activeSubscription.currentPeriodEnd)}`
                      : "Geen actieve subscription"}
                  </p>
                </div>
              </div>

              {data.activeSubscription ? (
                <div
                  className={`rounded-[24px] border p-4 ${
                    data.dunning?.isPastDue
                      ? "border-amber-300 bg-amber-50"
                      : "border-primary/20 bg-primary/5"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {data.dunning?.isPastDue ? (
                      <Clock3 className="mt-0.5 h-5 w-5 text-amber-700" />
                    ) : data.activeSubscription.cancelAtPeriodEnd ? (
                      <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
                    ) : (
                      <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary" />
                    )}
                    <div>
                      <p className="font-medium text-foreground">
                        {data.activeSubscription.plan} · {data.activeSubscription.billingInterval || "—"}
                      </p>
                      <p className="text-muted-foreground">
                        {formatEuroFromCents(data.activeSubscription.priceCents)} · Platform fee{" "}
                        {data.activeSubscription.platformFeePercent ?? "—"}%
                      </p>
                      <p className="mt-1 text-muted-foreground">
                        {data.dunning?.isPastDue
                          ? "Werk je betaalmethode zo snel mogelijk bij om automatische schorsing te voorkomen."
                          : data.activeSubscription.cancelAtPeriodEnd
                          ? "Deze subscription stopt aan het einde van de huidige periode."
                          : "Deze subscription loopt actief door."}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              {currentPlan ? (
                <div className="app-panel-muted p-5 shadow-none">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="font-medium text-foreground">Inbegrepen in {currentPlan.name}</p>
                      <p className="mt-1 text-muted-foreground">
                        {currentPlan.monthlyPriceLabel} / maand of {currentPlan.yearlyPriceLabel} / jaar ·{" "}
                        {currentPlan.platformFeePercent}% platform fee
                      </p>
                    </div>
                    {data.activeSubscription?.cancelAtPeriodEnd ? (
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
                        Opzegging gepland
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {currentPlan.features.map((feature) => (
                      <div key={feature} className="rounded-2xl bg-white/70 px-3 py-2 text-muted-foreground">
                        {feature}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <Button onClick={() => setShowPlans(true)}>Upgrade plan</Button>
                {data.stripeEnabled ? (
                  <Button
                    variant={data.dunning?.isPastDue ? "default" : "outline"}
                    disabled={!data.canOpenPortal || processing === "/api/admin/billing/portal"}
                    onClick={() => void redirectToUrl("/api/admin/billing/portal")}
                  >
                    {processing === "/api/admin/billing/portal" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Open billing portal
                  </Button>
                ) : null}
                {data.activeSubscription?.cancelAtPeriodEnd ? (
                  <Button
                    disabled={processing === "resume_subscription"}
                    onClick={() =>
                      void runAction(
                        { action: "resume_subscription" },
                        "Opzegging geannuleerd",
                        "resume_subscription"
                      )
                    }
                  >
                    {processing === "resume_subscription" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Subscription hervatten
                  </Button>
                ) : data.activeSubscription ? (
                  <Button
                    variant="outline"
                    disabled={processing === "schedule_cancellation"}
                    onClick={() => setShowCancelConfirmation(true)}
                  >
                  {processing === "schedule_cancellation" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Opzeggen aan periode-einde
                </Button>
              ) : null}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {showCancelConfirmation ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[28px] border border-white/70 bg-white p-6 shadow-[0_30px_80px_-30px_rgba(15,23,42,0.45)]">
            <h2 className="text-lg font-semibold text-slate-950">Abonnement opzeggen</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Ben je zeker dat je het huidige abonnement wil opzeggen?
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <Button
                variant="outline"
                disabled={processing === "schedule_cancellation"}
                onClick={() => setShowCancelConfirmation(false)}
              >
                Annuleren
              </Button>
              <Button
                disabled={processing === "schedule_cancellation"}
                onClick={() =>
                  void runAction(
                    { action: "schedule_cancellation" },
                    "Subscription wordt op het einde van de periode stopgezet",
                    "schedule_cancellation"
                  ).then(() => setShowCancelConfirmation(false))
                }
              >
                {processing === "schedule_cancellation" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Ja, opzeggen
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
