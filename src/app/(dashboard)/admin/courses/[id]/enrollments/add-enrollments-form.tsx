"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export function AddEnrollmentsForm({ courseId }: { courseId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [emailsText, setEmailsText] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [csvText, setCsvText] = useState("");
  const [useCsv, setUseCsv] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const parseCsv = (text: string): { email: string; startDate?: string; endDate?: string }[] => {
    const lines = text.trim().split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 1) return [];
    const sep = lines[0].includes(";") ? ";" : ",";
    const cols = lines[0].toLowerCase().split(sep).map((c) => c.trim());
    const emailIdx = cols.findIndex((c) => c === "email" || c === "e-mail");
    const startIdx = cols.findIndex((c) => c === "start" || c === "startdatum" || c === "startdate");
    const endIdx = cols.findIndex((c) => c === "eind" || c === "einddatum" || c === "enddate" || c === "end");
    if (emailIdx === -1) return [];
    const rows: { email: string; startDate?: string; endDate?: string }[] = [];
    for (let i = 1; i < lines.length; i++) {
      const vals = lines[i].split(sep).map((v) => v.trim().replace(/^"|"$/g, ""));
      const email = (vals[emailIdx] ?? "").toLowerCase().trim();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) continue;
      rows.push({
        email,
        startDate: startIdx >= 0 && vals[startIdx] ? vals[startIdx] : undefined,
        endDate: endIdx >= 0 && vals[endIdx] ? vals[endIdx] : undefined,
      });
    }
    return rows;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (useCsv && csvText.trim()) {
      const rows = parseCsv(csvText);
      if (rows.length === 0) {
        toast({
          title: "Geen geldige rijen in CSV",
          description: "CSV moet header hebben met o.a. email, en optioneel start/eind.",
          variant: "destructive",
        });
        return;
        }
      setIsLoading(true);
      let created = 0;
      let skipped = 0;
      try {
        for (const row of rows) {
          const res = await fetch(`/api/admin/courses/${courseId}/enrollments`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              emails: [row.email],
              startDate: row.startDate || undefined,
              endDate: row.endDate || null,
            }),
          });
          const data = await res.json();
          if (res.ok) {
            created += data.created;
            skipped += data.skipped;
          }
        }
        toast({
          title: "CSV verwerkt",
          description: `${created} ingeschreven, ${skipped} overgeslagen.`,
        });
        setCsvText("");
        router.refresh();
      } catch (err) {
        toast({ title: "Fout", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
      return;
    }

    const emails = emailsText
      .split(/[\n,;]/)
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s));
    if (emails.length === 0) {
      toast({
        title: "Geen geldige e-mailadressen",
        description: "Voer minimaal één geldig e-mailadres in (één per regel).",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/enrollments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emails,
          startDate: startDate || undefined,
          endDate: endDate || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Mislukt");
      toast({
        title: "Toegevoegd",
        description: `${data.created} deelnemer(s) ingeschreven. ${data.skipped > 0 ? `${data.skipped} stonden al ingeschreven.` : ""}`,
      });
      setEmailsText("");
      router.refresh();
    } catch (err) {
      toast({
        title: "Fout",
        description: err instanceof Error ? err.message : "Kon niet toevoegen",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex gap-2 mb-2">
        <Button
          type="button"
          variant={!useCsv ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setUseCsv(false)}
        >
          E-mails handmatig
        </Button>
        <Button
          type="button"
          variant={useCsv ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setUseCsv(true)}
        >
          CSV plakken
        </Button>
      </div>

      {!useCsv ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="emails">E-mailadressen (één per regel)</Label>
            <textarea
              id="emails"
              value={emailsText}
              onChange={(e) => setEmailsText(e.target.value)}
              placeholder="klant1@voorbeeld.nl&#10;klant2@voorbeeld.nl"
              className="w-full h-24 p-3 rounded-md border bg-muted/30 text-sm font-mono"
              disabled={isLoading}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Startdatum (optioneel)</Label>
              <Input
                id="startDate"
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">Leeg = vandaag. Dripping telt vanaf deze datum.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Einddatum (optioneel)</Label>
              <Input
                id="endDate"
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">Na deze datum verdwijnt de cursus voor de deelnemer.</p>
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="csv">CSV (email;startdatum;einddatum)</Label>
          <textarea
            id="csv"
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder={'email;startdatum;einddatum\nklant@nl.nl;2025-01-01;2025-02-01'}
            className="w-full h-32 p-3 rounded-md border bg-muted/30 text-sm font-mono"
            disabled={isLoading}
          />
          <p className="text-xs text-muted-foreground">
            Header: email (verplicht), startdatum en einddatum optioneel. Scheiding ; of ,
          </p>
        </div>
      )}

      <Button type="submit" disabled={isLoading}>
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : useCsv ? "CSV importeren" : "Inschrijven"}
      </Button>
    </form>
  );
}
