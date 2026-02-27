import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getUserSpaces, getPosts } from "@/lib/community";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PostCard } from "@/components/community/post-card";
import { PostComposer } from "@/components/community/post-composer";
import { formatRelativeTime, getInitials } from "@/lib/utils";
import { MessageSquare, Users, Lock, Megaphone } from "lucide-react";

export default async function CommunityPage() {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect("/login");
  }

  const [spaces, { posts }] = await Promise.all([
    getUserSpaces(user.id),
    getPosts(user.id, { limit: 20 }),
  ]);

  // Find a default space for posting (first non-host-only space)
  const defaultSpace = spaces.find((s) => !s.isHostOnly);

  return (
    <div className="min-h-screen">
      <div className="flex">
        {/* Sidebar - Spaces */}
        <aside className="hidden lg:block w-64 border-r bg-white min-h-screen p-4 sticky top-0">
          <h2 className="font-display text-lg tracking-wider mb-4">SPACES</h2>
          <nav className="space-y-1">
            {spaces.map((space) => (
              <Link
                key={space.id}
                href={`/community/${space.slug}`}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors"
              >
                <span className="text-xl">{space.iconEmoji || "💬"}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{space.name}</span>
                    {space.isHostOnly && (
                      <Megaphone className="h-3 w-3 text-muted-foreground" />
                    )}
                    {!space.isPublic && !space.isHostOnly && (
                      <Lock className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>
                  {space.postCount > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {space.postCount} posts
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 md:p-8 lg:p-12 max-w-3xl">
          <div className="mb-8">
            <h1 className="font-display text-2xl md:text-3xl tracking-wider">
              COMMUNITY
            </h1>
            <p className="mt-2 text-muted-foreground">
              Welkom bij de Simply Family! 🌿
            </p>
          </div>

          {/* Mobile Spaces */}
          <div className="lg:hidden mb-6 overflow-x-auto">
            <div className="flex gap-2 pb-2">
              {spaces.map((space) => (
                <Link
                  key={space.id}
                  href={`/community/${space.slug}`}
                  className="flex items-center gap-2 px-4 py-2 bg-white border rounded-full whitespace-nowrap hover:bg-muted transition-colors"
                >
                  <span>{space.iconEmoji || "💬"}</span>
                  <span className="text-sm">{space.name}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Post Composer */}
          {defaultSpace && (
            <div className="mb-6">
              <PostComposer 
                spaces={spaces.filter((s) => !s.isHostOnly)} 
                defaultSpaceId={defaultSpace.id}
                user={user}
              />
            </div>
          )}

          {/* Feed */}
          <div className="space-y-4">
            {posts.length > 0 ? (
              posts.map((post) => (
                <PostCard key={post.id} post={post} currentUserId={user.id} />
              ))
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground/50" />
                  <h2 className="mt-4 font-medium">Nog geen posts</h2>
                  <p className="mt-2 text-muted-foreground">
                    Wees de eerste die iets deelt met de community!
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </main>

        {/* Right Sidebar - Members (optional) */}
        <aside className="hidden xl:block w-64 border-l bg-white min-h-screen p-4 sticky top-0">
          <h3 className="font-medium text-sm text-muted-foreground mb-4">
            POPULAIRE SPACES
          </h3>
          <div className="space-y-3">
            {spaces
              .sort((a, b) => b.postCount - a.postCount)
              .slice(0, 5)
              .map((space) => (
                <Link
                  key={space.id}
                  href={`/community/${space.slug}`}
                  className="block"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{space.iconEmoji || "💬"}</span>
                    <div>
                      <p className="font-medium text-sm">{space.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {space.postCount} posts
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
