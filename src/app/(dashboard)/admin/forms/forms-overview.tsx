"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Archive, ArrowUpRight, Copy, Loader2, PlayCircle, RotateCcw, Users } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { RemindPendingFormsButton } from "./remind-pending-forms-button";

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
  participantProgress: {
    total: number;
    completed: number;
    pending: number;
    completionRate: number;
  };
  assignments: Array<{
    id: string;
    targetLabel: string;
    isRequired: boolean;
  }>;
};

export function FormsOverview({ initialForms }: { initialForms: FormOverview[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [actionKey, setActionKey] = useState<string | null>(null);

  const active = initialForms.filter((form) => form.status === "PUBLISHED");
  const drafts = initialForms.filter((form) => form.status === "DRAFT");
  const archived = initialForms.filter((form) => form.status === "ARCHIVED");
  const totalPending = initialForms.reduce((count, form) => count + form.pendingRequired, 0);
  const totalOverdue = initialForms.reduce((count, form) => count + form.overdueRequired, 0);

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
      window.open(`/admin/forms/${result.form.id}?tab=builder`, "_blank", "noopener");
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

  const runAction = async (
    form: FormOverview,
    action: "publish" | "archive" | "restore" | "duplicate"
  ) => {
    const key = `${form.id}:${action}`;
    setActionKey(key);
    try {
      const response = await fetch(`/api/admin/forms/${form.id}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "De actie is niet gelukt");

      if (action === "duplicate") {
        toast({ title: "Formulier gedupliceerd", description: "De kopie staat klaar als concept. Kies de nieuwe challenge als doelgroep." });
        router.push(`/admin/forms/${result.form.id}?tab=assignments`);
        return;
      }
      toast({
        title: action === "archive" ? "Formulier gearchiveerd" : "Formulier staat live",
        description:
          action === "archive"
            ? "Je vindt het terug onder Archief en kunt het altijd opnieuw activeren."
            : "Deelnemers met een actieve toewijzing kunnen het formulier nu invullen.",
      });
      router.refresh();
    } catch (error) {
      toast({
        title: "Actie mislukt",
        description: error instanceof Error ? error.message : "Probeer het opnieuw.",
        variant: "destructive",
      });
    } finally {
      setActionKey(null);
    }
  };

  return (
    <div className="min-h-screen bg-white text-[#171b18]">
      <div className="mx-auto max-w-[1320px] px-5 py-6 sm:px-8 lg:px-12 lg:py-10">
        <header className="border-b border-black/10 pb-5 pr-40 sm:pr-52">
          <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[#667069]">
            Coach omgeving
          </p>
          <h1 className="mt-2 text-[1.1rem] font-medium tracking-[-0.02em]">Formulieren</h1>
          <p className="mt-1 text-xs text-[#6f756f]">
            {active.length} actief · {initialForms.length} totaal
          </p>
        </header>

        <section className="mt-7 grid items-start gap-10 border-b border-black/10 pb-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(300px,0.78fr)]">
          <div className="max-w-xl">
            <p className="[font-family:'The_Seasons',Georgia,serif] text-[clamp(1.85rem,3vw,2.9rem)] font-normal leading-[1.04] tracking-[-0.035em] text-[#191c19] [hyphens:none]">
              Bouw je intake, onboarding en check-ins als één flow.
            </p>
            <p className="mt-5 text-sm leading-6 text-[#676e69]">
              Elke vraag, toewijzing en herinnering rond een formulier op één plek. De builder opent
              in een apart tabblad, zodat je vragen bouwt zonder dit overzicht te verliezen.
            </p>
          </div>

          <div className="border-t border-black/10 pt-6 lg:border-t-0 lg:pt-1">
            <label
              htmlFor="new-form-title"
              className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#667069]"
            >
              Nieuw formulier
            </label>
            <input
              id="new-form-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !isCreating && title.trim()) {
                  void createForm();
                }
              }}
              placeholder="Bijv. Intake hormonale balans"
              className="mt-3 w-full border-0 border-b border-black/20 bg-transparent px-0 py-2 text-sm text-[#171b18] outline-none transition placeholder:text-[#6f756f] focus:border-[#173622]"
            />
            <button
              type="button"
              onClick={() => void createForm()}
              disabled={isCreating || !title.trim()}
              className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 bg-[#173622] px-5 text-sm font-semibold text-white transition hover:bg-[#21492e] disabled:cursor-not-allowed disabled:bg-black/10 disabled:text-black/40 sm:w-auto"
            >
              {isCreating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Builder openen in nieuw tabblad
                  <ArrowUpRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </section>

        {totalPending > 0 ? (
          <section className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 py-4">
            <p className="text-sm text-[#676e69]">
              <span className="font-medium text-[#171b18]">
                {totalPending} open verplichte {totalPending === 1 ? "inzending" : "inzendingen"}
              </span>
              {totalOverdue > 0 ? ` · ${totalOverdue} over tijd` : ""}
            </p>
            <RemindPendingFormsButton />
          </section>
        ) : null}

        <FormGroup
          label="Actieve formulieren"
          description="Live voor deelnemers met een actieve toewijzing."
          empty="Er staat nog geen formulier live. Activeer hieronder een concept."
          forms={active}
          actionKey={actionKey}
          onAction={runAction}
        />

        {drafts.length > 0 ? (
          <FormGroup
            label="Concepten"
            description="Nog niet zichtbaar voor deelnemers. Controleer het formulier en zet het daarna live."
            forms={drafts}
            actionKey={actionKey}
            onAction={runAction}
          />
        ) : null}

        {archived.length > 0 ? (
          <FormGroup
            label="Archief"
            description="Niet meer actief, maar veilig bewaard. Je kunt elk formulier opnieuw activeren of dupliceren."
            forms={archived}
            actionKey={actionKey}
            onAction={runAction}
          />
        ) : null}

        {initialForms.length === 0 ? (
          <p className="py-10 text-sm text-[#757c77]">
            Nog geen formulieren. Geef hierboven een titel op om je eerste intake te bouwen.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function FormGroup({
  label,
  description,
  forms,
  empty,
  actionKey,
  onAction,
}: {
  label: string;
  description?: string;
  forms: FormOverview[];
  empty?: string;
  actionKey: string | null;
  onAction: (form: FormOverview, action: "publish" | "archive" | "restore" | "duplicate") => void;
}) {
  if (forms.length === 0 && !empty) return null;

  return (
    <section className="py-10">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="text-lg font-medium tracking-[-0.02em] text-[#171b18]">{label}</h2>
        {description ? <p className="max-w-xl text-xs leading-5 text-[#676e69]">{description}</p> : null}
      </div>
      {forms.length === 0 ? (
        <p className="mt-5 text-sm text-[#757c77]">{empty}</p>
      ) : (
        <div className="mt-5 divide-y divide-black/10 border-y border-black/10">
          {forms.map((form) => (
            <FormRow key={form.id} form={form} actionKey={actionKey} onAction={onAction} />
          ))}
        </div>
      )}
    </section>
  );
}

function FormRow({
  form,
  actionKey,
  onAction,
}: {
  form: FormOverview;
  actionKey: string | null;
  onAction: (form: FormOverview, action: "publish" | "archive" | "restore" | "duplicate") => void;
}) {
  const meta = [
    `${form._count.questions} ${form._count.questions === 1 ? "vraag" : "vragen"}`,
    `${form._count.assignments} ${form._count.assignments === 1 ? "toewijzing" : "toewijzingen"}`,
    `${form._count.responses} ${form._count.responses === 1 ? "antwoord" : "antwoorden"}`,
  ].join(" · ");

  return (
    <div className="grid gap-3 py-5 sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          {form.status === "PUBLISHED" ? (
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#3f7d4e]" aria-hidden />
          ) : null}
          <Link
            href={`/admin/forms/${form.id}`}
            className="text-sm font-medium text-[#171b18] transition hover:text-[#173622]"
          >
            {form.title}
          </Link>
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#77807a]">
            {form.status === "PUBLISHED" ? "Live" : form.status === "ARCHIVED" ? "Gearchiveerd" : "Concept"}
          </span>
          {form.isOnboardingForm ? (
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#41614b]">
              Onboarding
            </span>
          ) : null}
        </div>
        <p className="mt-1.5 text-xs leading-5 text-[#676e69]">
          <span className="text-[#828983]">/forms/{form.slug}</span> · {meta}
          {form.pendingRequired > 0 ? (
            <span className="font-medium text-[#9a5713]"> · {form.pendingRequired} open verplicht</span>
          ) : null}
          {form.overdueRequired > 0 ? (
            <span className="font-medium text-[#a32b23]"> · {form.overdueRequired} over tijd</span>
          ) : null}
        </p>
        {form.participantProgress.total > 0 ? (
          <Link
            href={`/admin/forms/${form.id}?tab=participants&filter=${form.participantProgress.pending > 0 ? "pending" : "all"}`}
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-[#173622] underline decoration-[#173622]/25 underline-offset-4 hover:decoration-[#173622]"
          >
            <Users className="h-3.5 w-3.5" />
            {form.participantProgress.completed} van {form.participantProgress.total} ingevuld
            {form.participantProgress.pending > 0
              ? ` · Bekijk ${form.participantProgress.pending} ${form.participantProgress.pending === 1 ? "persoon" : "personen"}`
              : " · Iedereen is klaar"}
          </Link>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs sm:justify-end">
        <Link
          href={`/forms/${form.slug}`}
          target="_blank"
          rel="noopener"
          className="inline-flex h-9 items-center gap-1 px-2 text-[#707772] transition hover:text-[#173622]"
        >
          Preview
          <ArrowUpRight className="h-3 w-3" />
        </Link>
        <Link
          href={`/admin/forms/${form.id}?tab=builder`}
          target="_blank"
          rel="noopener"
          className="group inline-flex h-9 items-center gap-1.5 px-2 font-semibold text-[#173622]"
        >
          Builder
          <ArrowUpRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
        <button
          type="button"
          onClick={() => onAction(form, "duplicate")}
          disabled={actionKey !== null}
          className="inline-flex h-9 items-center gap-1.5 px-2 font-medium text-[#4f5751] transition hover:bg-[#f4f6f1] hover:text-[#173622] disabled:opacity-50"
        >
          {actionKey === `${form.id}:duplicate` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />}
          Dupliceren
        </button>
        {form.status === "DRAFT" ? (
          <button
            type="button"
            onClick={() => onAction(form, "publish")}
            disabled={actionKey !== null}
            className="inline-flex h-9 items-center gap-1.5 bg-[#173622] px-3 font-semibold text-white transition hover:bg-[#21492e] disabled:opacity-50"
          >
            {actionKey === `${form.id}:publish` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlayCircle className="h-3.5 w-3.5" />}
            Activeren
          </button>
        ) : form.status === "ARCHIVED" ? (
          <button
            type="button"
            onClick={() => onAction(form, "restore")}
            disabled={actionKey !== null}
            className="inline-flex h-9 items-center gap-1.5 bg-[#173622] px-3 font-semibold text-white transition hover:bg-[#21492e] disabled:opacity-50"
          >
            {actionKey === `${form.id}:restore` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
            Opnieuw activeren
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onAction(form, "archive")}
            disabled={actionKey !== null}
            className="inline-flex h-9 items-center gap-1.5 px-2 text-[#707772] transition hover:bg-[#f4f6f1] hover:text-[#173622] disabled:opacity-50"
          >
            {actionKey === `${form.id}:archive` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Archive className="h-3.5 w-3.5" />}
            Archiveren
          </button>
        )}
      </div>
    </div>
  );
}
