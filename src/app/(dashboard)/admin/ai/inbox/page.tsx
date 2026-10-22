"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Inbox, ShieldAlert, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

type Escalation = {
  id: string;
  question: string;
  reason: string;
  priority: string;
  createdAt: string;
  user: { firstName: string; lastName: string; email: string };
};

export default function AiInboxPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<Escalation[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/ai/escalations?status=open");
    if (response.ok) setItems(await response.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function complete(item: Escalation, addToKnowledge: boolean) {
    const resolution = (answers[item.id] || "").trim();
    if (addToKnowledge && !resolution) {
      toast({ title: "Schrijf eerst je antwoord", variant: "destructive" });
      return;
    }
    const response = await fetch(`/api/admin/ai/escalations/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "resolved", resolution, addToKnowledge }),
    });
    if (!response.ok) {
      toast({ title: "Opslaan mislukt", variant: "destructive" });
      return;
    }
    setItems((current) => current.filter((entry) => entry.id !== item.id));
    toast({ title: addToKnowledge ? "Beantwoord en toegevoegd aan de FAQ" : "Afgehandeld" });
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mx-auto max-w-5xl">
        <Link href="/admin/ai" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Terug naar AI Knowledge
        </Link>
        <div className="mt-4 flex items-end justify-between border-b pb-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-primary">SIX AI</p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight">AI Inbox</h1>
            <p className="mt-1 text-sm text-muted-foreground">Vragen waarvoor SIX geen veilig, goedgekeurd antwoord vond.</p>
          </div>
          <span className="rounded-full border bg-background px-3 py-1 text-xs font-medium">{items.length} open</span>
        </div>

        {loading ? <p className="py-12 text-sm text-muted-foreground">Inbox laden…</p> : null}
        {!loading && items.length === 0 ? (
          <div className="mt-6 flex min-h-52 flex-col items-center justify-center rounded-2xl border bg-white text-center">
            <Inbox className="h-6 w-6 text-primary" />
            <p className="mt-3 text-sm font-medium">Alles is beantwoord</p>
            <p className="mt-1 text-xs text-muted-foreground">Nieuwe doorgestuurde vragen verschijnen hier.</p>
          </div>
        ) : null}

        <div className="mt-5 divide-y rounded-2xl border bg-white">
          {items.map((item) => (
            <article key={item.id} className="p-4 md:p-5">
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                {item.reason === "medical" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 font-medium text-red-700">
                    <ShieldAlert className="h-3 w-3" /> Medisch/persoonlijk
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-50 px-2 py-1 font-medium text-amber-800">Geen bron</span>
                )}
                <span className="inline-flex items-center gap-1"><UserRound className="h-3 w-3" /> {item.user.firstName} {item.user.lastName}</span>
                <span>{new Date(item.createdAt).toLocaleString("nl-BE")}</span>
              </div>
              <p className="mt-3 text-sm font-medium leading-6">{item.question}</p>
              <Textarea
                value={answers[item.id] || ""}
                onChange={(event) => setAnswers((current) => ({ ...current, [item.id]: event.target.value }))}
                placeholder="Schrijf hier je antwoord. Je kunt het meteen als nieuw FAQ-antwoord bewaren."
                className="mt-4 min-h-24 text-sm"
              />
              <div className="mt-3 flex flex-wrap justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => complete(item, false)}>Alleen afhandelen</Button>
                <Button size="sm" className="gap-1.5" onClick={() => complete(item, true)}>
                  <Check className="h-3.5 w-3.5" /> Beantwoorden + toevoegen aan FAQ
                </Button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
