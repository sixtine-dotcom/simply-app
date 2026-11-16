"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DeletionActions({id,email}:{id:string;email:string}) {
  const router=useRouter();const [data,setData]=useState<{resources:{files:string[];services:string[];recordings:Array<{dailyRecordingId:string;googleDriveWebViewLink:string|null}>}}|null>(null);
  const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
  async function load(){setBusy(true);try{const r=await fetch(`/api/admin/account-deletions/${id}`,{cache:'no-store'});const d=await r.json();if(!r.ok)throw Error(d.error);setData(d);}catch(err){setMessage(err instanceof Error?err.message:'Laden mislukt.');}finally{setBusy(false);}}
  return <div className="mt-3">
    {!data?<Button variant="outline" disabled={busy} onClick={load}>Gegevens controleren</Button>:<div className="space-y-4">
      <p className="text-sm leading-6 text-muted-foreground">Controleer persoonlijke uploads, opnames en gekoppelde diensten voordat je definitief verwijdert. Verwijder geen gedeelde cursusbestanden. Benodigde administratie bij Shopify wordt apart beoordeeld.</p>
      <div className="text-sm"><p className="font-medium">Bestanden ({data.resources.files.length})</p>{data.resources.files.length?<ul className="mt-2 max-h-48 space-y-2 overflow-auto">{data.resources.files.map(url=><li key={url}><a href={url} target="_blank" rel="noopener noreferrer" className="break-all text-primary underline">{url}</a></li>)}</ul>:<p>Geen bestanden gevonden in de gekoppelde velden. Controleer ook eventuele losse uploads.</p>}</div>
      <p className="text-sm">Gekoppelde diensten: {data.resources.services.join(', ')||'geen'}. {data.resources.recordings.length} opnameverwijzing(en) om te beoordelen.</p>
      {data.resources.recordings.map(record=><p key={record.dailyRecordingId} className="break-all text-xs">Daily: {record.dailyRecordingId}{record.googleDriveWebViewLink?<> · <a className="underline" href={record.googleDriveWebViewLink} target="_blank" rel="noopener noreferrer">Open Drive-opname</a></>:null}</p>)}
      <form className="space-y-3" onSubmit={async event=>{event.preventDefault();setBusy(true);setMessage('');const f=new FormData(event.currentTarget);try{const r=await fetch(`/api/admin/account-deletions/${id}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'erase',email:f.get('email'),externalDataReviewed:f.get('external')==='on'})});const d=await r.json();if(!r.ok)throw Error(d.error);router.refresh();setMessage(d.confirmationSent===false?'Account verwijderd. De bevestigingsmail is niet verstuurd; rond de communicatie handmatig af.':'Account en appgegevens verwijderd.');}catch(err){setMessage(err instanceof Error?err.message:'Verwijderen mislukt.');}finally{setBusy(false);}}}>
        <label className="flex items-start gap-2 text-sm"><input name="external" type="checkbox" required className="mt-1"/><span>Ik heb de persoonlijke bestanden, opnames, externe identiteiten en gekoppelde diensten verwerkt en eventuele noodzakelijke bewaarplichten beoordeeld.</span></label>
        <div className="max-w-md space-y-1"><Label htmlFor={`confirm-${id}`}>Typ {email} om definitief te verwijderen</Label><Input id={`confirm-${id}`} name="email" type="email" required autoComplete="off"/></div>
        <Button type="submit" variant="destructive" disabled={busy}>{busy?'Verwijderen…':'Account definitief verwijderen'}</Button>
      </form>
    </div>}
    {message?<p role="status" className="mt-3 text-sm">{message}</p>:null}
  </div>;
}
