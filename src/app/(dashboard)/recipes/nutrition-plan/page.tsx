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
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-6 md:p-8 lg:p-12 max-w-2xl mx-auto">
      <Link 
        href="/recipes"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Terug naar recepten
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-2xl tracking-wider flex items-center gap-2">
            <FileText className="h-6 w-6" />
            VOEDINGSSCHEMA
          </CardTitle>
        </CardHeader>
        <CardContent>
          {nutritionPlan ? (
            <div className="space-y-4">
              <div>
                <h3 className="font-display text-lg tracking-wider mb-2">
                  {nutritionPlan.title}
                </h3>
              </div>

              {nutritionPlan.fileUrl && (
                <div className="flex gap-4 pt-4 border-t">
                  <Button asChild>
                    <a href={nutritionPlan.fileUrl} target="_blank" rel="noopener noreferrer">
                      <Download className="h-4 w-4 mr-2" />
                      Download Schema
                    </a>
                  </Button>
                </div>
              )}

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
              <h2 className="font-display text-xl tracking-wider mb-2">
                GEEN SCHEMA BESCHIKBAAR
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
  );
}
