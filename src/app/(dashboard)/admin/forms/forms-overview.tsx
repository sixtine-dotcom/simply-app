"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FileText, LayoutTemplate, Loader2, Plus, Sparkles, Tag, Users, Workflow } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { RemindPendingFormsButton } from "./remind-pending-forms-button";
import { AdminHubCard } from "@/components/admin/hub-card";

type FormOverview = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  isOnboardingForm: boolean;
  updatedAt: string | Date;
  _count: {
    questions: number;
    assignments: number;
    responses: number;
  };
  pendingRequired: number;
  overdueRequired: number;
  assignments: Array<{
    id: string;
    targetLabel: string;
    isRequired: boolean;
  }>;
  responses: Array<{
    id: string;
    status: string;
    user: {
      firstName: string;
      lastName: string;
      email: string;
    };
  }>;
};

export function FormsOverview({ initialForms }: { initialForms: FormOverview[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const createForm = async () => {
    if (!title.trim()) return;
    setIsCreating(true);
    try {
      const response = await fetch("/api/admin/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Kon formulier niet aanmaken");
      }
      setTitle("");
      router.push(`/admin/forms/${result.form.id}`);
      router.refresh();
    } catch (error) {
      toast({
        title: "Fout",
        description: error instanceof Error ? error.message : "Kon formulier niet aanmaken",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <Card className="overflow-hidden app-halo">
            <CardContent className="p-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-3 py-1 text-xs uppercase tracking-[0.28em] text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5" />
                Forms
              </div>
              <h1 className="mt-4 font-display text-4xl tracking-tight text-slate-900 md:text-5xl">
                Bouw je intake, onboarding en check-ins zoals een Typeform-flow.
              </h1>
              <p className="mt-4 max-w-3xl text-base text-muted-foreground md:text-lg">
                Maak formulieren met meerdere vraagtypes, wijs ze toe per groep of ruimte en bepaal wanneer ze zichtbaar of verplicht zijn.
              </p>
            </CardContent>
          </Card>

          <Card className="app-halo">
            <CardHeader>
              <CardTitle>Nieuw formulier</CardTitle>
              <CardDescription>
                Start met een titel en bouw daarna verder in de builder.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Bijv. Intake hormonale balans"
              />
              <Button onClick={() => void createForm()} disabled={isCreating || !title.trim()} className="w-full">
                {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Builder openen
              </Button>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 md:grid-cols-5">
          <SummaryCard label="Formulieren" value={String(initialForms.length)} href="/admin/forms" />
          <SummaryCard
            label="Live"
            value={String(initialForms.filter((form) => form.status === "PUBLISHED").length)}
            href="/admin/forms"
          />
          <SummaryCard
            label="Onboarding"
            value={String(initialForms.filter((form) => form.isOnboardingForm).length)}
            href="/admin/onboarding"
          />
          <SummaryCard
            label="Responses"
            value={String(initialForms.reduce((count, form) => count + form._count.responses, 0))}
            href="/admin/forms"
          />
          <SummaryCard
            label="Open verplicht"
            value={String(initialForms.reduce((count, form) => count + form.pendingRequired, 0))}
            href="/admin/users"
          />
        </section>

        <section className="grid gap-4 lg:grid-cols-4">
          <AdminHubCard
            icon={<FileText className="h-5 w-5" />}
            title="Forms"
            description="Deze hub stuurt intake, onboarding, check-ins en required follow-up."
            href="/admin/forms"
            cta="Open forms"
            active
          />
          <AdminHubCard
            icon={<Users className="h-5 w-5" />}
            title="People"
            description="Gebruik people ops voor activatie, toewijzing en opvolging per gebruiker."
            href="/admin/users"
            cta="Open people"
          />
          <AdminHubCard
            icon={<Tag className="h-5 w-5" />}
            title="Offers"
            description="Verbind formulieren later met offers, intake flows en fulfilment."
            href="/admin/offers"
            cta="Open offers"
          />
          <AdminHubCard
            icon={<LayoutTemplate className="h-5 w-5" />}
            title="Website"
            description="Gebruik formulieren als conversion- en onboardinglaag achter publieke pages."
            href="/admin/landing-pages"
            cta="Open website"
          />
        </section>

        <section className="app-panel flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="text-sm font-medium text-slate-900">Open formulier follow-up</p>
            <p className="text-sm text-muted-foreground">
              Verstuur in bulk herinneringen voor open verplichte formulieren met directe user-toewijzing.
            </p>
          </div>
          <RemindPendingFormsButton />
        </section>

        <section className="grid gap-4">
          {initialForms.length === 0 ? (
            <Card className="app-halo border-dashed">
              <CardContent className="py-16 text-center">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h2 className="mt-4 text-lg font-semibold">Nog geen formulieren</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Maak je eerste intake of onboarding en wijs hem daarna toe per doelgroep.
                </p>
              </CardContent>
            </Card>
          ) : (
            initialForms.map((form) => (
              <Card key={form.id} className="app-halo">
                <CardContent className="flex flex-col gap-5 p-6 lg:flex-row lg:items-start lg:justify-between">
                  <Link href={`/admin/forms/${form.id}`} className="block min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold">{form.title}</h2>
                      <StatusBadge status={form.status} />
                      {form.isOnboardingForm ? (
                        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                          Onboarding
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">/forms/{form.slug}</p>
                    {form.description ? (
                      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                        {form.description}
                      </p>
                    ) : null}

                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span className="rounded-full bg-muted px-3 py-1.5">
                        {form._count.questions} vragen
                      </span>
                      <span className="rounded-full bg-muted px-3 py-1.5">
                        {form._count.assignments} toewijzingen
                      </span>
                      <span className="rounded-full bg-muted px-3 py-1.5">
                        {form._count.responses} antwoorden
                      </span>
                      {form.pendingRequired > 0 ? (
                        <span className="rounded-full bg-amber-100 px-3 py-1.5 font-medium text-amber-800">
                          {form.pendingRequired} open verplicht
                        </span>
                      ) : null}
                      {form.overdueRequired > 0 ? (
                        <span className="rounded-full bg-red-100 px-3 py-1.5 font-medium text-red-700">
                          {form.overdueRequired} overdue
                        </span>
                      ) : null}
                    </div>

                    {form.assignments.length > 0 ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {form.assignments.slice(0, 4).map((assignment) => (
                          <span
                            key={assignment.id}
                            className="rounded-full border border-border/70 px-3 py-1 text-xs text-muted-foreground"
                          >
                            {assignment.targetLabel}
                            {assignment.isRequired ? " · verplicht" : ""}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </Link>

                  <div className="flex w-full flex-col gap-3 lg:w-[280px]">
                    <Button asChild>
                      <Link href={`/admin/forms/${form.id}`}>Open builder</Link>
                    </Button>
                    <Button variant="outline" asChild>
                      <Link href={`/forms/${form.slug}`}>Preview invulflow</Link>
                    </Button>
                    {form.responses[0] ? (
                      <div className="rounded-2xl border bg-muted/30 p-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2 font-medium text-foreground">
                          <Users className="h-4 w-4" />
                          Laatste respons
                        </div>
                        <p className="mt-2">
                          {form.responses[0].user.firstName} {form.responses[0].user.lastName}
                        </p>
                        <p className="text-xs">{form.responses[0].user.email}</p>
                      </div>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <Card className="app-halo">
            <CardHeader>
              <CardTitle>Form operating model</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <div className="rounded-2xl bg-muted/50 p-4">
                <p className="font-medium text-foreground">1. Intake als workflow</p>
                <p className="mt-1">
                  Behandel een formulier niet als losse vragenlijst, maar als startpunt van een klantflow.
                </p>
              </div>
              <div className="rounded-2xl bg-muted/50 p-4">
                <p className="font-medium text-foreground">2. Required assignment</p>
                <p className="mt-1">
                  Gebruik verplichte toewijzingen om onboarding, check-ins en nazorg voorspelbaar te maken.
                </p>
              </div>
              <div className="rounded-2xl bg-muted/50 p-4">
                <p className="font-medium text-foreground">3. Follow-up centraal</p>
                <p className="mt-1">
                  Herinner open formulieren vanuit één plek in plaats van losse handmatige opvolging.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="app-halo">
            <CardHeader>
              <CardTitle>Snelle routes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full justify-between" variant="outline" asChild>
                <Link href="/admin/users">
                  Open people
                  <Users className="h-4 w-4" />
                </Link>
              </Button>
              <Button className="w-full justify-between" variant="outline" asChild>
                <Link href="/admin/onboarding">
                  Open setup
                  <Workflow className="h-4 w-4" />
                </Link>
              </Button>
              <Button className="w-full justify-between" variant="outline" asChild>
                <Link href="/admin/landing-pages">
                  Open website
                  <LayoutTemplate className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, href }: { label: string; value: string; href?: string }) {
  const card = (
    <Card className={href ? "hover:border-primary/30 transition-colors cursor-pointer" : undefined}>
      <CardContent className="p-6">
        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
        <p className="mt-3 text-3xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
  if (href) return <Link href={href} className="block">{card}</Link>;
  return card;
}

function StatusBadge({ status }: { status: FormOverview["status"] }) {
  const className =
    status === "PUBLISHED"
      ? "bg-emerald-50 text-emerald-700"
      : status === "ARCHIVED"
        ? "bg-slate-100 text-slate-700"
        : "bg-amber-100 text-amber-800";

  return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${className}`}>{status}</span>;
}
