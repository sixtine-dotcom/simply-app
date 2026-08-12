"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

type Customer = { email: string; firstName: string; lastName: string };

export function CampaignForm({ customers, adminEmail }: { customers: Customer[]; adminEmail: string }) {
  const { toast } = useToast();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [testSent, setTestSent] = useState(false);
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const visible = useMemo(() => customers.filter((customer) => `${customer.firstName} ${customer.lastName} ${customer.email}`.toLowerCase().includes(search.toLowerCase())), [customers, search]);

  async function request(path: string, body: object) {
    setBusy(true);
    try {
      const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Er ging iets mis");
      return data;
    } finally { setBusy(false); }
  }

  async function sendTest() {
    try { await request("/api/admin/email-campaigns/test", { email: adminEmail, subject, message }); setTestSent(true); toast({ title: "Testmail verstuurd", description: `Controleer ${adminEmail}.` }); }
    catch (error) { toast({ title: "Testmail mislukt", description: error instanceof Error ? error.message : "Onbekende fout" }); }
  }

  async function start() {
    if (!confirm(`Campagne starten voor ${selected.length} expliciet geselecteerde ontvangers?`)) return;
    try { const data = await request("/api/admin/email-campaigns", { subject, message, recipients: selected, testConfirmed: testSent, consentConfirmed }); toast({ title: "Campagne ingepland", description: `${data.recipients} ontvangers · maximaal vier mails per minuut.` }); setSelected([]); setConsentConfirmed(false); setTestSent(false); }
    catch (error) { toast({ title: "Campagne niet gestart", description: error instanceof Error ? error.message : "Onbekende fout" }); }
  }

  return <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="font-semibold">E-mail schrijven</h2>
      <p className="mt-1 text-xs text-muted-foreground">Van: Simply in Balance &lt;sixtine@simplyinbalance.com&gt; · antwoorden komen bij Sixtine.</p>
      <label className="mt-5 block text-sm font-medium">Onderwerp</label><Input className="mt-2" value={subject} onChange={(e) => { setSubject(e.target.value); setTestSent(false); }} />
      <label className="mt-4 block text-sm font-medium">Bericht</label><Textarea className="mt-2 min-h-72" value={message} onChange={(e) => { setMessage(e.target.value); setTestSent(false); }} placeholder="Schrijf hier je e-mail…" />
      <label className="mt-4 flex items-start gap-2 text-xs text-muted-foreground"><input className="mt-0.5" type="checkbox" checked={consentConfirmed} onChange={(e) => setConsentConfirmed(e.target.checked)} /><span>Ik bevestig dat de geselecteerde ontvangers toestemming hebben gegeven voor deze e-mails.</span></label>
      <div className="mt-5 flex flex-wrap gap-2"><Button variant="outline" disabled={busy || !subject || !message} onClick={sendTest}>{testSent ? "✓ Testmail verstuurd" : "Stuur test naar mezelf"}</Button><Button disabled={busy || !subject || !message || !selected.length || !testSent || !consentConfirmed} onClick={start}>Campagne starten ({selected.length})</Button></div>
      {!testSent && <p className="mt-2 text-xs text-muted-foreground">Stuur eerst een testmail voordat je de campagne kunt starten.</p>}
    </section>
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold">Ontvangers met toestemming</h2><p className="text-xs text-muted-foreground">Selecteer alleen klanten die marketingmails willen ontvangen.</p></div><span className="text-sm font-semibold">{selected.length}</span></div>
      <Input className="mt-4" placeholder="Zoek klant…" value={search} onChange={(e) => setSearch(e.target.value)} />
      <div className="mt-3 max-h-[430px] space-y-1 overflow-y-auto">
        {visible.map((customer) => <label key={customer.email} className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-100 p-3 hover:bg-slate-50"><input type="checkbox" checked={selected.includes(customer.email)} onChange={(e) => setSelected((current) => e.target.checked ? [...current, customer.email] : current.filter((value) => value !== customer.email))} /><span className="min-w-0"><span className="block truncate text-sm font-medium">{customer.firstName} {customer.lastName}</span><span className="block truncate text-xs text-muted-foreground">{customer.email}</span></span></label>)}
      </div>
    </section>
  </div>;
}
