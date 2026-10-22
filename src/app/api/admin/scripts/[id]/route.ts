import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireVideoAdmin } from "@/lib/video-studio";

export const dynamic = "force-dynamic";

async function find(id: string, tenantId: string | null | undefined) {
  return db.reelScript.findFirst({ where: { id, tenantId: tenantId ?? null } });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireVideoAdmin();
  if (!user) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  const script = await find((await params).id, user.tenantId);
  if (!script) return NextResponse.json({ error: "Script niet gevonden" }, { status: 404 });
  return NextResponse.json({ script });
}

const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("save"),
    headline: z.string().trim().min(1).max(200).optional(),
    hook: z.string().max(2000).optional(),
    credibility: z.string().max(2000).optional(),
    value: z.string().max(8000).optional(),
    cta: z.string().max(2000).optional(),
  }),
  z.object({ action: z.literal("status"), status: z.enum(["DRAFT", "READY", "RECORDED"]) }),
  z.object({ action: z.literal("rewrite"), feedback: z.string().trim().min(3, "Schrijf kort wat er anders moet").max(4000) }),
]);

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireVideoAdmin();
  if (!user) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  const { id } = await params;
  const current = await find(id, user.tenantId);
  if (!current) return NextResponse.json({ error: "Script niet gevonden" }, { status: 404 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Ongeldige actie" }, { status: 400 });
  const input = parsed.data;
  const { action, ...rest } = input as { action: string } & Record<string, unknown>;
  const data =
    action === "save"
      ? rest
      : action === "status"
        ? { status: input.action === "status" ? input.status : "DRAFT", recordedAt: input.action === "status" && input.status === "RECORDED" ? new Date() : null }
        : { status: "WRITING", feedback: input.action === "rewrite" ? input.feedback : null, errorMessage: null };
  const script = await db.reelScript.update({ where: { id }, data });
  return NextResponse.json({ script });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireVideoAdmin();
  if (!user) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  const { id } = await params;
  if (!(await find(id, user.tenantId))) return NextResponse.json({ error: "Script niet gevonden" }, { status: 404 });
  await db.reelScript.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
