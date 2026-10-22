import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowUpRight,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Eye,
  FileText,
  Search,
  Settings2,
  Users,
  Workflow,
} from "lucide-react";
import { requireAdminUser } from "@/lib/auth";
import { getAdminFormBuilderData } from "@/lib/forms";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FormBuilder } from "./form-builder";
import { FormActions } from "./form-actions";

const FORM_TABS = [
  { id: "overview", label: "Overzicht" },
  { id: "builder", label: "Builder" },
  { id: "participants", label: "Deelnemers" },
  { id: "responses", label: "Antwoorden" },
  { id: "assignments", label: "Toewijzingen" },
  { id: "settings", label: "Instellingen" },
] as const;

type FormTab = (typeof FORM_TABS)[number]["id"];

function getTab(value: string | undefined): FormTab {
  return FORM_TABS.some((tab) => tab.id === value) ? (value as FormTab) : "overview";
}

export default async function AdminFormBuilderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; filter?: string }>;
}) {
  const user = await requireAdminUser("/admin/forms");
  const { id } = await params;
  const query = await searchParams;
  const activeTab = getTab(query.tab);
  const data = await getAdminFormBuilderData(id, user.tenantId!);

  if (!data) {
    notFound();
  }

  const form = data.form;
  const completionRate =
    form.responseStats.totalAssignments > 0
      ? Math.round((form.responseStats.submittedResponses / form.responseStats.totalAssignments) * 100)
      : 0;
  const pendingAssignments =
    form.responseStats.totalAssignments - form.responseStats.submittedResponses;

  return (
    <div className="p-4 md:p-5 lg:p-6">
      <section className="relative overflow-hidden rounded-xl border border-border bg-[linear-gradient(135deg,rgba(246,244,238,0.98),rgba(255,255,255,0.95))] px-5 py-4 shadow-sm">
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-3 py-1 text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground">
              <FileText className="h-3.5 w-3.5" />
              Form Workspace
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Link
                href="/admin/forms"
                className="text-sm text-muted-foreground transition hover:text-foreground"
              >
                Forms
              </Link>
              <span className="text-muted-foreground">/</span>
              <span className="text-sm font-medium text-foreground">{form.title}</span>
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-medium",
                  form.status === "PUBLISHED"
                    ? "bg-emerald-50 text-emerald-700"
                    : form.status === "ARCHIVED"
                      ? "bg-slate-100 text-slate-700"
                      : "bg-amber-100 text-amber-800"
                )}
              >
                {form.status === "PUBLISHED" ? "Live" : form.status === "ARCHIVED" ? "Gearchiveerd" : "Concept"}
              </span>
            </div>
            <h1 className="mt-2 font-display text-xl tracking-[0.08em] text-foreground md:text-2xl">
              {form.title}
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm leading-5 text-muted-foreground">
              Beheer hier de vragen, doelgroep, ingevulde formulieren en opvolging
              rond hetzelfde formulier.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant="outline" asChild>
              <Link href={`/forms/${form.slug}`} target="_blank" rel="noopener">
                <Eye className="mr-2 h-4 w-4" />
                Preview
              </Link>
            </Button>
            <Button asChild>
              <Link href={`/admin/forms/${form.id}?tab=builder`}>
                Open builder
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <FormActions formId={form.id} status={form.status} />
          </div>
        </div>
      </section>

      <section className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-5">
        <MetricCard title="Vragen" value={String(form.questions.length)} description="Totaal aantal vragen in het formulier." featured />
        <MetricCard title="Deelnemers" value={String(form.responseStats.totalAssignments)} description="Mensen in de toegewezen doelgroep." />
        <MetricCard title="Ingevuld" value={String(form.responseStats.submittedResponses)} description="Deelnemers die klaar zijn." />
        <MetricCard title="Voortgang" value={`${completionRate}%`} description="Aandeel deelnemers dat indiende." />
        <MetricCard title="Nog open" value={String(pendingAssignments)} description="Klik op Deelnemers om de namen te zien." />
      </section>

      <section className="mt-4 flex flex-wrap gap-1.5">
        {FORM_TABS.map((tab) => (
          <Link
            key={tab.id}
            href={`/admin/forms/${form.id}?tab=${tab.id}`}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition",
              activeTab === tab.id
                ? "border-stone-950 bg-stone-950 text-white"
                : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground"
            )}
            aria-current={activeTab === tab.id ? "page" : undefined}
          >
            {tab.label}
          </Link>
        ))}
      </section>

      {activeTab === "overview" ? (
        <div className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Formulier in één oogopslag</CardTitle>
                <CardDescription>
                  Gebruik dit overzicht om te zien hoe het formulier zich gedraagt binnen onboarding en opvolging.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <OverviewStat
                  icon={ClipboardList}
                  label="Vragen"
                  value={`${form.questions.length} vragen`}
                  helper="Builder en logica van de invulflow."
                />
                <OverviewStat
                  icon={Workflow}
                  label="Doelgroepen"
                  value={`${form.assignments.length} ${form.assignments.length === 1 ? "toewijzing" : "toewijzingen"}`}
                  helper="Challenge, community, rol of specifieke deelnemer."
                />
                <OverviewStat
                  icon={Users}
                  label="Voortgang"
                  value={`${form.responseStats.submittedResponses} ingestuurd`}
                  helper={`${pendingAssignments} wachten nog op opvolging.`}
                />
                <OverviewStat
                  icon={Search}
                  label="Publicatiestatus"
                  value={form.status === "PUBLISHED" ? "Live" : form.status === "ARCHIVED" ? "Gearchiveerd" : "Concept"}
                  helper={form.isOnboardingForm ? "Gemarkeerd als onboardingflow." : "Standaard formulierflow."}
                />
              </CardContent>
            </Card>
        </div>
      ) : null}

      {activeTab === "builder" ? (
        <div className="mt-4">
          <FormBuilder key={`${form.id}:${form.status}`} initialData={data} embedded />
        </div>
      ) : null}

      {activeTab === "participants" ? (
        <div className="mt-6">
          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <CardTitle>Deelnemers</CardTitle>
                <CardDescription>
                  Zie meteen wie het formulier heeft ingevuld en wie nog opvolging nodig heeft.
                </CardDescription>
              </div>
              <div className="flex gap-2 text-xs">
                <Link
                  href={`/admin/forms/${form.id}?tab=participants&filter=pending`}
                  className={cn("rounded-full px-3 py-1.5 font-medium", query.filter === "pending" ? "bg-stone-950 text-white" : "bg-muted text-muted-foreground")}
                >
                  Nog open ({form.participantProgress.pending})
                </Link>
                <Link
                  href={`/admin/forms/${form.id}?tab=participants&filter=all`}
                  className={cn("rounded-full px-3 py-1.5 font-medium", query.filter !== "pending" ? "bg-stone-950 text-white" : "bg-muted text-muted-foreground")}
                >
                  Iedereen ({form.participantProgress.total})
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {form.participantProgress.total === 0 ? (
                <div className="rounded-xl border border-dashed border-border px-6 py-10 text-sm text-muted-foreground">
                  Wijs dit formulier eerst toe aan een challenge, community of deelnemer.
                </div>
              ) : (
                <div className="divide-y divide-border border-y border-border">
                  {form.participantProgress.participants
                    .filter((participant) => query.filter !== "pending" || !participant.submitted)
                    .map((participant) => (
                      <Link
                        key={participant.id}
                        href={`/admin/users/${participant.id}`}
                        className="flex flex-col gap-2 py-4 transition hover:bg-[#f7f8f5] sm:flex-row sm:items-center sm:justify-between sm:px-2"
                      >
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {participant.firstName} {participant.lastName}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{participant.email}</p>
                        </div>
                        <span className={cn("inline-flex w-fit items-center gap-1.5 text-xs font-medium", participant.submitted ? "text-emerald-700" : participant.overdue ? "text-red-700" : "text-amber-700")}>
                          {participant.submitted ? <CheckCircle2 className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
                          {participant.submitted ? "Ingevuld" : participant.overdue ? "Te laat" : "Nog niet ingevuld"}
                        </span>
                      </Link>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {activeTab === "responses" ? (
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Antwoorden</CardTitle>
              <CardDescription>Recente inzendingen en antwoordvoorbeelden voor dit formulier.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {form.responses.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-10 text-sm text-muted-foreground">
                  Nog geen antwoorden beschikbaar.
                </div>
              ) : (
                form.responses.map((response) => (
                  <div key={response.id} className="rounded-[1.4rem] border border-border bg-background/90 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">
                          {response.user.firstName} {response.user.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">{response.user.email}</p>
                      </div>
                      <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                        {response.status}
                      </span>
                    </div>
                    <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                      {response.answerPreview.slice(0, 3).map((preview) => (
                        <div key={preview.questionTitle} className="rounded-xl bg-muted/40 p-3">
                          <p className="font-medium text-foreground">{preview.questionTitle}</p>
                          <p className="mt-1">{preview.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {activeTab === "assignments" ? (
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Toewijzingen</CardTitle>
              <CardDescription>Challenges, communities en deelnemers voor wie dit formulier zichtbaar is.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {form.assignments.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-10 text-sm text-muted-foreground">
                  Nog geen toewijzingen ingesteld.
                </div>
              ) : (
                form.assignments.map((assignment) => (
                  <div key={assignment.id} className="rounded-[1.4rem] border border-border bg-background/90 p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                        {assignment.audienceType}
                      </span>
                      {assignment.isRequired ? (
                        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
                          Verplicht
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-3 font-medium text-foreground">{assignment.title || "Zonder label"}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {assignment.isActive ? "Actieve toewijzing" : "Niet actief"}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {activeTab === "settings" ? (
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Instellingen</CardTitle>
              <CardDescription>
                Operationele instellingen van dit formulier blijven hier zichtbaar buiten de builder.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <OverviewStat
                icon={Settings2}
                label="Slug"
                value={form.slug}
                helper="Publieke route van dit formulier."
              />
              <OverviewStat
                icon={Workflow}
                label="Onboarding"
                value={form.isOnboardingForm ? "Actief" : "Uit"}
                helper="Marker voor intake- en onboardingflows."
              />
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

function MetricCard({
  title,
  value,
  description,
  featured = false,
}: {
  title: string;
  value: string;
  description: string;
  featured?: boolean;
}) {
  return (
    <Card className={cn("rounded-xl shadow-sm", featured ? "border-0 bg-stone-950 text-white" : undefined)}>
      <CardContent className="p-3.5">
        <p className={cn("text-[10px] uppercase tracking-[0.16em]", featured ? "text-white/60" : "text-muted-foreground")}>
          {title}
        </p>
        <p className="mt-1.5 text-xl font-semibold">{value}</p>
        <p className={cn("mt-1 hidden text-xs leading-4 lg:block", featured ? "text-white/70" : "text-muted-foreground")}>
          {description}
        </p>
      </CardContent>
    </Card>
  );
}

function OverviewStat({
  icon: Icon,
  label,
  value,
  helper,
}: {
  icon: typeof ClipboardList;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-border bg-background/90 p-5">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Icon className="h-4 w-4 text-primary" />
        {label}
      </div>
      <p className="mt-4 text-2xl font-semibold text-foreground">{value}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{helper}</p>
    </div>
  );
}
