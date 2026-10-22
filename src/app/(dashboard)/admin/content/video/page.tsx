import { requireAdminUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { VideoMode, VideoProjectStatus, VideoStep, videoProjectScope } from "@/lib/video-studio";
import { NewVideoForm, AutoRefresh, ToneOfVoiceButton } from "./overview-client";
import { VideoList } from "./video-list";

export const dynamic = "force-dynamic";

export default async function VideoStudioPage() {
  const user = await requireAdminUser("/admin/content/video");
  const projects = await db.videoProject.findMany({
    where: videoProjectScope(user.tenantId),
    orderBy: { createdAt: "desc" },
    // Explicit select: the full-recording transcript/waveform are large and not needed here.
    select: {
      id: true,
      title: true,
      slug: true,
      mode: true,
      status: true,
      steps: true,
      createdAt: true,
      finalUrl: true,
      publishStatus: true,
      scheduledAt: true,
      versions: { orderBy: { number: "desc" }, take: 1, select: { number: true } },
      _count: { select: { comments: { where: { status: { in: ["OPEN", "QUEUED"] } } } } },
    },
  });
  // Course videos that are attached to a lesson (by the Video Studio picker) count as "in a course".
  const finalUrls = projects.map((p) => p.finalUrl).filter((u): u is string => Boolean(u));
  const lessons = finalUrls.length
    ? await db.lesson.findMany({
        where: { OR: [{ videoUrl: { in: finalUrls } }, { videoUrl: { in: projects.map((p) => `videostudio:${p.id}`) } }] },
        select: { title: true, videoUrl: true, module: { select: { course: { select: { title: true } } } } },
      })
    : [];
  const usedIn = (project: { id: string; finalUrl: string | null }) =>
    lessons
      .filter((l) => l.videoUrl === project.finalUrl || l.videoUrl === `videostudio:${project.id}`)
      .map((l) => `${l.module.course.title} › ${l.title}`);
  const busy = projects.some((p) => ["WAITING_FOR_FOOTAGE", "PROCESSING", "APPLYING_FEEDBACK"].includes(p.status));

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <AutoRefresh intervalMs={busy ? 5000 : 30000} />
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="app-halo overflow-hidden rounded-[34px] border border-white/70 bg-white/85 p-6 md:p-8">
          <p className="app-kicker">Content · Video Studio</p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">Video&apos;s</h1>
          <p className="mt-3 max-w-3xl text-muted-foreground">
            Maak hier een nieuwe video aan. Op je Mac verschijnt dan een map in <strong>Simply Video Pipeline → Content</strong>.
            Sleep je beeldmateriaal in <strong>01_raw</strong>: de video wordt geknipt en verschijnt hier voor review.
            Kies <strong>Social</strong> voor reels (ondertitels, grote woorden, zooms), <strong>Cursus</strong> voor lange opnames zoals Loom
            (alleen knippen) of <strong>Kant-en-klaar</strong> voor video&apos;s die al bewerkt zijn (alleen caption en inplannen).
          </p>
          <div className="mt-5 flex flex-wrap items-start justify-between gap-3">
            <NewVideoForm />
            <ToneOfVoiceButton />
          </div>
        </section>

        {projects.length === 0 ? (
          <p className="rounded-3xl border border-dashed border-slate-300 p-10 text-center text-muted-foreground">
            Nog geen video&apos;s. Maak hierboven je eerste video aan.
          </p>
        ) : (
          <VideoList
            items={projects.map((project) => ({
              id: project.id,
              title: project.title,
              slug: project.slug,
              mode: project.mode as VideoMode,
              status: project.status as VideoProjectStatus,
              steps: (project.steps as VideoStep[] | null) ?? [],
              latestVersion: project.versions[0]?.number ?? null,
              openComments: project._count.comments,
              createdAt: project.createdAt.toISOString(),
              finalReady: Boolean(project.finalUrl),
              publishStatus: project.publishStatus,
              scheduledAt: project.scheduledAt?.toISOString() ?? null,
              usedIn: usedIn(project),
            }))}
          />
        )}
      </div>
    </div>
  );
}
