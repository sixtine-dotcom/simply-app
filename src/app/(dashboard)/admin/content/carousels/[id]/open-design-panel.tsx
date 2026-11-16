"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { EditorCarousel } from "./carousel-editor";

type Connection = { available: boolean; projectExists?: boolean; projectUrl?: string | null; stale?: boolean; error?: string; run?: { status: string; error: string | null; needsCredit: boolean } | null };

export function OpenDesignPanel({ carousel, disabled, dirty, onBusy, onUpdated }: {
  carousel: EditorCarousel;
  disabled: boolean;
  dirty: boolean;
  onBusy: (busy: boolean) => void;
  onUpdated: (carousel: EditorCarousel) => void;
}) {
  const [connection, setConnection] = useState<Connection | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [action, setAction] = useState<"create" | "export" | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/admin/carousels/${carousel.id}/open-design`, { cache: "no-store", signal: controller.signal })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Verbinding controleren mislukt");
        if (!controller.signal.aborted) setConnection(data);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setConnection({ available: false, error: err instanceof Error ? err.message : "Verbinding controleren mislukt" });
      });
    return () => controller.abort();
  }, [carousel.id, carousel.updatedAt, attempt]);

  const runStatus = connection?.run?.status;
  const designing = Boolean(runStatus && !["succeeded", "failed", "canceled"].includes(runStatus));
  useEffect(() => {
    if (!designing) return;
    const timer = setTimeout(() => setAttempt((value) => value + 1), 4000);
    return () => clearTimeout(timer);
  }, [designing, attempt]);

  async function perform(next: "create" | "export") {
    setAction(next);
    onBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/carousels/${carousel.id}/open-design`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Open Design kon de actie niet uitvoeren");
      setConnection(null);
      onUpdated(data.carousel);
    } catch (err) {
      setError(err instanceof Error ? err.message : "De verbinding is onderbroken. Probeer opnieuw.");
    } finally {
      setAction(null);
      onBusy(false);
    }
  }

  const blocked = disabled || dirty || action !== null || !connection?.available;
  const linked = Boolean(carousel.openDesignProjectId);
  return (
    <section aria-labelledby="open-design-title" className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="open-design-title" className="font-semibold text-slate-950">Ontwerpen in Open Design</h2>
        <span className="text-xs text-muted-foreground" role="status">
          {action ? (action === "create" ? "De ontwerpopdracht wordt gestart…" : "Slides worden opgehaald… Dit kan enkele minuten duren.") : connection === null ? "Verbinding controleren…" : designing ? "Open Design maakt je ontwerp…" : connection.available ? "Verbonden met Open Design op je Mac" : "Geen verbinding"}
        </span>
      </div>
      <p className="max-w-3xl text-sm text-muted-foreground">
        {linked
          ? "Werk de slides af in Open Design. Haal ze daarna hier op om ze na te kijken en in te plannen."
          : "Maak een bewerkbaar ontwerp met je goedgekeurde teksten. Open Design krijgt één bestand per slide in Instagram-formaat."}
      </p>
      {connection?.stale ? <p className="text-sm text-amber-800">De tekst of foto’s zijn sinds het aanmaken gewijzigd. Maak een nieuw ontwerp met de huidige inhoud. Je vorige ontwerp blijft in Open Design bewaard.</p> : null}
      {linked && connection?.available && !connection.projectExists ? <p className="text-sm text-amber-800">Het gekoppelde project is niet gevonden op deze Mac. Maak een nieuw ontwerp om verder te gaan.</p> : null}
      {connection?.error ? <p className="text-sm text-slate-700">{connection.error}</p> : null}
      {linked && connection?.available && connection.projectExists && !connection.run ? <p className="text-sm text-amber-800">Dit project bevat startbestanden. Er is nog geen echte ontwerpopdracht afgerond. Start een nieuw ontwerp om Open Design de slides te laten vormgeven.</p> : null}
      {connection?.run?.error ? <p role="alert" className="text-sm text-red-700">{connection.run.error}</p> : null}
      {connection?.run?.needsCredit ? <a href="https://open-design.ai/cloud/dashboard?source=open_design" target="_blank" rel="noreferrer" className="inline-block text-sm underline underline-offset-2">Open Design-tegoed bekijken</a> : null}
      {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
      <div className="flex flex-wrap items-center gap-2">
        {connection?.projectUrl ? (
          <a href={connection.projectUrl} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-200 px-3 text-sm font-medium hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            Open ontwerp <ExternalLink className="h-3.5 w-3.5" />
          </a>
        ) : null}
        {linked && connection?.projectExists ? (
          <Button disabled={blocked || connection.stale || connection.run?.status !== "succeeded"} onClick={() => void perform("export")}>
            {action === "export" ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null} Haal slides op
          </Button>
        ) : null}
        <Button variant={linked ? "outline" : "default"} disabled={blocked || designing} onClick={() => void perform("create")}>
          {action === "create" ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
          {linked ? "Nieuw ontwerp met deze inhoud" : "Maak in Open Design"}
        </Button>
        {!connection?.available ? <Button variant="outline" disabled={disabled || connection === null} onClick={() => setAttempt((v) => v + 1)}><RefreshCw className="mr-1.5 h-4 w-4" /> Opnieuw verbinden</Button> : null}
        {dirty ? <span className="text-xs text-muted-foreground">Wacht tot je wijzigingen zijn opgeslagen.</span> : null}
      </div>
      {linked && connection?.available && !connection.projectUrl && connection.projectExists ? <p className="text-sm text-muted-foreground">Open de Open Design-app en kies het project met de titel van deze carousel.</p> : null}
    </section>
  );
}
