import Link from "next/link";
import { redirect } from "next/navigation";
import { ClipboardList, Lock, Sparkles } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getAssignedFormsForUser } from "@/lib/forms";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <Card className="overflow-hidden app-halo">
          <CardContent className="p-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-3 py-1 text-xs uppercase tracking-[0.28em] text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              Formulieren
            </div>
            <h1 className="mt-4 font-display text-4xl tracking-tight text-slate-900">
              Intake, onboarding en check-ins op één plek.
            </h1>
            <p className="mt-4 max-w-2xl text-base text-muted-foreground">
              Vul hier de formulieren in die aan jouw traject, community of account zijn toegewezen.
            </p>
          </CardContent>
        </Card>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {forms.length === 0 ? (
            <Card className="app-halo md:col-span-2 xl:col-span-3">
              <CardContent className="py-16 text-center">
                <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h2 className="mt-4 text-lg font-semibold">Nog geen formulieren toegewezen</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Zodra je coach of admin een formulier voor jouw groep activeert, verschijnt het hier.
                </p>
              </CardContent>
            </Card>
          ) : (
            forms.map((entry) => (
              <Card key={entry.assignment.id} className="app-halo">
                <CardHeader>
                  <CardTitle>{entry.assignment.form.title}</CardTitle>
                  <CardDescription>
                    {entry.assignment.title || entry.assignment.form.description || "Vul dit formulier in voor je volgende stap."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full bg-muted px-3 py-1.5">
                      {entry.questionCount} vragen
                    </span>
                    {entry.assignment.isRequired ? (
                      <span className="rounded-full bg-primary/10 px-3 py-1.5 text-primary">
                        Verplicht
                      </span>
                    ) : null}
                    {entry.isOverdue ? (
                      <span className="rounded-full bg-red-50 px-3 py-1.5 text-red-700">
                        Deadline verstreken
                      </span>
                    ) : null}
                    {entry.isSubmitted ? (
                      <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700">
                        Ingevuld
                      </span>
                    ) : null}
                  </div>

                  {entry.assignment.dueAt ? (
                    <p className="text-sm text-muted-foreground">
                      Verplicht vóór {new Date(entry.assignment.dueAt).toLocaleString("nl-BE")}
                    </p>
                  ) : null}

                  <Button asChild className="w-full">
                    <Link href={`/forms/${entry.assignment.form.slug}`}>
                      {entry.isSubmitted ? "Antwoorden bekijken" : "Formulier openen"}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </section>

        <Card className="app-halo border-dashed">
          <CardContent className="flex items-start gap-4 p-6 text-sm text-muted-foreground">
            <Lock className="mt-0.5 h-4 w-4" />
            Formulieren zijn alleen zichtbaar voor leden die effectief aan de juiste rol, cursus, community of persoonlijke toewijzing gekoppeld zijn.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
