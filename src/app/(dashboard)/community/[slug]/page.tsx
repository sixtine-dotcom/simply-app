import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getUserSpaces, getPosts, canUserPostInSpace } from "@/lib/community";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PostCard } from "@/components/community/post-card";
import { PostComposer } from "@/components/community/post-composer";
import { ChevronLeft, Lock, Megaphone, Users } from "lucide-react";

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
      <div className="p-6 md:p-8 lg:p-12">
        <Card>
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

  return (
    <div className="p-6 md:p-8 lg:p-12 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link 
          href="/community"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Alle spaces
        </Link>

        <div className="flex items-center gap-4">
          <span className="text-4xl">{space.iconEmoji || "💬"}</span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl md:text-3xl tracking-wider">
                {space.name.toUpperCase()}
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
      </div>

      {/* Post Composer */}
      {canPost && (
        <div className="mb-6">
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
        <Card className="mb-6">
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
              showSpace={false}
            />
          ))
        ) : (
          <Card>
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
  );
}
