"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PasswordSettings() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  return <div>
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-medium">Wachtwoord</p><p className="text-sm text-muted-foreground">Je kunt ook altijd met een inloglink blijven inloggen.</p></div><Button variant="outline" onClick={() => setOpen(!open)} aria-expanded={open}>Instellen of wijzigen</Button></div>
    {open ? <form className="mt-4 space-y-3" onSubmit={async event => {
      event.preventDefault();const form=event.currentTarget;const data=new FormData(form);setError(false);setMessage("");
      if(data.get("password")!==data.get("confirm")){setError(true);setMessage("De wachtwoorden zijn niet hetzelfde.");return;}
      setBusy(true);
      try {const response=await fetch("/api/user/password",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password:data.get("password"),currentPassword:data.get("currentPassword")||undefined})});const result=await response.json();if(!response.ok)throw Error(result.error);form.reset();setOpen(false);setMessage("Je wachtwoord is opgeslagen. Je andere apparaten zijn uitgelogd.");}catch(err){setError(true);setMessage(err instanceof Error?err.message:"Opslaan lukt niet.");}finally{setBusy(false);}
    }}>
      <div className="space-y-1"><Label htmlFor="current-password">Huidig wachtwoord (optioneel)</Label><Input id="current-password" name="currentPassword" type="password" autoComplete="current-password" maxLength={256}/><p className="text-xs text-muted-foreground">Net opnieuw ingelogd met een inloglink? Dan kun je dit veld leeg laten.</p></div>
      <div className="space-y-1"><Label htmlFor="new-password">Nieuw wachtwoord</Label><Input id="new-password" name="password" type="password" autoComplete="new-password" minLength={12} maxLength={256} required/><p className="text-xs text-muted-foreground">Gebruik minstens 12 tekens.</p></div>
      <div className="space-y-1"><Label htmlFor="confirm-password">Herhaal je nieuwe wachtwoord</Label><Input id="confirm-password" name="confirm" type="password" autoComplete="new-password" minLength={12} maxLength={256} required/></div>
      <Button disabled={busy} type="submit">{busy?"Opslaan…":"Wachtwoord opslaan"}</Button>
    </form> : null}
    {message?<p className={`mt-3 text-sm ${error?"text-red-700":"text-primary"}`} role={error?"alert":"status"}>{message}</p>:null}
  </div>;
}
