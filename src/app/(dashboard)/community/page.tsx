import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, MessageSquare } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getPosts, getUserSpaces } from "@/lib/community";
import { db } from "@/lib/db";
import { PostCard } from "@/components/community/post-card";
import { PostComposer } from "@/components/community/post-composer";
import { FeedSortSelect, parseFeedSort } from "@/components/community/feed-sort-select";

export default async function CommunityPage({ searchParams }: { searchParams: Promise<{ sort?: string }> }) {
  const sort = parseFeedSort((await searchParams).sort);
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [spaces, { posts }] = await Promise.all([
    getUserSpaces(user.id),
    getPosts(user.id, { limit: 20, sort }),
  ]);
  const defaultSpace = spaces.find((space) => !space.isHostOnly);
  const spaceIds = spaces.map((space) => space.id);
  const courseLinks = await db.enrollment.findMany({
    where: {
      userId: user.id,
      OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
      course: { communitySpaceId: spaceIds.length ? { in: spaceIds } : undefined },
    },
    orderBy: { createdAt: "desc" },
    take: 3,
    select: { id: true, course: { select: { title: true, slug: true } } },
  });

  return (
    <div className="relative min-h-screen overflow-hidden bg-white px-4 py-5 md:px-8 md:py-8">
      <div
        className="pointer-events-none fixed inset-0 bg-[url('/simply-community-background.jpg')] bg-cover bg-center bg-no-repeat"
        aria-hidden="true"
      />
      <div className="pointer-events-none fixed inset-0 bg-white/58" aria-hidden="true" />

      <div className="relative mx-auto max-w-6xl">
        <header className="mb-6 flex items-end justify-between border-b border-black/10 pb-5">
          <div>
            <h1 className="text-xl font-semibold text-[#181c19]">Community</h1>
            <p className="mt-1 text-xs text-[#68706a]">Deel, vraag en volg wat er leeft in jouw kanalen.</p>
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#737a75]">
            {spaces.length} kanalen
          </span>
        </header>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_250px]">
          <main className="min-w-0 space-y-5">
            {defaultSpace ? (
              <PostComposer
                spaces={spaces.filter((space) => !space.isHostOnly)}
                defaultSpaceId={defaultSpace.id}
                user={user}
              />
            ) : null}

            <div className="flex items-center justify-between">
              <FeedSortSelect value={sort} />
            </div>

            <div className="space-y-4">
              {posts.length ? posts.map((post) => (
                <PostCard key={post.id} post={post} currentUserId={user.id} currentUserRole={user.role} currentUser={user} showSpace />
              )) : (
                <div className="border border-black/10 bg-white px-5 py-10 text-center !rounded-2xl">
                  <MessageSquare className="mx-auto h-5 w-5 text-slate-400" />
                  <p className="mt-3 text-sm font-medium text-slate-800">Nog geen berichten</p>
                  <p className="mt-1 text-xs text-slate-500">Nieuwe communityberichten verschijnen hier.</p>
                </div>
              )}
            </div>
          </main>

          {courseLinks.length ? (
            <aside className="hidden xl:block">
              <div className="sticky top-6 border-y border-black/10 bg-white/90 px-4 py-5 backdrop-blur-sm">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#4d5650]">Jouw trajecten</p>
                <div className="mt-3 divide-y divide-black/10">
                  {courseLinks.map((enrollment) => (
                    <Link
                      key={enrollment.id}
                      href={`/courses/${enrollment.course.slug}`}
                      className="group flex items-center gap-2 py-3 text-xs text-slate-600 hover:text-primary"
                    >
                      <span className="min-w-0 flex-1 truncate">{enrollment.course.title}</span>
                      <ArrowRight className="h-3 w-3 transition group-hover:translate-x-0.5" />
                    </Link>
                  ))}
                </div>
              </div>
            </aside>
          ) : null}
        </div>
      </div>
    </div>
  );
}
