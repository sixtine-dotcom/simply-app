"use client";

import { useState } from "react";
import { CalendarPlus, Copy, Download, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AddSessionsToCalendar() {
  const [open, setOpen] = useState(false);
  const [feedUrl, setFeedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function toggle() {
    if (open) { setOpen(false); return; }
    setOpen(true);
    if (feedUrl) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/sessions/calendar?format=links", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Je agenda kon niet worden geladen.");
      setFeedUrl(data.feedUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Probeer het opnieuw.");
    } finally {
      setLoading(false);
    }
  }

  async function copyLink() {
    if (!feedUrl) return;
    try {
      await navigator.clipboard.writeText(feedUrl);
      setCopied(true);
    } catch {
      setError("Kopiëren lukt niet. Selecteer en kopieer de agendalink hieronder.");
    }
  }

  const local = feedUrl ? /^(localhost|127\.0\.0\.1|\[::1\])$/.test(new URL(feedUrl).hostname) || new URL(feedUrl).hostname.endsWith(".localhost") : false;

  return (
    <div className="mb-6">
      <Button onClick={toggle} aria-expanded={open} aria-controls="coaching-calendar-options" className="w-full bg-[#173622] hover:bg-[#21492e] sm:w-auto">
        <CalendarPlus className="mr-2 h-4 w-4" aria-hidden="true" />
        Alle sessies in je agenda
      </Button>
      {open ? (
        <div id="coaching-calendar-options" className="mt-3 rounded-2xl border border-black/10 bg-white p-5">
          <h2 className="text-sm font-semibold text-[#181c19]">Kies je agenda</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-[#68706a]">Voeg je coachingsagenda één keer toe. Nieuwe sessies en wijzigingen worden daarna opgehaald door je agenda. Dat kan even duren.</p>
          {loading ? <p role="status" className="mt-4 flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Je agenda wordt klaargezet…</p> : null}
          {error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : null}
          {feedUrl ? (
            <>
              {local ? <p className="mt-3 text-sm leading-6 text-amber-900">Op localhost kun je het agendabestand testen. Koppelen met Apple of Google kan zodra het platform online staat.</p> : (
                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <Button variant="outline" asChild><a href={feedUrl.replace(/^https?:/, "webcal:")}>Apple Agenda <ExternalLink className="ml-2 h-4 w-4" aria-hidden="true" /></a></Button>
                  <Button variant="outline" asChild><a href={`https://calendar.google.com/calendar/u/0/r?cid=${encodeURIComponent(feedUrl)}`} target="_blank" rel="noopener noreferrer">Google Agenda <ExternalLink className="ml-2 h-4 w-4" aria-hidden="true" /></a></Button>
                  <Button variant="outline" onClick={copyLink}><Copy className="mr-2 h-4 w-4" aria-hidden="true" />{copied ? "Link gekopieerd" : "Agendalink kopiëren"}</Button>
                </div>
              )}
              <p className="mt-3 text-sm leading-6 text-[#68706a]">Gebruik je Google Agenda op Android? Voeg de agenda via Google Agenda op je computer toe met hetzelfde Google-account. Daarna verschijnt hij ook op je telefoon. In Outlook kies je ‘Abonneren via internet’ en plak je de agendalink.</p>
              {!local ? <details className="mt-3 text-sm text-[#68706a]"><summary className="cursor-pointer font-medium text-[#173622]">Lukt het openen niet?</summary><p className="mt-2 leading-6">Open het platform in Safari of Chrome en probeer opnieuw, of kopieer de link naar je agenda. Houd deze persoonlijke link voor jezelf.</p><input aria-label="Persoonlijke agendalink" readOnly value={feedUrl} onFocus={(event) => event.currentTarget.select()} className="mt-2 w-full rounded-lg border border-black/15 px-3 py-2 text-sm" /></details> : null}
              <div className="mt-4 border-t border-black/10 pt-4">
                <a href={`${feedUrl}&download=1`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-[#173622] underline underline-offset-4"><Download className="h-4 w-4" aria-hidden="true" /> Alle sessies downloaden</a>
                <p className="text-xs leading-5 text-[#68706a]">Eenmalig importeren in Apple Agenda, Outlook of een andere agenda. Wijzigingen komen bij deze optie niet automatisch mee.</p>
              </div>
            </>
          ) : null}
          {error && !feedUrl ? <Button variant="outline" className="mt-3" onClick={() => { setOpen(false); }}>Sluiten en opnieuw proberen</Button> : null}
          <span role="status" className="sr-only">{copied ? "Agendalink gekopieerd" : ""}</span>
        </div>
      ) : null}
    </div>
  );
}
