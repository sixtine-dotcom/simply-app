import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Lock, Megaphone, MessageSquare } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { canUserPostInSpace, getPosts, getUserSpaces } from "@/lib/community";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { PostCard } from "@/components/community/post-card";
import { PostComposer } from "@/components/community/post-composer";

export default async function SpacePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const space = await db.space.findUnique({ where: { slug } });
  if (!space) notFound();
  const userSpaces = await getUserSpaces(user.id);
  if (!userSpaces.some((entry) => entry.id === space.id)) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10 text-center">
        <Lock className="mx-auto h-5 w-5 text-slate-400" />
        <h1 className="mt-3 text-lg font-semibold">Geen toegang</h1>
        <p className="mt-1 text-sm text-slate-500">Je hebt geen toegang tot dit kanaal.</p>
        <Button className="mt-4" size="sm" asChild><Link href="/community">Terug naar community</Link></Button>
      </div>
    );
  }

  const [{ posts }, canPost] = await Promise.all([
    getPosts(user.id, { spaceSlug: slug, limit: 50 }),
    canUserPostInSpace(user.id, space.id),
  ]);

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-5 md:px-6 md:py-6">
      <div className="pointer-events-none fixed inset-0 bg-[url('/simply-community-background.jpg')] bg-cover bg-center bg-no-repeat" aria-hidden="true" />
      <div className="pointer-events-none fixed inset-0 bg-white/58" aria-hidden="true" />
      <div className="relative mx-auto max-w-3xl">
        <header className="mb-4 border-b border-slate-200 pb-4">
          <Link href="/community" className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900">
            <ChevronLeft className="h-3.5 w-3.5" /> Alle activiteit
          </Link>
          <div className="mt-3 flex items-center gap-2">
            <h1 className="text-xl font-semibold text-slate-950">{space.name}</h1>
            {space.isHostOnly ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[10px] font-medium text-amber-800">
                <Megaphone className="h-3 w-3" /> Aankondigingen
              </span>
            ) : !space.isPublic ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[10px] text-slate-600">
                <Lock className="h-3 w-3" /> Privé
              </span>
            ) : null}
          </div>
          {space.description ? <p className="mt-1.5 max-w-2xl text-xs leading-5 text-slate-500">{space.description}</p> : null}
        </header>

        <main className="space-y-3">
          {canPost ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-3">
              <PostComposer
                spaces={[{ id: space.id, name: space.name, slug: space.slug, iconEmoji: null }]}
                defaultSpaceId={space.id}
                user={user}
              />
            </div>
          ) : space.isHostOnly ? (
            <p className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500">
              <Megaphone className="h-3.5 w-3.5" /> Alleen Simply in Balance kan in dit kanaal publiceren.
            </p>
          ) : null}

          {posts.length ? posts.map((post) => (
            <PostCard key={post.id} post={post} currentUserId={user.id} currentUserRole={user.role} currentUser={user} />
          )) : (
            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-10 text-center">
              <MessageSquare className="mx-auto h-5 w-5 text-slate-400" />
              <p className="mt-3 text-sm font-medium">Nog geen berichten</p>
              {canPost ? <p className="mt-1 text-xs text-slate-500">Deel het eerste bericht in dit kanaal.</p> : null}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
