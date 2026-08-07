import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Lock, Megaphone, Users } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getPosts, getUserSpaces } from "@/lib/community";
import { db } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PostCard } from "@/components/community/post-card";
import { PostComposer } from "@/components/community/post-composer";

export default async function CommunityPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const [spaces, { posts }] = await Promise.all([
    getUserSpaces(user.id),
    getPosts(user.id, { limit: 20 }),
  ]);

  const defaultSpace = spaces.find((space) => !space.isHostOnly);
  const spaceIds = spaces.map((space) => space.id);
  const courseLinks = await db.enrollment.findMany({
    where: {
      userId: user.id,
      OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
      course: {
        communitySpaceId: spaceIds.length > 0 ? { in: spaceIds } : undefined,
      },
    },
    orderBy: { createdAt: "desc" },
    take: 4,
    select: {
      id: true,
      course: {
        select: {
          title: true,
          slug: true,
          thumbnailUrl: true,
          communitySpaceId: true,
        },
      },
    },
  });

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)_320px]">
          <aside className="space-y-4">
            <Card className="app-halo">
              <CardHeader>
                <CardTitle>Spaces</CardTitle>
                <CardDescription>Your community spaces.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {spaces.map((space) => (
                  <Link
                    key={space.id}
                    href={`/community/${space.slug}`}
                    className="flex items-center gap-3 rounded-[22px] border border-white/60 bg-[rgba(255,251,247,0.8)] px-3 py-3 transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:bg-white"
                  >
                    <span className="text-xl">{space.iconEmoji || "💬"}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium">{space.name}</span>
                        {space.isHostOnly ? (
                          <Megaphone className="h-3 w-3 text-muted-foreground" />
                        ) : null}
                        {!space.isPublic && !space.isHostOnly ? (
                          <Lock className="h-3 w-3 text-muted-foreground" />
                        ) : null}
                      </div>
                      <p className="text-xs text-muted-foreground">{space.postCount} posts</p>
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          </aside>

          <main className="space-y-6">
            {defaultSpace ? (
              <Card className="app-halo">
                <CardHeader>
                  <CardTitle>Share something with your group</CardTitle>
                  <CardDescription>
                    Quick update, question, or small win. Keep it simple.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PostComposer
                    spaces={spaces.filter((space) => !space.isHostOnly)}
                    defaultSpaceId={defaultSpace.id}
                    user={user}
                  />
                </CardContent>
              </Card>
            ) : null}

            <div className="space-y-4">
              {posts.length > 0 ? (
                posts.map((post) => (
                  <PostCard key={post.id} post={post} currentUserId={user.id} currentUserRole={user.role} />
                ))
              ) : (
                <Card className="app-halo">
                  <CardContent className="py-12 text-center">
                    <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <h2 className="mt-4 text-lg font-semibold">No posts yet</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Be the first to share something with the community.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </main>

          <aside className="hidden space-y-4 xl:block">
            <Card className="overflow-hidden">
              <CardContent className="p-4">
                <h2 className="text-sm font-semibold text-slate-950">Ga verder met je cursus</h2>
                <div className="mt-4 space-y-3">
                  {courseLinks.length > 0 ? (
                    courseLinks.map((enrollment) => (
                      <Link
                        key={enrollment.id}
                        href={`/courses/${enrollment.course.slug}`}
                        className="group block overflow-hidden rounded-xl border bg-white transition hover:border-primary/30 hover:shadow-md"
                      >
                        <div
                          className="relative min-h-24 bg-cover bg-center p-4 text-white"
                          style={{
                            backgroundImage: enrollment.course.thumbnailUrl
                              ? `linear-gradient(90deg, rgba(15,23,42,0.72), rgba(15,23,42,0.18)), url(${enrollment.course.thumbnailUrl})`
                              : "linear-gradient(135deg, #5b5fc7, #0f766e)",
                          }}
                        >
                          <span className="absolute right-3 top-3 rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700">
                            Ga verder
                          </span>
                          <div className="absolute bottom-4 left-4 right-4">
                            <p className="font-semibold leading-tight">{enrollment.course.title}</p>
                            <p className="mt-1 flex items-center gap-1 text-xs opacity-90">
                              Open cursus <ArrowRight className="h-3 w-3 transition group-hover:translate-x-0.5" />
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Zodra deze community aan een cursus gekoppeld is, verschijnt hier de knop om verder te gaan.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </aside>
        </section>
      </div>
    </div>
  );
}
