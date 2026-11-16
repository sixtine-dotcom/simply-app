import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { deletionResources, eraseRequestedClientAccount } from "@/lib/account-deletion";

async function authorize(id:string) {
  const user=await getCurrentUser();
  if(!user || user.impersonation || !["ADMIN","SUPERADMIN"].includes(user.role))return null;
  const request=await db.accountDeletionRequest.findFirst({where:{id,...(user.role!=="SUPERADMIN"?{tenantId:user.tenantId}:{})}});
  return request?{user,request}:null;
}
export async function GET(_req:NextRequest,{params}:{params:Promise<{id:string}>}) {
  const auth=await authorize((await params).id);
  if(!auth)return NextResponse.json({error:"Geen toegang."},{status:403});
  const resources=auth.request.userId?await deletionResources(auth.request.userId):null;
  return NextResponse.json({request:auth.request,resources},{headers:{"Cache-Control":"private, no-store"}});
}
export async function POST(req:NextRequest,{params}:{params:Promise<{id:string}>}) {
  try {
    const auth=await authorize((await params).id);
    if(!auth)return NextResponse.json({error:"Geen toegang."},{status:403});
    const origin=req.headers.get("origin");if(origin && origin!==req.nextUrl.origin)return NextResponse.json({error:"Ongeldig verzoek."},{status:403});
    const body=await req.json();
    if(body.action==="start") {
      if(auth.request.status!=="COMPLETED")await db.accountDeletionRequest.update({where:{id:auth.request.id},data:{status:"PROCESSING"}});
      return NextResponse.json({success:true});
    }
    if(body.action!=="erase" || typeof body.email!=="string" || body.externalDataReviewed!==true)return NextResponse.json({error:"Controleer de externe gegevens en bevestig het e-mailadres."},{status:400});
    const result=await eraseRequestedClientAccount(auth.request.id,body.email,true);
    const confirmationSent = result.confirmationEmail ? (await sendEmail({to:result.confirmationEmail,subject:"Je Simply App-account is verwijderd",html:"<p>Je account en de bijbehorende appgegevens zijn verwijderd.</p><p>Dit bericht is de bevestiging van je verwijderverzoek. Voor vragen kun je antwoorden op deze e-mail.</p>"})).success : true;
    return NextResponse.json({success:true,alreadyCompleted:result.alreadyCompleted,confirmationSent});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Verwijderen is mislukt."},{status:400});}
}
