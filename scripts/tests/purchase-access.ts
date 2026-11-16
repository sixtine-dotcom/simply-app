import assert from "node:assert/strict";
import { createHmac, createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { isTrustedRegistrationInvitation } from "../../src/lib/registration-access";

async function main() {
  process.env.AUTH_SECRET = "test-erasure-key";
  process.env.SHOPIFY_WEBHOOK_SECRET = "shopify-test-secret";
  process.env.RESEND_API_KEY = "re_test_no_real_delivery";
  process.env.APP_URL = "https://example.com";
  const users: any[] = [], enrollments: any[] = [], tokens: any[] = [], logs: any[] = [], mails: any[] = [];
  let failMail = false;
  const matchAudit = (entry: any, where: any) => (!where.userId || entry.userId === where.userId) &&
    (typeof where.action === "string" ? entry.action === where.action : !where.action?.in || where.action.in.includes(entry.action)) &&
    (!where.metadata || entry.metadata?.[where.metadata.path[0]] === where.metadata.equals);
  const fake: any = {
    user: {
      findUnique: async ({ where }: any) => users.find(u => where.email ? u.email === where.email : u.id === where.id) || null,
      create: async ({ data }: any) => { const u = { id: `u${users.length}`, deletedAt: null, lastLoginAt: null, ...data }; users.push(u); return u; },
      update: async ({ where, data }: any) => Object.assign(users.find(u => u.id === where.id), data),
    },
    accountDeletionRequest: { findMany: async () => [] },
    tenant: { findMany: async () => [{ id: "tenant" }] },
    shopifyProductMapping: { findUnique: async ({ where }: any) => where.shopifyProductId === "101" ? { courseId: "course", accessDays: 180, course: { id: "course", title: "Testcursus", trajectoryStartDate: null, trajectoryEndDate: null } } : null },
    enrollment: {
      findUnique: async ({ where }: any) => { const e = enrollments.find(e => e.userId === where.userId_courseId.userId && e.courseId === where.userId_courseId.courseId); return e ? { ...e, course: { id: "course", coachId: "coach" }, user: { tenantId: "tenant" } } : null; },
      findFirst: async ({ where }: any) => enrollments.find(e => e.userId === where.userId && (!where.shopifyOrderId || e.shopifyOrderId === where.shopifyOrderId)) || null,
      create: async ({ data }: any) => { const e = { id: `e${enrollments.length}`, ...data }; enrollments.push(e); return e; },
    },
    verificationToken: {
      deleteMany: async ({ where }: any) => { for (let i=tokens.length-1;i>=0;i--) if(tokens[i].email===where.email && tokens[i].type===where.type) tokens.splice(i,1); },
      create: async ({ data }: any) => { const t={ id:`t${tokens.length}`, usedAt:null, ...data };tokens.push(t);return t; },
      findUnique: async ({ where }: any) => tokens.find(t=>t.token===where.token) || null,
      findMany: async ({ where }: any) => tokens.filter(t=>t.email===where.email && t.type===where.type),
      updateMany: async ({ where, data }: any) => { const t=tokens.find(t=>t.token===where.token && t.type===where.type && !t.usedAt && t.expiresAt>where.expiresAt.gt);if(t)Object.assign(t,data);return {count:t?1:0}; },
      update: async ({ where, data }: any) => Object.assign(tokens.find(t=>t.id===where.id),data),
    },
    auditLog: {
      create: async ({ data }: any) => {logs.push({id:`a${logs.length}`,...data});},
      findFirst: async ({ where }: any) => logs.find(e=>matchAudit(e,where)) || null,
      findMany: async () => [],
    },
  };
  fake.$transaction = async (callback: any) => callback(fake);
  (globalThis as any).prisma = fake;
  globalThis.fetch = async (input: any, init?: RequestInit) => {
    assert(String(input).startsWith("https://api.resend.com/"), "No real services may be called by this test");
    if (failMail) {failMail=false;return new Response(JSON.stringify({message:"Test failure",name:"test_error"}),{status:500,headers:{"Content-Type":"application/json"}});}
    mails.push(JSON.parse(String(init?.body)));return new Response(JSON.stringify({id:"test-mail"}),{headers:{"Content-Type":"application/json"}});
  };
  const { POST: webhook } = await import("../../src/app/api/webhooks/shopify/route");
  const { POST: register } = await import("../../src/app/api/auth/register/route");
  const { createRegistrationToken, verifyRegistrationToken, completeRegistration, verifyMagicLink } = await import("../../src/lib/auth");
  const { hasProvisionedAccountAccess } = await import("../../src/lib/account-access");
  const customer = (email: string) => ({id:123,email,first_name:"Test",last_name:"Klant"});
  const order = (id: number, email: string, product_id=101, financial_status="paid") => ({id,financial_status,customer:customer(email),line_items:[{product_id,title:"Test",quantity:1,price:"10"}]});
  const send = (topic: string, data: unknown, valid=true) => {
    const body=JSON.stringify(data);const signature=valid?createHmac("sha256",process.env.SHOPIFY_WEBHOOK_SECRET!).update(body).digest("base64"):"invalid";
    return webhook(new NextRequest("https://example.com/api/webhooks/shopify",{method:"POST",headers:{"x-shopify-topic":topic,"x-shopify-hmac-sha256":signature},body}));
  };
  assert.equal((await register()).status,403);
  assert.equal((await send("orders/paid",order(1,"bad@example.com"),false)).status,401);
  await send("customers/create",customer("contact@example.com"));assert.equal(users.length,0);
  await send("orders/paid",order(2,"unpaid@example.com",101,"pending"));assert.equal(users.length,0);
  await send("orders/paid",order(3,"unmapped@example.com",999));assert.equal(users.length,0);assert.equal(mails.length,0);
  assert.equal((await send("orders/paid",order(4,"buyer@example.com"))).status,200);
  assert.equal(users.length,1);assert.equal(enrollments.length,1);assert.equal(mails.length,1);
  const activation=mails[0].html.match(/register\/complete\?token=([a-f0-9]+)/)?.[1];assert(activation);
  assert((await verifyRegistrationToken(activation)).success);
  assert(!(await verifyMagicLink(activation)).success,"Activation tokens cannot bypass profile completion via magic-link verification");
  assert((await completeRegistration(activation,"Test","Klant","0400000000")).success);
  assert(!(await completeRegistration(activation,"Test","Klant","0400000000")).success,"Activation is single-use");
  users[0].lastLoginAt = new Date();
  await send("orders/paid",order(4,"buyer@example.com"));assert.equal(mails.length,1,"A successful order replay does not send a duplicate email");
  assert(await hasProvisionedAccountAccess(users[0]));
  const contact=await fake.user.create({data:{email:"existing-contact@example.com",role:"CLIENT"}});
  assert(!await hasProvisionedAccountAccess(contact),"An old shop contact without purchase cannot log in");
  await send("orders/paid",order(5,contact.email));assert.equal(mails.length,2,"Existing shop contacts still get an activation email after purchase");
  const old="old-public-registration";
  tokens.push({id:"old",token:createHash("sha256").update(old).digest("hex"),email:"outsider@example.com",type:"registration",metadata:{accountType:"client"},usedAt:null,expiresAt:new Date(Date.now()+10000)});
  assert(!(await verifyRegistrationToken(old)).success);assert(!(await completeRegistration(old,"A","B","0400000000")).success);
  assert(!users.some(u=>u.email==="outsider@example.com"));
  const cancelled=await createRegistrationToken(contact.email,{accountType:"client",source:"shopify_paid",orderId:"5"});
  enrollments.splice(enrollments.findIndex(e=>e.userId===contact.id),1);assert(!(await verifyRegistrationToken(cancelled)).success);
  const staffClient=await fake.user.create({data:{email:"invited@example.com",role:"CLIENT"}});
  await createRegistrationToken(staffClient.email,{accountType:"client",source:"admin_user_create"});assert(await hasProvisionedAccountAccess(staffClient),"Explicit administrator invitations are preserved");
  assert(!isTrustedRegistrationInvitation({accountType:"tenant_admin",source:"admin_user_create"}));
  failMail=true;const before=mails.length;
  const expectedError=console.error;console.error=()=>{};
  try {assert.equal((await send("orders/paid",order(6,"retry@example.com"))).status,500);}finally{console.error=expectedError;}
  assert.equal((await send("orders/paid",order(6,"retry@example.com"))).status,200);assert.equal(mails.length,before+1,"Failed delivery is retried even though enrollment already exists");
  console.log("PASS: public registration denied; signature/payment/product checks; no contact-only accounts; purchase activation; replay and delivery retry; old-link rejection; token purpose and single use; staff invitations preserved. No real email or database used.");
}
main().catch(error=>{console.error(error);process.exitCode=1;});
