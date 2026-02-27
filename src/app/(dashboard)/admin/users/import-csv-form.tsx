"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, FileSpreadsheet } from "lucide-react";

const EXAMPLE_CSV = `email;voornaam;achternaam
klant1@voorbeeld.nl;Jan;Jansen
klant2@voorbeeld.nl;Marie;de Vries`;

export function ImportCSVForm() {
  const router = useRouter();
  const [csv, setCsv] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/admin/users/import-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Er is iets misgegaan");
        return;
      }
      setResult({ created: data.created, skipped: data.skipped });
      setCsv("");
      router.refresh();
    } catch {
      setError("Er is iets misgegaan");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileSpreadsheet className="h-4 w-4" />
          Klanten importeren via CSV
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Plak een CSV met kolommen: <strong>email</strong> (verplicht), <strong>voornaam</strong>, <strong>achternaam</strong>. Scheiding met ; of ,
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            placeholder={EXAMPLE_CSV}
            className="w-full h-32 p-3 rounded-md border bg-muted/30 font-mono text-sm"
            disabled={isLoading}
          />
          <div className="flex gap-2">
            <Button type="submit" disabled={isLoading || !csv.trim()}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Importeren"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCsv(EXAMPLE_CSV)}
              disabled={isLoading}
            >
              Vul voorbeeld in
            </Button>
          </div>
        </form>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {result && (
          <p className="text-sm text-green-600">
            {result.created} klant(en) aangemaakt. {result.skipped > 0 && `${result.skipped} overgeslagen (bestonden al).`}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
