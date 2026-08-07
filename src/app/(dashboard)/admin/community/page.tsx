import Link from "next/link";
import {
  ArrowRight,
  Globe,
  LayoutTemplate,
  Lock,
  Megaphone,
  MessageSquare,
  PauseCircle,
  Plus,
  CalendarClock,
  Sparkles,
  Tag,
  Users,
} from "lucide-react";
import { requireAdminOrCoachUser } from "@/lib/auth";
import { getCommunityExperienceSettings } from "@/lib/community-settings";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AdminHubCard } from "@/components/admin/hub-card";

export default async function AdminCommunityPage() {
  const adminUser = await requireAdminOrCoachUser("/admin/community");

  const spaces = await db.space.findMany({
    orderBy: [{ position: "asc" }, { updatedAt: "desc" }],
    include: {
      posts: {
        take: 1,
        orderBy: { createdAt: "desc" },
        include: {
          author: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          _count: {
            select: {
              comments: true,
              likes: true,
            },
          },
        },
      },
      _count: {
        select: {
          posts: true,
          members: true,
          courses: true,
        },
      },
    },
  });

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-border bg-[linear-gradient(135deg,rgba(247,244,237,0.98),rgba(255,255,255,0.95))] px-6 py-7 shadow-card md:px-8 md:py-8">
        <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-[radial-gradient(circle_at_top,rgba(120,148,118,0.16),transparent_60%)] lg:block" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-3 py-1 text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              Community Hub
            </div>
            <h1 className="font-display text-3xl tracking-[0.16em] text-foreground md:text-4xl">
              COMMUNITY MANAGEMENT
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
              Organize conversations by space, connect products to the right cohorts, and build a
              community experience that supports retention instead of showing isolated posts.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant="outline" asChild>
              <Link href="/admin/courses" className="block">
                View product links
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/admin/community/scheduled-posts">
                <CalendarClock className="mr-2 h-4 w-4" />
                Posts plannen
              </Link>
            </Button>
            <Button asChild>
              <Link href="/admin/community/spaces/new">
                <Plus className="mr-2 h-4 w-4" />
                New space
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2 xl:grid-cols-5">
        <AdminHubCard
          icon={<MessageSquare className="h-5 w-5" />}
          title="Community"
          description="This hub manages spaces, group dynamics, and retention inside your platform."
          href="/admin/community"
          cta="Open community"
          active
        />
        <AdminHubCard
          icon={<Users className="h-5 w-5" />}
          title="People"
          description="Use people operations for activation, access control, and member follow-up."
          href="/admin/users"
          cta="Open people"
        />
        <AdminHubCard
          icon={<Tag className="h-5 w-5" />}
          title="Offers"
          description="Connect premium offers to private groups and guide cohorts through each program."
          href="/admin/offers"
          cta="Open offers"
        />
        <AdminHubCard
          icon={<LayoutTemplate className="h-5 w-5" />}
          title="Website"
          description="Connect landing pages logically to community, intake, and access."
          href="/admin/landing-pages"
          cta="Open website"
        />
        <AdminHubCard
          icon={<CalendarClock className="h-5 w-5" />}
          title="Content kalender"
          description="Plan communityposts en dupliceer vaste trajectcontent naar nieuwe groepen."
          href="/admin/community/scheduled-posts"
          cta="Open planning"
        />
      </section>

      <section className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Spaces</CardTitle>
            <CardDescription>
              Manage your community structure and route each type of conversation to the right place.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {spaces.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center">
                <Users className="mx-auto h-10 w-10 text-muted-foreground/60" />
                <h2 className="mt-4 text-lg font-semibold">No spaces created yet</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Start with a general group, an announcement channel, or a program-specific space.
                </p>
                <Button className="mt-5" asChild>
                  <Link href="/admin/community/spaces/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Create your first space
                  </Link>
                </Button>
              </div>
            ) : (
              spaces.map((space) => {
                const latestPost = space.posts[0];

                return (
                  <div
                    key={space.id}
                    className="rounded-[1.6rem] border border-white/70 bg-[rgba(255,255,255,0.88)] p-5 shadow-[0_24px_60px_-38px_rgba(33,24,18,0.34)] transition-all hover:-translate-y-0.5 hover:border-primary/30"
                  >
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                      <Link href={`/admin/community/spaces/${space.id}`} className="flex min-w-0 flex-1 gap-4">
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.2rem] bg-muted text-3xl">
                          {space.iconEmoji || "💬"}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="truncate text-lg font-semibold">{space.name}</h2>
                            {space.groupLabel ? (
                              <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                                {space.groupLabel}
                              </span>
                            ) : null}
                            {space.isHostOnly ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
                                <Megaphone className="h-3 w-3" />
                                Host-only
                              </span>
                            ) : space.isPublic ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                                <Globe className="h-3 w-3" />
                                Public
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-stone-900 px-2.5 py-1 text-xs font-medium text-white">
                                <Lock className="h-3 w-3" />
                                Private
                              </span>
                            )}
                            {!space.isActive ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                                <PauseCircle className="h-3 w-3" />
                                Hidden
                              </span>
                            ) : null}
                            {space._count.courses > 0 ? (
                              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                                {space._count.courses} linked course
                                {space._count.courses === 1 ? "" : "s"}
                              </span>
                            ) : null}
                          </div>

                          <p className="mt-1 text-sm text-muted-foreground">/community/{space.slug}</p>

                          {space.description ? (
                            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                              {space.description}
                            </p>
                          ) : null}

                          <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                            <span className="rounded-full bg-muted px-3 py-1.5">
                              {space._count.members} members
                            </span>
                            <span className="rounded-full bg-muted px-3 py-1.5">
                              {space._count.posts} posts
                            </span>
                            <span className="rounded-full bg-muted px-3 py-1.5">
                              Position {space.position + 1}
                            </span>
                          </div>
                        </div>
                      </Link>

                      <div className="flex flex-wrap gap-2 xl:justify-end">
                        <Button variant="outline" asChild>
                          <Link href={`/admin/community/spaces/${space.id}`}>Manage</Link>
                        </Button>
                        <Button variant="outline" asChild>
                          <Link href={`/community/${space.slug}`} target="_blank">
                            Go to community
                          </Link>
                        </Button>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-3">
                      <Link href={`/admin/community/spaces/${space.id}?tab=members`} className="block rounded-2xl bg-muted/50 p-4 hover:bg-muted/70 transition-colors">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Users className="h-4 w-4 text-primary" />
                          Member momentum
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {space._count.members > 0
                            ? `${space._count.members} active members in this space.`
                            : "No members have been added to this space yet."}
                        </p>
                      </Link>

                      <Link href={`/admin/community/spaces/${space.id}?tab=content`} className="block rounded-2xl bg-muted/50 p-4 hover:bg-muted/70 transition-colors">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <MessageSquare className="h-4 w-4 text-primary" />
                          Recent activity
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {latestPost
                            ? `Latest post by ${latestPost.author.firstName} ${latestPost.author.lastName} on ${formatDate(latestPost.createdAt)}.`
                            : "There are no posts in this space yet."}
                        </p>
                      </Link>

                      <Link href={`/admin/community/spaces/${space.id}?tab=settings`} className="block rounded-2xl bg-muted/50 p-4 hover:bg-muted/70 transition-colors">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <ArrowRight className="h-4 w-4 text-primary" />
                          Community type
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {space.isHostOnly
                            ? "Use this space for official updates and announcements."
                            : space.isPublic
                              ? "Best suited for broader conversations and open client interaction."
                              : "Best suited for premium or cohort-specific guidance."}
                        </p>
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

      </section>
    </div>
  );
}
