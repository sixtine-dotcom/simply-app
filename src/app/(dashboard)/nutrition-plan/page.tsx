import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, FileText, Download } from "lucide-react";

export default async function NutritionPlanPage() {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect("/login");
  }

  const nutritionPlan = await db.nutritionPlan.findFirst({
    where: { userId: user.id, availableAt: { lte: new Date() } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-white">
    <div className="mx-auto max-w-3xl p-4 md:p-6 lg:p-8">
      <Link 
        href="/"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Terug naar overzicht
      </Link>

      <div className="app-panel app-halo mb-6 overflow-hidden">
        <h1 className="mt-3 flex items-center gap-3 font-display text-3xl tracking-tight text-slate-950 md:text-5xl">
          <FileText className="h-7 w-7 text-primary" />
          Mijn voedingsschema
        </h1>
        <p className="mt-3 text-muted-foreground">
          Download je persoonlijke schema of bekijk wanneer het beschikbaar komt.
        </p>
      </div>

      <Card className="app-halo">
        <CardHeader>
          <CardTitle className="font-display text-2xl tracking-tight">Jouw plan</CardTitle>
        </CardHeader>
        <CardContent>
          {nutritionPlan ? (
            <div className="space-y-4">
              <div>
                <h3 className="mb-2 font-display text-lg tracking-tight">
                  {nutritionPlan.title}
                </h3>
                {nutritionPlan.displayFileName ? (
                  <p className="text-sm text-muted-foreground">{nutritionPlan.displayFileName}</p>
                ) : null}
              </div>

              {nutritionPlan.fileUrl && (
                <div className="flex gap-4 pt-4 border-t">
                  <Button asChild>
                    <a href={`/api/nutrition-plan/${nutritionPlan.id}/download`}>
                      <Download className="h-4 w-4 mr-2" />
                      Download mijn voedingsschema
                    </a>
                  </Button>
                </div>
              )}

              {nutritionPlan.fileUrl ? (
                <div className="overflow-hidden rounded-2xl border bg-stone-50">
                  <iframe
                    src={nutritionPlan.fileUrl}
                    title={nutritionPlan.title}
                    className="h-[70vh] w-full"
                  />
                </div>
              ) : null}

              {!nutritionPlan.fileUrl && (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Je voedingsschema wordt binnenkort beschikbaar gesteld.</p>
                  <p className="text-sm mt-2">
                    Neem contact op met je coach voor meer informatie.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h2 className="mb-2 font-display text-xl tracking-tight">
                Geen schema beschikbaar
              </h2>
              <p>
                Je persoonlijke voedingsschema wordt door je coach aangemaakt.
              </p>
              <p className="text-sm mt-2">
                Neem contact op met je coach voor meer informatie.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </div>
  );
}
