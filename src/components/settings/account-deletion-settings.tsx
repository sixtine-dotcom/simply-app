"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AccountDeletionSettings({ email }: { email: string }) {
  const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const [request,setRequest]=useState<{id:string;status:string;requestedAt:string}|null>(null);
  useEffect(()=>{fetch('/api/user/account-deletion',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(d=>{if(d?.request)setRequest(d.request)}).catch(()=>{});},[]);
  return <section id="delete-account" className="rounded-2xl border border-border bg-white p-6">
    <h2 className="text-lg font-semibold">Account verwijderen</h2>
    <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Je kunt je account en bijbehorende persoonsgegevens laten verwijderen. Je verliest daarna toegang tot je lessen, voortgang, berichten en trackers. Dit kan niet ongedaan worden gemaakt.</p>
    <p className="mt-2 text-sm leading-6 text-muted-foreground">We behandelen dit handmatig en streven naar afhandeling binnen 30 dagen. Je ontvangt een e-mail zodra het is afgerond. Verwijdering beëindigt niet automatisch een lopende betaalafspraak of overeenkomst voor je traject.</p>
    {request?<p role="status" className="mt-4 text-sm text-primary">Je verzoek van {new Date(request.requestedAt).toLocaleDateString('nl-BE')} is {request.status==='PROCESSING'?'in behandeling':'ontvangen'}. Je kunt je account blijven gebruiken totdat de verwijdering is uitgevoerd.</p>:<>
      <Button variant="outline" className="mt-4 text-red-700" onClick={()=>setOpen(!open)} aria-expanded={open}>Accountverwijdering aanvragen</Button>
      {open?<form className="mt-4 max-w-lg space-y-3" onSubmit={async event=>{
        event.preventDefault();setBusy(true);setError('');const data=new FormData(event.currentTarget);
        try{const response=await fetch('/api/user/account-deletion',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:data.get('email'),confirmation:data.get('confirmation')})});const body=await response.json();if(!response.ok)throw Error(body.error);setRequest(body.request);setOpen(false);}catch(err){setError(err instanceof Error?err.message:'Je verzoek kon niet worden opgeslagen.');}finally{setBusy(false);}
      }}>
        <div className="space-y-1"><Label htmlFor="deletion-email">Bevestig je e-mailadres</Label><Input id="deletion-email" name="email" type="email" autoComplete="email" placeholder={email} required maxLength={254}/></div>
        <div className="space-y-1"><Label htmlFor="deletion-word">Typ VERWIJDER om te bevestigen</Label><Input id="deletion-word" name="confirmation" autoComplete="off" required pattern="VERWIJDER"/></div>
        <Button type="submit" disabled={busy} variant="destructive">{busy?'Verzoek opslaan…':'Verwijderverzoek indienen'}</Button>
      </form>:null}
    </>}
    {error?<p role="alert" className="mt-3 text-sm text-red-700">{error}</p>:null}
  </section>;
}
