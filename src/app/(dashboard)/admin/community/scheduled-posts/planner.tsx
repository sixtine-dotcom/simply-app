"use client";

import { useMemo, useState } from "react";
import { Copy, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

type CourseOption = {
  id: string;
  title: string;
  slug: string;
  communitySpaceId: string | null;
  communitySpaceName: string;
};

type ScheduledPost = {
  id: string;
  courseId: string;
  courseTitle: string;
  spaceName: string;
  title: string | null;
  content: string;
  isPinned: boolean;
  scheduledAt: string;
  status: string;
  publishedAt: string | null;
  publishedPostId: string | null;
  authorName: string;
};

type PlannerProps = {
  courses: CourseOption[];
  initialPosts: ScheduledPost[];
};

function toDateTimeLocal(value: Date) {
  const offset = value.getTimezoneOffset();
  const local = new Date(value.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function tomorrowMorning() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(9, 0, 0, 0);
  return toDateTimeLocal(date);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("nl-BE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function CommunityPostPlanner({ courses, initialPosts }: PlannerProps) {
  const { toast } = useToast();
  const [posts, setPosts] = useState(initialPosts);
  const [selectedCourseId, setSelectedCourseId] = useState(courses[0]?.id || "");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [scheduledAt, setScheduledAt] = useState(tomorrowMorning());
  const [isPinned, setIsPinned] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [sourceCourseId, setSourceCourseId] = useState(courses[0]?.id || "");
  const [targetCourseId, setTargetCourseId] = useState(courses[1]?.id || "");
  const [targetStartAt, setTargetStartAt] = useState(tomorrowMorning());
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const postsByCourse = useMemo(() => {
    return posts.reduce<Record<string, ScheduledPost[]>>((acc, post) => {
      acc[post.courseId] = acc[post.courseId] || [];
      acc[post.courseId].push(post);
      return acc;
    }, {});
  }, [posts]);

  const sourcePostCount = postsByCourse[sourceCourseId]?.filter((post) =>
    ["scheduled", "published"].includes(post.status)
  ).length || 0;

  async function refreshPosts(courseId?: string) {
    const query = courseId ? `?courseId=${encodeURIComponent(courseId)}` : "";
    const response = await fetch(`/api/admin/community/scheduled-posts${query}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Kon planning niet herladen");

    setPosts(
      (data.posts || []).map((post: any) => ({
        id: post.id,
        courseId: post.courseId,
        courseTitle: post.course.title,
        spaceName: post.space.name,
        title: post.title,
        content: post.content,
        isPinned: post.isPinned,
        scheduledAt: post.scheduledAt,
        status: post.status,
        publishedAt: post.publishedAt,
        publishedPostId: post.publishedPostId,
        authorName: `${post.author.firstName} ${post.author.lastName}`.trim(),
      }))
    );
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setIsCreating(true);
    try {
      const response = await fetch("/api/admin/community/scheduled-posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: selectedCourseId,
          title,
          content,
          scheduledAt: new Date(scheduledAt).toISOString(),
          isPinned,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Kon post niet plannen");

      setTitle("");
      setContent("");
      setIsPinned(false);
      await refreshPosts();
      toast({ title: "Post gepland", description: "Deze post wordt automatisch gepubliceerd." });
    } catch (error) {
      toast({
        title: "Planning mislukt",
        description: error instanceof Error ? error.message : "Kon post niet plannen",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  }

  async function handleDuplicate(event: React.FormEvent) {
    event.preventDefault();
    setIsDuplicating(true);
    try {
      const response = await fetch("/api/admin/community/scheduled-posts/duplicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceCourseId,
          targetCourseId,
          targetStartAt: new Date(targetStartAt).toISOString(),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Kon planning niet dupliceren");

      await refreshPosts();
      toast({
        title: "Planning gedupliceerd",
        description: `${data.count} post(s) gekopieerd naar het doeltraject.`,
      });
    } catch (error) {
      toast({
        title: "Dupliceren mislukt",
        description: error instanceof Error ? error.message : "Kon planning niet dupliceren",
        variant: "destructive",
      });
    } finally {
      setIsDuplicating(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const response = await fetch(`/api/admin/community/scheduled-posts/${id}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Kon geplande post niet annuleren");

      setPosts((current) =>
        current.map((post) =>
          post.id === id ? { ...post, status: "cancelled" } : post
        )
      );
      toast({ title: "Geplande post geannuleerd" });
    } catch (error) {
      toast({
        title: "Annuleren mislukt",
        description: error instanceof Error ? error.message : "Kon geplande post niet annuleren",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]">
      <div className="space-y-6">
        <Card className="app-halo">
          <CardHeader>
            <CardTitle>Nieuwe post plannen</CardTitle>
            <CardDescription>
              Maak een post klaar voor de community van een traject. Alleen admins kunnen dit beheren.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={handleCreate}>
              <div className="grid gap-2">
                <Label htmlFor="courseId">Traject</Label>
                <select
                  id="courseId"
                  value={selectedCourseId}
                  onChange={(event) => setSelectedCourseId(event.target.value)}
                  className="h-11 rounded-2xl border border-border bg-white px-3 text-sm"
                  required
                >
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title} · {course.communitySpaceName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="title">Titel</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Optioneel"
                  maxLength={160}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="content">Post</Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  placeholder="Plak hier je communitypost..."
                  rows={9}
                  required
                />
              </div>

              <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
                <div className="grid gap-2">
                  <Label htmlFor="scheduledAt">Publiceren op</Label>
                  <Input
                    id="scheduledAt"
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(event) => setScheduledAt(event.target.value)}
                    required
                  />
                </div>
                <label className="flex h-11 items-center gap-2 rounded-2xl border border-border bg-white px-3 text-sm">
                  <input
                    type="checkbox"
                    checked={isPinned}
                    onChange={(event) => setIsPinned(event.target.checked)}
                  />
                  Vastpinnen
                </label>
              </div>

              <Button type="submit" disabled={isCreating || courses.length === 0}>
                {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Post plannen
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="app-halo">
          <CardHeader>
            <CardTitle>Planning dupliceren</CardTitle>
            <CardDescription>
              Kopieer alle geplande/gepubliceerde templateposts van één traject naar een ander traject.
              De timing blijft relatief: post 2 blijft evenveel dagen na post 1 staan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={handleDuplicate}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="sourceCourseId">Van traject</Label>
                  <select
                    id="sourceCourseId"
                    value={sourceCourseId}
                    onChange={(event) => setSourceCourseId(event.target.value)}
                    className="h-11 rounded-2xl border border-border bg-white px-3 text-sm"
                    required
                  >
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.title}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">{sourcePostCount} templatepost(s)</p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="targetCourseId">Naar traject</Label>
                  <select
                    id="targetCourseId"
                    value={targetCourseId}
                    onChange={(event) => setTargetCourseId(event.target.value)}
                    className="h-11 rounded-2xl border border-border bg-white px-3 text-sm"
                    required
                  >
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="targetStartAt">Nieuwe startdatum eerste post</Label>
                <Input
                  id="targetStartAt"
                  type="datetime-local"
                  value={targetStartAt}
                  onChange={(event) => setTargetStartAt(event.target.value)}
                  required
                />
              </div>

              <Button type="submit" variant="outline" disabled={isDuplicating || courses.length < 2}>
                {isDuplicating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Copy className="mr-2 h-4 w-4" />}
                Dupliceren naar traject
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card className="app-halo">
        <CardHeader>
          <CardTitle>Geplande posts</CardTitle>
          <CardDescription>
            Overzicht van alles wat klaarstaat of al automatisch gepubliceerd werd.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {posts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
              Nog geen geplande posts.
            </div>
          ) : (
            <div className="space-y-3">
              {posts.map((post) => (
                <div key={post.id} className="rounded-2xl border border-white/70 bg-white/80 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        {post.courseTitle}
                      </p>
                      <h3 className="mt-1 line-clamp-2 text-sm font-semibold">
                        {post.title || post.content}
                      </h3>
                    </div>
                    <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                      {post.status}
                    </span>
                  </div>

                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">
                    {post.content}
                  </p>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {post.status === "published" && post.publishedAt
                      ? `Gepubliceerd op ${formatDateTime(post.publishedAt)}`
                      : `Gepland op ${formatDateTime(post.scheduledAt)}`}
                  </p>

                  {post.status === "scheduled" ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mt-3 text-muted-foreground"
                      onClick={() => handleDelete(post.id)}
                      disabled={deletingId === post.id}
                    >
                      {deletingId === post.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="mr-2 h-4 w-4" />
                      )}
                      Annuleren
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
