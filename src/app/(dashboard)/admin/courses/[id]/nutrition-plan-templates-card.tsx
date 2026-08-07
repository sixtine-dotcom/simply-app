"use client";

import { useState } from "react";
import { FileText, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Template = { biologicalSex: "FEMALE" | "MALE"; title: string; fileUrl: string };

export function NutritionPlanTemplatesCard({
  courseId,
  initialTemplates,
}: {
  courseId: string;
  initialTemplates: Template[];
}) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function upload(sex: "FEMALE" | "MALE", file: File) {
    setLoading(sex);
    setMessage(null);
    try {
      const payload = new FormData();
      payload.append("file", file);
      const uploadResponse = await fetch("/api/upload", { method: "POST", body: payload });
      const uploaded = await uploadResponse.json();
      if (!uploadResponse.ok) throw new Error(uploaded.error || "Upload mislukt");

      const title = sex === "FEMALE" ? "Voedingsschema voor vrouwen" : "Voedingsschema voor mannen";
      const response = await fetch(`/api/admin/courses/${courseId}/nutrition-plan-templates`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ biologicalSex: sex, fileUrl: uploaded.url, title }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Opslaan mislukt");
      setTemplates((current) => [
        ...current.filter((template) => template.biologicalSex !== sex),
        result.template,
      ]);
      setMessage("PDF opgeslagen en beschikbare klantplannen bijgewerkt.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload mislukt");
    } finally {
      setLoading(null);
    }
  }

  return (
    <Card className="app-halo">
      <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />Voedingsschema-templates</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-6 text-muted-foreground">
          Upload één PDF voor vrouwen en één voor mannen. Na intake en op de startdatum verschijnt automatisch de juiste versie met de klantnaam als bestandsnaam.
        </p>
        {(["FEMALE", "MALE"] as const).map((sex) => {
          const template = templates.find((item) => item.biologicalSex === sex);
          const label = sex === "FEMALE" ? "Schema voor vrouwen" : "Schema voor mannen";
          return (
            <div key={sex} className="rounded-2xl border bg-white/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <div><p className="font-medium">{label}</p><p className="mt-1 text-xs text-muted-foreground">{template ? "PDF staat klaar" : "Nog geen PDF geüpload"}</p></div>
                <Button asChild variant={template ? "outline" : "default"} size="sm">
                  <label className="cursor-pointer">
                    <Upload className="mr-2 h-4 w-4" />
                    {loading === sex ? "Bezig…" : template ? "Vervangen" : "Uploaden"}
                    <input
                      type="file"
                      accept="application/pdf,.pdf"
                      className="sr-only"
                      disabled={Boolean(loading)}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void upload(sex, file);
                        event.target.value = "";
                      }}
                    />
                  </label>
                </Button>
              </div>
            </div>
          );
        })}
        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      </CardContent>
    </Card>
  );
}
