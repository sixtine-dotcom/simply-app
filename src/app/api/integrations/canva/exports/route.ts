import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getValidCanvaToken } from "@/lib/content-integrations";
import { isR2Configured, uploadToR2 } from "@/lib/r2";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "SUPERADMIN"].includes(user.role)) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  const token = await getValidCanvaToken(user.id);
  if (!token) return NextResponse.json({ error: "Koppel eerst Canva" }, { status: 409 });
  const body = await request.json();
  if (!body.designId) return NextResponse.json({ error: "Design ontbreekt" }, { status: 400 });
  const response = await fetch("https://api.canva.com/rest/v1/exports", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ design_id: body.designId, format: { type: "png", as_single_image: false, lossless: true } }),
  });
  if (!response.ok) return NextResponse.json({ error: "Canva-export mislukt", details: await response.text() }, { status: 502 });
  return NextResponse.json(await response.json());
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "SUPERADMIN"].includes(user.role)) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  const token = await getValidCanvaToken(user.id);
  const jobId = request.nextUrl.searchParams.get("jobId");
  if (!token || !jobId) return NextResponse.json({ error: "Export ontbreekt" }, { status: 400 });
  const response = await fetch(`https://api.canva.com/rest/v1/exports/${encodeURIComponent(jobId)}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) return NextResponse.json({ error: "Kon Canva-export niet controleren" }, { status: 502 });
  const data = await response.json();
  if (data.job?.status === "success" && Array.isArray(data.job.urls) && isR2Configured()) {
    const urls: string[] = [];
    for (let index = 0; index < data.job.urls.length; index += 1) {
      const download = await fetch(data.job.urls[index]);
      if (!download.ok) return NextResponse.json({ error: "Kon een Canva-pagina niet bewaren" }, { status: 502 });
      const uploaded = await uploadToR2({ key: `content/canva/${Date.now()}-${index + 1}-${randomUUID()}.png`, body: Buffer.from(await download.arrayBuffer()), contentType: "image/png" });
      urls.push(uploaded.url);
    }
    data.job.urls = urls;
    data.job.persisted = true;
  }
  return NextResponse.json(data);
}
