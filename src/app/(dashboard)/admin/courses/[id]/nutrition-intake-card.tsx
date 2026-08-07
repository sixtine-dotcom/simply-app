"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function NutritionIntakeCard({ courseId, formId }: { courseId: string; formId: string | null }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enable() {
    setLoading(true);
    setError(null);
    const response = await fetch(`/api/admin/courses/${courseId}/nutrition-intake`, { method: "POST" });
    const result = await response.json();
    setLoading(false);
    if (!response.ok) {
      setError(result.error || "Aanmaken is niet gelukt");
      return;
    }
    router.refresh();
  }

  return (
    <Card className="border-amber-200 bg-amber-50/70">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5" />Voedingsintake</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-6 text-muted-foreground">
          Klanten zien deze opdracht onmiddellijk na aankoop. Cursus en gekoppelde community blijven op slot tot volledige indiening.
        </p>
        <div className="mt-4 flex items-center gap-2 text-sm font-medium text-amber-950">
          <Lock className="h-4 w-4" />
          {formId ? "Toegangspoort is actief" : "Nog niet geactiveerd voor dit traject"}
        </div>
        {formId ? (
          <Button asChild className="mt-5 w-full"><Link href={`/admin/forms/${formId}`}>Vragenlijst bekijken en aanpassen</Link></Button>
        ) : (
          <Button onClick={enable} disabled={loading} className="mt-5 w-full">{loading ? "Aanmaken…" : "Voedingsintake aanmaken"}</Button>
        )}
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
