"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, FileSpreadsheet } from "lucide-react";

const EXAMPLE_CSV = `email;voornaam;achternaam
klant1@voorbeeld.nl;Jan;Jansen
klant2@voorbeeld.nl;Marie;de Vries`;

export function ImportCSVForm({ embedded = false }: { embedded?: boolean }) {
  const router = useRouter();
  const [csv, setCsv] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    created: number;
    skipped: number;
    invited: number;
    inviteFailures: number;
    inviteFailureEmails?: string[];
    devRegistrationLinks?: { email: string; url: string }[];
  } | null>(null);

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
      setResult({
        created: data.created,
        skipped: data.skipped,
        invited: data.invited || 0,
        inviteFailures: data.inviteFailures || 0,
        inviteFailureEmails: data.inviteFailureEmails || [],
        devRegistrationLinks: data.devRegistrationLinks || [],
      });
      setCsv("");
      router.refresh();
    } catch {
      setError("Er is iets misgegaan");
    } finally {
      setIsLoading(false);
    }
  };

  const content = (
    <>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileSpreadsheet className="h-4 w-4" />
          Klanten importeren via CSV
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Upload een CSV met kolommen: <strong>email</strong> (verplicht), <strong>voornaam</strong> en <strong>achternaam</strong>.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/20 px-6 py-8 text-center transition hover:border-primary/40 hover:bg-muted/40">
            <FileSpreadsheet className="h-8 w-8 text-primary" />
            <span className="mt-3 font-medium">Kies een CSV-bestand</span>
            <span className="mt-1 text-xs text-muted-foreground">.csv · gescheiden met ; of ,</span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              disabled={isLoading}
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (file) setCsv(await file.text());
                event.target.value = "";
              }}
            />
          </label>
          {csv ? <p className="text-sm text-emerald-700">CSV-bestand klaar om te importeren.</p> : null}
          <textarea
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            placeholder="Of plak de CSV-gegevens hier…"
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
          <div className="space-y-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
            <p>
              {result.created} klant(en) aangemaakt. {result.invited} activatielink(s) verstuurd.
              {result.skipped > 0 ? ` ${result.skipped} overgeslagen.` : ""}
            </p>
            {result.inviteFailures > 0 ? (
              <p className="text-amber-700">
                {result.inviteFailures} activatielink(s) konden niet per email verstuurd worden.
              </p>
            ) : null}
            {result.inviteFailureEmails && result.inviteFailureEmails.length > 0 ? (
              <p className="text-xs text-muted-foreground">
                Zonder mail verstuurd: {result.inviteFailureEmails.join(", ")}
              </p>
            ) : null}
            {result.devRegistrationLinks && result.devRegistrationLinks.length > 0 ? (
              <div className="space-y-1">
                <p className="text-xs font-medium text-green-900">Development activatielinks</p>
                <div className="space-y-1">
                  {result.devRegistrationLinks.slice(0, 5).map((link) => (
                    <a
                      key={link.email}
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block truncate underline underline-offset-4"
                    >
                      {link.email}
                    </a>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </CardContent>
    </>
  );

  return embedded ? <div>{content}</div> : <Card>{content}</Card>;
}
