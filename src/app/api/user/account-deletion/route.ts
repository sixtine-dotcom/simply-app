import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { deletionEmailDigest } from "@/lib/account-deletion";

export async function GET() {
  const user=await getCurrentUser();
  if(!user)return NextResponse.json({error:"Log opnieuw in."},{status:401});
  const request=await db.accountDeletionRequest.findUnique({where:{userId:user.id},select:{id:true,status:true,requestedAt:true}});
  return NextResponse.json({request},{headers:{"Cache-Control":"private, no-store"}});
}
export async function POST(request:NextRequest) {
  try {
    const user=await getCurrentUser();
    if(!user)return NextResponse.json({error:"Log opnieuw in."},{status:401});
    if(user.impersonation || user.role!=="CLIENT")return NextResponse.json({error:"Dit verzoek kan alleen vanuit het eigen klantaccount worden ingediend. Neem voor teamaccounts contact op met de beheerder."},{status:403});
    const origin=request.headers.get("origin");
    if(origin && origin!==request.nextUrl.origin)return NextResponse.json({error:"Ongeldig verzoek."},{status:403});
    const body=await request.json();
    if(body.confirmation!=="VERWIJDER" || body.email?.trim().toLowerCase()!==user.email.toLowerCase())return NextResponse.json({error:"Vul je eigen e-mailadres en VERWIJDER in."},{status:400});
    const result=await db.$transaction(async tx=>{
      const existing=await tx.accountDeletionRequest.findUnique({where:{userId:user.id}});
      if(existing)return existing;
      const orders=await tx.enrollment.findMany({where:{userId:user.id,shopifyOrderId:{not:null}},select:{shopifyOrderId:true}});
      const saved=await tx.accountDeletionRequest.create({data:{userId:user.id,tenantId:user.tenantId,email:user.email,emailDigest:deletionEmailDigest(user.email),shopifyOrderIds:orders.map(o=>o.shopifyOrderId!)}});
      const admins=await tx.user.findMany({where:{deletedAt:null,OR:[{role:"SUPERADMIN"},{role:"ADMIN",tenantId:user.tenantId}]},select:{id:true}});
      await tx.notification.createMany({data:admins.map(admin=>({userId:admin.id,type:"privacy",title:"Accountverwijdering aangevraagd",body:"Er staat een nieuw verwijderverzoek klaar om af te handelen.",link:`/admin/account-deletions?request=${saved.id}`}))});
      return saved;
    });
    return NextResponse.json({request:{id:result.id,status:result.status,requestedAt:result.requestedAt}});
  } catch {return NextResponse.json({error:"Je verzoek kon niet worden opgeslagen. Probeer het opnieuw of mail sixtine@simplyinbalance.com."},{status:500});}
}
