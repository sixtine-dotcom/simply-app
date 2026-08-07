import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireAdminUser } from "@/lib/auth";
import {
  getCommunityCoursesForScheduling,
  getScheduledCommunityPosts,
} from "@/lib/scheduled-community-posts";
import { CommunityPostPlanner } from "./planner";

export default async function ScheduledCommunityPostsPage() {
  await requireAdminUser("/admin/community/scheduled-posts");

  const [courses, posts] = await Promise.all([
    getCommunityCoursesForScheduling(),
    getScheduledCommunityPosts(),
  ]);

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="overflow-hidden rounded-[34px] border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.94),rgba(248,242,233,0.82))] p-6 shadow-[0_24px_80px_-34px_rgba(50,32,14,0.28)] md:p-8">
          <Link
            href="/admin/community"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Terug naar community
          </Link>

          <p className="app-kicker mt-6">Community kalender</p>
          <div className="mt-4 max-w-3xl">
            <h1 className="font-display text-3xl tracking-tight text-slate-950 md:text-5xl">
              Posts plannen en dupliceren
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground md:text-base">
              Plan posts voor een traject-community en kopieer dezelfde planning later naar een
              ander traject, zonder opnieuw alles manueel te schrijven.
            </p>
          </div>
        </section>

        <CommunityPostPlanner
          courses={courses.map((course) => ({
            id: course.id,
            title: course.title,
            slug: course.slug,
            communitySpaceId: course.communitySpaceId,
            communitySpaceName: course.communitySpace?.name || "Community",
          }))}
          initialPosts={posts.map((post) => ({
            id: post.id,
            courseId: post.courseId,
            courseTitle: post.course.title,
            spaceName: post.space.name,
            title: post.title,
            content: post.content,
            isPinned: post.isPinned,
            scheduledAt: post.scheduledAt.toISOString(),
            status: post.status,
            publishedAt: post.publishedAt?.toISOString() || null,
            publishedPostId: post.publishedPostId,
            authorName: `${post.author.firstName} ${post.author.lastName}`.trim(),
          }))}
        />
      </div>
    </div>
  );
}
