import { notFound } from "next/navigation";
import { requireAdminUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getTenantBrandingById } from "@/lib/branding";
import { REVIEW_PROJECT_SELECT, videoProjectScope } from "@/lib/video-studio";
import { VideoReview, ReviewProject } from "./video-review";

export const dynamic = "force-dynamic";

export default async function VideoReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireAdminUser(`/admin/content/video/${id}`);
  const project = await db.videoProject.findFirst({
    where: { id, ...videoProjectScope(user.tenantId) },
    select: REVIEW_PROJECT_SELECT,
  });
  if (!project) notFound();

  const branding = await getTenantBrandingById(user.tenantId);
  const lessons = await db.lesson.findMany({
    where: { OR: [{ videoUrl: `videostudio:${project.id}` }, ...(project.finalUrl ? [{ videoUrl: project.finalUrl }] : [])] },
    select: { title: true, module: { select: { course: { select: { title: true } } } } },
  });

  return (
    <VideoReview
      initialProject={JSON.parse(JSON.stringify(project)) as ReviewProject}
      accentColor={branding.secondaryColor}
      primaryColor={branding.primaryColor}
      usedIn={lessons.map((l) => `${l.module.course.title} › ${l.title}`)}
    />
  );
}
