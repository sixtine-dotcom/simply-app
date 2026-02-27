import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Plus, 
  Users,
  MessageSquare,
  Megaphone,
  Lock,
  Globe,
  Pencil,
  Trash2,
  GripVertical
} from "lucide-react";

export default async function AdminCommunityPage() {
  const user = await getCurrentUser();
  
  if (!user || user.role !== "ADMIN") {
    redirect("/");
  }

  const spaces = await db.space.findMany({
    orderBy: { position: "asc" },
    include: {
      _count: {
        select: {
          posts: true,
          members: true,
        },
      },
    },
  });

  const stats = {
    totalSpaces: spaces.length,
    totalPosts: spaces.reduce((acc, s) => acc + s._count.posts, 0),
    publicSpaces: spaces.filter((s) => s.isPublic).length,
    hostOnlySpaces: spaces.filter((s) => s.isHostOnly).length,
  };

  return (
    <div className="p-6 md:p-8 lg:p-12">
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl tracking-wider">
            COMMUNITY BEHEER
          </h1>
          <p className="mt-2 text-muted-foreground">
            Beheer je community spaces en posts
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/community/spaces/new">
            <Plus className="mr-2 h-4 w-4" />
            Nieuwe space
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalSpaces}</p>
                <p className="text-sm text-muted-foreground">Spaces</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold">{stats.totalPosts}</p>
              <p className="text-sm text-muted-foreground">Posts</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold">{stats.publicSpaces}</p>
              <p className="text-sm text-muted-foreground">Openbaar</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold">{stats.hostOnlySpaces}</p>
              <p className="text-sm text-muted-foreground">Aankondigingen</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Spaces List */}
      <Card>
        <CardHeader>
          <CardTitle>Spaces</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {spaces.map((space) => (
              <div
                key={space.id}
                className="flex items-center gap-4 p-4 border rounded-lg"
              >
                <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />

                <span className="text-2xl">{space.iconEmoji || "💬"}</span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{space.name}</h3>
                    {space.isHostOnly ? (
                      <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded flex items-center gap-1">
                        <Megaphone className="h-3 w-3" />
                        Host-only
                      </span>
                    ) : space.isPublic ? (
                      <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        Openbaar
                      </span>
                    ) : (
                      <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded flex items-center gap-1">
                        <Lock className="h-3 w-3" />
                        Privé
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {space._count.posts} posts • {space._count.members} leden
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/admin/community/spaces/${space.id}`}>
                      <Pencil className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Trash2 className="h-4 w-4 text-error" />
                  </Button>
                </div>
              </div>
            ))}

            {spaces.length === 0 && (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <p className="mt-4 text-muted-foreground">
                  Nog geen spaces aangemaakt
                </p>
                <Button className="mt-4" asChild>
                  <Link href="/admin/community/spaces/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Eerste space aanmaken
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
