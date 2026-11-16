import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { DeletionActions } from "./deletion-actions";
export default async function AccountDeletionsPage(){
  const user=await getCurrentUser();if(!user || !['ADMIN','SUPERADMIN'].includes(user.role))redirect('/login');
  const requests=await db.accountDeletionRequest.findMany({where:user.role==='SUPERADMIN'?{}:{tenantId:user.tenantId},orderBy:{requestedAt:'desc'},take:100});
  return <main className="mx-auto max-w-4xl space-y-5 p-4 md:p-8"><h1 className="text-2xl font-semibold">Accountverwijderingen</h1><p className="text-sm text-muted-foreground">Behandel verzoeken zorgvuldig en houd de aanvrager op de hoogte. Definitieve verwijdering wist de gekoppelde appgegevens en kan niet ongedaan worden gemaakt.</p>
    {!requests.length?<p className="rounded-2xl border p-6 text-sm">Er zijn geen verwijderverzoeken.</p>:requests.map(request=><article key={request.id} className="rounded-2xl border bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-medium">{request.email||'Verwijderd account'}</h2><span className="text-sm">{request.status==='COMPLETED'?'Afgerond':request.status==='PROCESSING'?'In behandeling':'Nieuw'}</span></div><p className="mt-1 text-xs text-muted-foreground">Aangevraagd op {request.requestedAt.toLocaleString('nl-BE',{timeZone:'Europe/Brussels'})} · {request.id}</p>{request.status!=='COMPLETED'&&request.email?<DeletionActions id={request.id} email={request.email}/>:null}</article>)}
  </main>;
}
