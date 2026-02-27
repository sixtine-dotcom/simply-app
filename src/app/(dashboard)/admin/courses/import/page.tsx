"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, FileJson, CheckCircle } from "lucide-react";

const EXAMPLE_JSON = `{
  "course": {
    "title": "Mijn cursus uit Huddle",
    "slug": "mijn-cursus",
    "description": "Korte omschrijving van de cursus."
  },
  "modules": [
    {
      "title": "Week 1 - Intro",
      "description": "Kennismaking",
      "position": 0,
      "lessons": [
        {
          "title": "Welkom",
          "content": "<p>Welkom bij deze cursus.</p>",
          "position": 0,
          "videoUrl": "https://www.loom.com/share/xxx"
        },
        {
          "title": "Les 2",
          "content": "<p>Inhoud les 2.</p>",
          "position": 1
        }
      ]
    },
    {
      "title": "Week 2 - Verdieping",
      "position": 1,
      "lessons": [
        { "title": "Les 1", "position": 0 },
        { "title": "Les 2", "position": 1 }
      ]
    }
  ]
}`;

export default function ImportCoursePage() {
  const router = useRouter();
  const [json, setJson] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ title: string; id: string } | null>(null);

  const handleImport = async () => {
    setError("");
    setSuccess(null);
    const trimmed = json.trim();
    if (!trimmed) {
      setError("Plak eerst de JSON van je cursus.");
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      setError("Ongeldige JSON. Controleer of alles tussen { } staat en komma's kloppen.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/courses/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Import mislukt.");
        return;
      }

      setSuccess({ title: data.course.title, id: data.course.id });
      setJson("");
    } catch {
      setError("Er is iets misgegaan. Probeer het opnieuw.");
    } finally {
      setIsLoading(false);
    }
  };

  const fillExample = () => {
    setJson(EXAMPLE_JSON);
    setError("");
  };

  return (
    <div className="p-6 md:p-8 lg:p-12 max-w-4xl">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/courses" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Terug naar cursussen
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileJson className="h-6 w-6 text-primary" />
            <CardTitle className="font-display text-xl tracking-wider">
              CURSUS IMPORTEREN
            </CardTitle>
          </div>
          <CardDescription>
            Plak hier de JSON van je cursus (bijv. uit Huddle of handmatig opgebouwd). De cursus wordt in één keer aangemaakt met alle modules en lessen.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">JSON cursusstructuur</label>
            <textarea
              value={json}
              onChange={(e) => setJson(e.target.value)}
              placeholder='{ "course": { "title": "..." }, "modules": [ ... ] }'
              className="w-full h-64 p-4 rounded-lg border bg-muted/30 font-mono text-sm resize-y"
              disabled={isLoading}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={fillExample} variant="outline" size="sm" disabled={isLoading}>
              Vul voorbeeld in
            </Button>
            <Button onClick={handleImport} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importeren...
                </>
              ) : (
                "Cursus importeren"
              )}
            </Button>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {success && (
            <div className="flex items-center gap-2 p-4 bg-success/10 rounded-lg text-success">
              <CheckCircle className="h-5 w-5 shrink-0" />
              <div>
                <p className="font-medium">Cursus geïmporteerd: {success.title}</p>
                <p className="text-sm opacity-90">
                  <Link href={`/admin/courses/${success.id}`} className="underline">
                    Bewerk cursus
                  </Link>
                  {" · "}
                  <Link href="/admin/courses" className="underline">
                    Naar overzicht
                  </Link>
                </p>
              </div>
            </div>
          )}

          <div className="pt-4 border-t text-sm text-muted-foreground space-y-2">
            <p className="font-medium">Verwacht formaat:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><code className="bg-muted px-1 rounded">course</code>: title (verplicht), slug (optioneel), description (optioneel)</li>
              <li><code className="bg-muted px-1 rounded">modules</code>: array met title, description (optioneel), position (optioneel)</li>
              <li>Elke module kan <code className="bg-muted px-1 rounded">lessons</code> hebben: title, content (optioneel), position (optioneel), videoUrl (optioneel, bijv. Loom)</li>
            </ul>
            <p>Geen export uit Huddle? Bouw de JSON handmatig op basis van je cursusstructuur of gebruik het voorbeeld hierboven.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
