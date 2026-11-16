import { createHash, randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireVideoAdmin } from "@/lib/video-studio";
import { connectOpenDesign, OpenDesignError, openDesignProjectUrl, openDesignRequest, openDesignRunForProject, type OpenDesignConnection } from "@/lib/open-design";
import { openDesignSlideName, openDesignTextHash, seedOpenDesignCarousel } from "@/lib/open-design-carousel";
import { loadOpenDesignStyleBrief, OPEN_DESIGN_CAROUSEL_PROMPT } from "@/lib/open-design-briefing";
import type { CarouselSlide } from "@/lib/carousel-shared";
import { isR2Configured, uploadToR2 } from "@/lib/r2";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

type Params = { params: Promise<{ id: string }> };

async function findCarousel(id: string, tenantId: string | null | undefined) {
  return db.carousel.findFirst({ where: { id, tenantId: tenantId ?? null } });
}

export async function GET(_req: NextRequest, { params }: Params) {
  const user = await requireVideoAdmin();
  if (!user) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  const carousel = await findCarousel((await params).id, user.tenantId);
  if (!carousel) return NextResponse.json({ error: "Carousel niet gevonden" }, { status: 404 });
  try {
    const connection = await connectOpenDesign();
    let projectExists = false;
    if (carousel.openDesignProjectId) {
      try {
        await openDesignRequest(connection, `/api/projects/${encodeURIComponent(carousel.openDesignProjectId)}`);
        projectExists = true;
      } catch { /* The project may have been removed or belong to another Mac. */ }
    }
    const run = projectExists ? await openDesignRunForProject(connection, carousel.openDesignProjectId!, carousel.openDesignRunId) : null;
    return NextResponse.json({
      available: true,
      projectExists,
      projectUrl: projectExists ? openDesignProjectUrl(connection, carousel.openDesignProjectId!) : null,
      run,
      stale: Boolean(carousel.openDesignProjectId && carousel.openDesignTextHash !== openDesignTextHash({ ...carousel, slides: carousel.slides as CarouselSlide[] })),
    });
  } catch (error) {
    return NextResponse.json({ available: false, error: error instanceof Error ? error.message : "Open Design is niet bereikbaar" });
  }
}

const actionSchema = z.object({ action: z.enum(["create", "export"]) });

export async function POST(req: NextRequest, { params }: Params) {
  const user = await requireVideoAdmin();
  if (!user) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  const carousel = await findCarousel((await params).id, user.tenantId);
  if (!carousel) return NextResponse.json({ error: "Carousel niet gevonden" }, { status: 404 });
  const parsed = actionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ongeldige actie" }, { status: 400 });
  if (["PUBLISHING", "PUBLISHED"].includes(carousel.publishStatus ?? "")) {
    return NextResponse.json({ error: "Deze carousel wordt gepost of is al gepost" }, { status: 409 });
  }
  if (carousel.source !== "AI" || !["TEXT_APPROVED", "READY", "APPROVED", "IN_CANVA"].includes(carousel.status)) {
    return NextResponse.json({ error: "Keur eerst de tekst goed en wacht tot eventuele Canva-opdrachten klaar zijn" }, { status: 409 });
  }
  const input = { title: carousel.title, slides: carousel.slides as CarouselSlide[], photoUrl: carousel.photoUrl };
  if (!Array.isArray(input.slides) || input.slides.length < 2 || input.slides.length > 10) {
    return NextResponse.json({ error: "Een carousel heeft 2 tot 10 slides nodig" }, { status: 400 });
  }
  const textHash = openDesignTextHash(input);
  let unfinishedProject: { connection: OpenDesignConnection; id: string; runId?: string } | null = null;
  async function discardUnfinishedProject() {
    if (!unfinishedProject) return;
    // Only a project made by this request and not yet linked may be cleaned up.
    const { connection, id, runId } = unfinishedProject;
    if (runId) {
      await openDesignRequest(connection, `/api/runs/${encodeURIComponent(runId)}/cancel`, {}, 5000).catch(() => {});
    }
    await fetch(`${connection.daemonUrl}/api/projects/${encodeURIComponent(id)}`, {
      method: "DELETE", signal: AbortSignal.timeout(5000),
    }).catch(() => {});
    unfinishedProject = null;
  }
  try {
    const connection = await connectOpenDesign();
    if (parsed.data.action === "create") {
      const projectId = randomUUID();
      await openDesignRequest(connection, "/api/projects", {
        id: projectId,
        name: `Simply · ${carousel.title}`,
        conversationMode: "design",
        autoSendFirstMessage: false,
        pendingPrompt: OPEN_DESIGN_CAROUSEL_PROMPT,
        customInstructions: await loadOpenDesignStyleBrief(),
        metadata: { simplyCarouselId: carousel.id, skipDiscoveryBrief: true },
      });
      unfinishedProject = { connection, id: projectId };
      await seedOpenDesignCarousel(connection, projectId, input);
      // Creating a project is only a handoff. Start the actual design task as well.
      const run = await (await openDesignRequest(connection, "/api/runs", { projectId, message: OPEN_DESIGN_CAROUSEL_PROMPT }, 60000)).json();
      if (typeof run.runId !== "string") throw new OpenDesignError("Open Design heeft geen ontwerpopdracht gestart");
      unfinishedProject.runId = run.runId;
      const updated = await db.carousel.updateMany({
        where: { id: carousel.id, updatedAt: carousel.updatedAt },
        data: {
          openDesignProjectId: projectId, openDesignTextHash: textHash, openDesignRunId: run.runId,
          imageUrls: Prisma.DbNull, renderedAt: null, status: "TEXT_APPROVED", publishStatus: null,
          errorMessage: null,
        },
      });
      if (!updated.count) {
        await discardUnfinishedProject();
        return NextResponse.json({ error: "De carousel is ondertussen gewijzigd. Vernieuw de pagina en probeer opnieuw." }, { status: 409 });
      }
      unfinishedProject = null;
      return NextResponse.json({ carousel: await findCarousel(carousel.id, user.tenantId), projectUrl: openDesignProjectUrl(connection, projectId) });
    }

    if (!carousel.openDesignProjectId) return NextResponse.json({ error: "Maak eerst een ontwerp in Open Design" }, { status: 400 });
    if (carousel.openDesignTextHash !== textHash) {
      return NextResponse.json({ error: "De tekst of foto’s zijn gewijzigd. Maak een nieuw ontwerp met de huidige tekst voordat je slides ophaalt." }, { status: 409 });
    }
    const run = await openDesignRunForProject(connection, carousel.openDesignProjectId, carousel.openDesignRunId);
    if (run?.status !== "succeeded") return NextResponse.json({ error: run?.error || "Open Design heeft nog geen ontwerp afgerond. Dit project bevat voorlopig startbestanden; werk het ontwerp eerst uit in Open Design." }, { status: 409 });
    if (!isR2Configured()) return NextResponse.json({ error: "De opslag voor slides is niet ingesteld" }, { status: 503 });
    const base = `/api/projects/${encodeURIComponent(carousel.openDesignProjectId)}`;
    // Check every file before starting an export; don't silently omit missing slides.
    const listing = await (await openDesignRequest(connection, `${base}/files`)).json();
    const names = new Set((listing.files ?? []).map((f: { name?: string; path?: string }) => f.path ?? f.name));
    const manifest = names.has("startbestanden.json")
      ? await (await openDesignRequest(connection, `${base}/files/startbestanden.json`)).json() as { slides: { fileName: string; sha256: string }[] }
      : null;
    for (let i = 0; i < input.slides.length; i++) {
      if (!names.has(openDesignSlideName(i))) throw new OpenDesignError(`Slide ${i + 1} ontbreekt in Open Design. Behoud de oorspronkelijke slide-XX.html-bestandsnamen.`);
      const starter = manifest?.slides.find((s) => s.fileName === openDesignSlideName(i));
      if (starter) {
        const content = await (await openDesignRequest(connection, `${base}/files/${starter.fileName}`)).text();
        if (createHash("sha256").update(content).digest("hex") === starter.sha256) {
          return NextResponse.json({ error: `Slide ${i + 1} is nog een onbewerkt startbestand. Laat Open Design alle slides afwerken voordat je ze ophaalt.` }, { status: 409 });
        }
      }
    }
    const urls: string[] = [];
    const exportId = randomUUID();
    for (let i = 0; i < input.slides.length; i++) {
      const res = await openDesignRequest(connection, `${base}/export/image`, {
        fileName: openDesignSlideName(i), deck: false, imageFormat: "jpeg", width: 1080, height: 1350,
      }, 60000);
      if (!res.headers.get("content-type")?.startsWith("image/jpeg")) throw new OpenDesignError(`Slide ${i + 1} kon niet als JPEG worden opgehaald`);
      const body = Buffer.from(await res.arrayBuffer());
      const { url } = await uploadToR2({ key: `carousel-studio/${carousel.tenantId ?? "default"}/${carousel.id}/open-design/${exportId}/${i + 1}.jpg`, body, contentType: "image/jpeg" });
      urls.push(url);
    }
    const updated = await db.carousel.updateMany({
      where: { id: carousel.id, updatedAt: carousel.updatedAt },
      // Replacing slides always needs a fresh review before publishing.
      data: { imageUrls: urls, renderedAt: new Date(), renderRequestedAt: null, status: "READY", publishStatus: null, publishError: null, errorMessage: null },
    });
    if (!updated.count) return NextResponse.json({ error: "De carousel is ondertussen gewijzigd. De bestaande slides zijn behouden. Vernieuw de pagina en probeer opnieuw." }, { status: 409 });
    return NextResponse.json({ carousel: await findCarousel(carousel.id, user.tenantId) });
  } catch (error) {
    await discardUnfinishedProject();
    console.error("Open Design carousel action failed", error);
    return NextResponse.json({ error: error instanceof OpenDesignError ? error.message : "De koppeling met Open Design kon de actie niet afronden. Probeer opnieuw; je bestaande teksten en slides zijn behouden." }, { status: 503 });
  }
}
