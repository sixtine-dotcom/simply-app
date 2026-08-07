import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getUserSpaces, getPosts, canUserPostInSpace } from "@/lib/community";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PostCard } from "@/components/community/post-card";
import { PostComposer } from "@/components/community/post-composer";
import { ArrowRight, ChevronLeft, Lock, Megaphone, Plus, Users } from "lucide-react";

interface SpacePageProps {
  params: Promise<{ slug: string }>;
}

export default async function SpacePage({ params }: SpacePageProps) {
  const { slug } = await params;
  const user = await getCurrentUser();
  
  if (!user) {
    redirect("/login");
  }

  // Get the space
  const space = await db.space.findUnique({
    where: { slug },
  });

  if (!space) {
    notFound();
  }

  // Check access
  const userSpaces = await getUserSpaces(user.id);
  const hasAccess = userSpaces.some((s) => s.id === space.id);

  if (!hasAccess) {
    return (
      <div className="p-4 md:p-6 lg:p-8">
        <Card className="app-halo">
          <CardContent className="py-12 text-center">
            <Lock className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <h2 className="mt-4 font-display text-xl tracking-wider">GEEN TOEGANG</h2>
            <p className="mt-2 text-muted-foreground">
              Je hebt geen toegang tot deze space.
            </p>
            <Button className="mt-4" asChild>
              <Link href="/community">Terug naar community</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get posts
  const { posts } = await getPosts(user.id, { spaceSlug: slug, limit: 50 });
  const canPost = await canUserPostInSpace(user.id, space.id);
  const linkedEnrollment = await db.enrollment.findFirst({
    where: {
      userId: user.id,
      OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
      course: { communitySpaceId: space.id },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      course: {
        select: {
          title: true,
          slug: true,
          thumbnailUrl: true,
        },
      },
    },
  });

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-8">
      {/* Header */}
      <div className="overflow-hidden rounded-[34px] border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.94),rgba(248,242,233,0.82))] p-6 shadow-[0_24px_80px_-34px_rgba(50,32,14,0.28)] md:p-8">
        <Link 
          href="/community"
          className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Alle spaces
        </Link>

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <span className="text-4xl">{space.iconEmoji || "💬"}</span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-3xl tracking-tight text-slate-950 md:text-4xl">
                  {space.name}
                </h1>
                {space.isHostOnly && (
                  <span className="bg-primary/10 text-primary text-xs px-2 py-1 rounded flex items-center gap-1">
                    <Megaphone className="h-3 w-3" />
                    Aankondigingen
                  </span>
                )}
                {!space.isPublic && !space.isHostOnly && (
                  <span className="bg-muted text-muted-foreground text-xs px-2 py-1 rounded flex items-center gap-1">
                    <Lock className="h-3 w-3" />
                    Privé
                  </span>
                )}
              </div>
              {space.description && (
                <p className="mt-1 text-muted-foreground">{space.description}</p>
              )}
            </div>
          </div>

          {canPost ? (
            <Button asChild>
              <a href="#post-composer">
                <Plus className="mr-2 h-4 w-4" />
                Nieuwe post
              </a>
            </Button>
          ) : null}
        </div>
      </div>

      {/* Post Composer */}
      {canPost && (
        <div id="post-composer" className="mb-6 scroll-mt-24">
          <PostComposer 
            spaces={[{ 
              id: space.id, 
              name: space.name, 
              slug: space.slug, 
              iconEmoji: space.iconEmoji 
            }]} 
            defaultSpaceId={space.id}
            user={user}
          />
        </div>
      )}

      {space.isHostOnly && !canPost && (
        <Card className="app-halo">
          <CardContent className="py-4 text-center text-muted-foreground">
            <Megaphone className="h-5 w-5 inline mr-2" />
            Dit is een aankondigingen-kanaal. Alleen Simply kan hier posten.
          </CardContent>
        </Card>
      )}

      {/* Posts */}
      <div className="space-y-4">
        {posts.length > 0 ? (
          posts.map((post) => (
            <PostCard 
              key={post.id} 
              post={post} 
              currentUserId={user.id}
              currentUserRole={user.role}
              showSpace
            />
          ))
        ) : (
          <Card className="app-halo">
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <h2 className="mt-4 font-medium">Nog geen posts in deze space</h2>
              {canPost && (
                <p className="mt-2 text-muted-foreground">
                  Wees de eerste die iets deelt!
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
      </div>
      <aside className="hidden xl:block">
        <div className="sticky top-24 space-y-4">
          <Card className="overflow-hidden">
            <CardContent className="p-4">
              <h2 className="text-sm font-semibold text-slate-950">
                Verdergaan vanuit deze community
              </h2>
              {linkedEnrollment ? (
                <Link
                  href={`/courses/${linkedEnrollment.course.slug}`}
                  className="group mt-4 block overflow-hidden rounded-xl border bg-white transition hover:border-primary/30 hover:shadow-md"
                >
                  <div
                    className="relative min-h-32 bg-cover bg-center p-4 text-white"
                    style={{
                      backgroundImage: linkedEnrollment.course.thumbnailUrl
                        ? `linear-gradient(90deg, rgba(15,23,42,0.74), rgba(15,23,42,0.16)), url(${linkedEnrollment.course.thumbnailUrl})`
                        : "linear-gradient(135deg, #5b5fc7, #0f766e)",
                    }}
                  >
                    <span className="absolute right-3 top-3 rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700">
                      Ga verder
                    </span>
                    <div className="absolute bottom-4 left-4 right-4">
                      <p className="font-semibold leading-tight">{linkedEnrollment.course.title}</p>
                      <p className="mt-1 flex items-center gap-1 text-xs opacity-90">
                        Open cursus <ArrowRight className="h-3 w-3 transition group-hover:translate-x-0.5" />
                      </p>
                    </div>
                  </div>
                </Link>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">
                  Er is nog geen actieve cursus gekoppeld aan deze community.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </aside>
      </div>
    </div>
  );
}
