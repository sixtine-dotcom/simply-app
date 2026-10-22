import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Lock,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getAssignedFormsForUser } from "@/lib/forms";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("nl-BE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

export default async function FormsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const forms = await getAssignedFormsForUser({
    userId: user.id,
    role: user.role,
    tenantId: user.tenantId,
  });

  const pendingForms = forms.filter((entry) => !entry.isSubmitted);
  const nextPending = pendingForms.find((entry) => entry.assignment.isRequired) ?? pendingForms[0] ?? null;

  return (
    <main className="min-h-screen bg-white text-[#171b18]">
      <div className="mx-auto max-w-[1320px] px-5 py-6 sm:px-8 lg:px-12 lg:py-10">
        <header className="flex items-end justify-between border-b border-black/10 pb-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[#667069]">
              Jouw omgeving
            </p>
            <h1 className="mt-2 text-[1.1rem] font-medium tracking-[-0.02em]">
              Formulieren
            </h1>
          </div>
          <p className="hidden text-xs capitalize text-[#747b76] sm:block">
            {formatDate(new Date())}
          </p>
        </header>

        <section className="mt-7 border-b border-black/10 pb-10">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#41614b]">
            Intake & opvolging
          </p>
          <h2 className="mt-5 max-w-2xl [font-family:'The_Seasons',Georgia,serif] text-[clamp(2.2rem,4.5vw,4rem)] font-normal leading-[0.96] tracking-[-0.04em] text-[#191c19]">
            {nextPending ? "Klaar om te starten?" : "Alles is ingevuld."}
          </h2>
          <p className="mt-5 max-w-xl text-sm leading-6 text-[#676e69]">
            Eén vraag per keer, rustig tempo — net zoals een persoonlijk gesprek.
          </p>
        </section>

        {nextPending?.assignment.isRequired && !nextPending.isSubmitted ? (
          <section className="mt-6 grid gap-5 bg-[#173622] px-5 py-5 text-white sm:grid-cols-[1fr_auto] sm:items-center sm:px-7">
            <div className="flex items-start gap-3">
              <ClipboardList className="mt-0.5 h-4 w-4 shrink-0 text-white/70" />
              <div>
                <h2 className="text-sm font-semibold">{nextPending.assignment.form.title}</h2>
                <p className="mt-1 text-xs leading-5 text-white/65">
                  {nextPending.assignment.title ||
                    nextPending.assignment.form.description ||
                    "Start het formulier om verder te gaan in je traject."}
                </p>
              </div>
            </div>
            <Link
              href={`/forms/${nextPending.assignment.form.slug}`}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-white px-5 text-xs font-semibold text-[#173622] transition hover:bg-[#f2f3f0]"
            >
              Start <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </section>
        ) : null}

        <section className="mt-10">
          <div className="mb-6 flex items-end justify-between gap-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[#667069]">
              Jouw formulieren
            </p>
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#747b76]">
              {pendingForms.length} open
            </span>
          </div>

          {forms.length === 0 ? (
            <div className="rounded-2xl border border-black/10 bg-[#fafaf8] px-5 py-16 text-center">
              <ClipboardList className="mx-auto h-5 w-5 text-[#7b827d]" />
              <h2 className="mt-4 text-sm font-semibold text-[#181c19]">Nog geen formulieren toegewezen</h2>
              <p className="mt-2 text-xs leading-5 text-[#707772]">
                Zodra je coach een formulier activeert, verschijnt het hier.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {forms.map((entry) => (
                <Link
                  key={entry.assignment.id}
                  href={`/forms/${entry.assignment.form.slug}`}
                  className="group flex min-h-[220px] flex-col justify-between rounded-2xl border border-black/10 bg-[#fafaf8] p-6 transition hover:border-[#173622]/25 hover:bg-white hover:shadow-[0_20px_50px_-40px_rgba(23,54,34,0.45)]"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      {entry.isSubmitted ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#edf4ee] px-2.5 py-1 text-[10px] font-medium text-[#173622]">
                          <CheckCircle2 className="h-3 w-3" />
                          Ingevuld
                        </span>
                      ) : entry.assignment.isRequired ? (
                        <span className="rounded-full bg-[#173622]/10 px-2.5 py-1 text-[10px] font-medium text-[#173622]">
                          Verplicht
                        </span>
                      ) : (
                        <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-medium text-[#707772]">
                          Optioneel
                        </span>
                      )}
                      {entry.isOverdue ? (
                        <span className="rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-medium text-red-700">
                          Te laat
                        </span>
                      ) : null}
                    </div>
                    <h3 className="mt-4 text-xl font-semibold tracking-[-0.02em] text-[#181c19]">
                      {entry.assignment.form.title}
                    </h3>
                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-[#676e69]">
                      {entry.assignment.title ||
                        entry.assignment.form.description ||
                        "Beantwoord een paar korte vragen in je eigen tempo."}
                    </p>
                  </div>
                  <div className="mt-6 flex items-center justify-between gap-3">
                    <span className="text-[11px] text-[#929792]">
                      {entry.questionCount} {entry.questionCount === 1 ? "vraag" : "vragen"}
                    </span>
                    <span className="inline-flex h-10 items-center gap-2 rounded-full bg-[#173622] px-4 text-xs font-semibold text-white transition group-hover:bg-[#21492e]">
                      {entry.isSubmitted ? "Bekijken" : "Start"}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="mt-10 flex items-start gap-3 border-t border-black/10 pt-6 text-xs leading-5 text-[#707772]">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <p>
            Formulieren zijn alleen zichtbaar voor leden die aan de juiste rol, cursus, community of
            persoonlijke toewijzing gekoppeld zijn.
          </p>
        </section>
      </div>
    </main>
  );
}
