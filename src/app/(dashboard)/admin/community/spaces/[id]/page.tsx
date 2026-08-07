"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import {
  Brain,
  ChevronLeft,
  Download,
  Loader2,
  MessageSquare,
  Save,
  Trash2,
  UserPlus,
  Users,
  Workflow,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const EMOJI_OPTIONS = ["💬", "📢", "🎉", "🍽️", "💪", "❤️", "🌿", "⭐", "🔥", "💡"];
const SPACE_TABS = [
  { id: "settings", label: "Settings" },
  { id: "members", label: "Members" },
  { id: "content", label: "Content" },
  { id: "insights", label: "Insights" },
] as const;

type SpaceTab = (typeof SPACE_TABS)[number]["id"];
type CourseOption = { id: string; title: string };
type OfferOption = { id: string; title: string; courseIds: string[] };

function getTab(value: string | null): SpaceTab {
  return SPACE_TABS.some((tab) => tab.id === value) ? (value as SpaceTab) : "content";
}

function uniqueIds(values: string[]) {
  return Array.from(new Set(values));
}

type SpaceData = {
  id: string;
  name: string;
  slug: string;
  groupLabel: string | null;
  description: string | null;
  iconEmoji: string | null;
  isPublic: boolean;
  isHostOnly: boolean;
  isActive: boolean;
  position: number;
  _count: {
    posts: number;
    members: number;
  };
  members: Array<{
    id: string;
    createdAt: string;
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      role: string;
    };
  }>;
  posts: Array<{
    id: string;
    content: string;
    createdAt: string;
    isPinned: boolean;
    author: {
      id: string;
      firstName: string;
      lastName: string;
    };
    _count: {
      comments: number;
      likes: number;
    };
  }>;
  courses: Array<{
    id: string;
    title: string;
    slug: string;
  }>;
};

type QuestionInsights = {
  space: {
    id: string;
    name: string;
    slug: string;
  };
  totals: {
    postsScanned: number;
    commentsScanned: number;
    detectedQuestions: number;
    groupedTopics: number;
  };
  generatedAt: string;
  topics: Array<{
    key: string;
    label: string;
    keywords: string[];
    questionCount: number;
    sampleQuestion: string;
    questions: Array<{
      id: string;
      text: string;
      createdAt: string;
      authorName: string;
      authorRole: string;
      sourceType: "post" | "comment";
      postId: string;
      href: string;
    }>;
  }>;
};

export default function EditSpacePage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = getTab(searchParams.get("tab"));
  const { toast } = useToast();
  const spaceId = params.id;
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [stats, setStats] = useState<{ posts: number; members: number } | null>(null);
  const [members, setMembers] = useState<SpaceData["members"]>([]);
  const [posts, setPosts] = useState<SpaceData["posts"]>([]);
  const [memberEmails, setMemberEmails] = useState("");
  const [isAddingMembers, setIsAddingMembers] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [questionInsights, setQuestionInsights] = useState<QuestionInsights | null>(null);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [isExporting, setIsExporting] = useState<null | "markdown" | "csv">(null);
  const [availableCourses, setAvailableCourses] = useState<CourseOption[]>([]);
  const [availableOffers, setAvailableOffers] = useState<OfferOption[]>([]);
  const [availableSpaces, setAvailableSpaces] = useState<Array<{ id: string; name: string; slug: string }>>([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedOfferId, setSelectedOfferId] = useState("");
  const [moveTargets, setMoveTargets] = useState<Record<string, string>>({});
  const [movingPostId, setMovingPostId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    groupLabel: "",
    description: "",
    iconEmoji: "💬",
    isPublic: true,
    isHostOnly: false,
    isActive: true,
    position: 0,
    linkedOfferIds: [] as string[],
    linkedCourseIds: [] as string[],
  });
  const accessLevel = formData.isPublic ? "public" : "group";
  const effectiveLinkedCourseIds = uniqueIds([
    ...formData.linkedCourseIds,
    ...formData.linkedOfferIds.flatMap((offerId) => {
      const offer = availableOffers.find((entry) => entry.id === offerId);
      return offer?.courseIds || [];
    }),
  ]);

  useEffect(() => {
    if (!spaceId) return;
    const load = async () => {
      setIsLoading(true);
      try {
        const [spaceResponse, coursesResponse, offersResponse, spacesResponse] = await Promise.all([
          fetch(`/api/admin/community/spaces/${spaceId}`),
          fetch("/api/admin/courses"),
          fetch("/api/admin/offers"),
          fetch("/api/admin/community/spaces"),
        ]);
        const [spaceData, coursesData, offersData, spacesData] = await Promise.all([
          spaceResponse.json(),
          coursesResponse.json(),
          offersResponse.json(),
          spacesResponse.json(),
        ]);
        if (!spaceResponse.ok) throw new Error(spaceData.error || "Could not load space");

        const space = spaceData as SpaceData;
        const nextOffers = Array.isArray(offersData?.offers)
          ? offersData.offers
              .map((offer: { id: string; title: string; courses?: Array<{ course?: { id?: string } }> }) => ({
                id: offer.id,
                title: offer.title,
                courseIds: uniqueIds(
                  (offer.courses || [])
                    .map((entry) => entry.course?.id)
                    .filter((value): value is string => Boolean(value))
                ),
              }))
              .filter((offer: OfferOption) => offer.courseIds.length > 0)
          : [];
        const linkedCourseIds = space.courses.map((course) => course.id);
        const inferredLinkedOfferIds = nextOffers
          .filter((offer: OfferOption) =>
            offer.courseIds.every((courseId: string) => linkedCourseIds.includes(courseId))
          )
          .map((offer: OfferOption) => offer.id);

        setFormData({
          name: space.name,
          slug: space.slug,
          groupLabel: space.groupLabel || "",
          description: space.description || "",
          iconEmoji: space.iconEmoji || "💬",
          isPublic: space.isPublic,
          isHostOnly: space.isHostOnly,
          isActive: space.isActive,
          position: space.position,
          linkedOfferIds: inferredLinkedOfferIds,
          linkedCourseIds,
        });
        setStats({
          posts: space._count.posts,
          members: space._count.members,
        });
        setMembers(space.members || []);
        setPosts(space.posts || []);
        setAvailableCourses(
          Array.isArray(coursesData)
            ? coursesData.map((course) => ({ id: course.id, title: course.title }))
            : []
        );
        setAvailableOffers(nextOffers);
        setAvailableSpaces(
          Array.isArray(spacesData)
            ? spacesData.map((space) => ({ id: space.id, name: space.name, slug: space.slug }))
            : []
        );
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Could not load space",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [spaceId, toast]);

  const refreshMembers = async () => {
    if (!spaceId) return;

    const response = await fetch(`/api/admin/community/spaces/${spaceId}/members`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Could not load members");
    }

    setMembers(data.members || []);
    setStats((prev) =>
      prev
        ? {
            ...prev,
            members: (data.members || []).length,
          }
        : prev
    );
  };

  const handleNameChange = (name: string) => {
    const slug = name
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();

    setFormData((prev) => ({ ...prev, name, slug }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spaceId) return;
    setIsSaving(true);

    try {
      if (!formData.isPublic && !formData.groupLabel.trim()) {
        throw new Error("Add a client group label for this restricted space.");
      }

      const response = await fetch(`/api/admin/community/spaces/${spaceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          description: formData.description.trim() || null,
          iconEmoji: formData.iconEmoji.trim() || null,
          linkedCourseIds: effectiveLinkedCourseIds,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Save failed");

      toast({
        title: "Saved",
        description: "Space updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Could not save space",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!spaceId) return;
    const confirmed = window.confirm(
      "Are you sure you want to delete this space? Posts inside this space will also be removed."
    );
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/community/spaces/${spaceId}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Delete failed");

      toast({
        title: "Space deleted",
      });
      router.push("/admin/community");
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Could not delete space",
        variant: "destructive",
      });
      setIsDeleting(false);
    }
  };

  const handleAddMembers = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!spaceId) return;

    const emails = memberEmails
      .split(/[\n,;]/)
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);

    if (emails.length === 0) {
      toast({
        title: "No emails",
        description: "Add at least one email address to invite members.",
        variant: "destructive",
      });
      return;
    }

    setIsAddingMembers(true);
    try {
      const response = await fetch(`/api/admin/community/spaces/${spaceId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not add members");

      toast({
        title: "Members added",
        description: `${data.added} added, ${data.skipped} skipped.`,
      });
      setMemberEmails("");
      await refreshMembers();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Could not add members",
        variant: "destructive",
      });
    } finally {
      setIsAddingMembers(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!spaceId) return;
    setRemovingMemberId(memberId);

    try {
      const response = await fetch(`/api/admin/community/spaces/${spaceId}/members/${memberId}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not remove member");

      toast({ title: "Member removed" });
      await refreshMembers();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Could not remove member",
        variant: "destructive",
      });
    } finally {
      setRemovingMemberId(null);
    }
  };

  const handleMovePost = async (postId: string) => {
    const targetSpaceId = moveTargets[postId];
    if (!targetSpaceId) {
      toast({
        title: "Select a space",
        description: "Choose the target community before moving this conversation.",
        variant: "destructive",
      });
      return;
    }

    setMovingPostId(postId);
    try {
      const response = await fetch(`/api/admin/community/posts/${postId}/move`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spaceId: targetSpaceId }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not move post");
      }

      setPosts((prev) => prev.filter((post) => post.id !== postId));
      setStats((prev) =>
        prev
          ? {
              ...prev,
              posts: Math.max(0, prev.posts - 1),
            }
          : prev
      );
      setMoveTargets((prev) => {
        const next = { ...prev };
        delete next[postId];
        return next;
      });

      toast({
        title: "Conversation moved",
        description: `Moved to ${data.targetSpace?.name ?? "the selected community"}.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Could not move post",
        variant: "destructive",
      });
    } finally {
      setMovingPostId(null);
    }
  };

  const loadQuestionInsights = async () => {
    if (!spaceId) return;
    setIsLoadingInsights(true);
    try {
      const response = await fetch(`/api/admin/community/spaces/${spaceId}/questions`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load question insights");
      setQuestionInsights(data.insights);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Could not load question insights",
        variant: "destructive",
      });
    } finally {
      setIsLoadingInsights(false);
    }
  };

  const exportQuestionInsights = async (format: "markdown" | "csv") => {
    if (!spaceId) return;
    setIsExporting(format);
    try {
      const response = await fetch(`/api/admin/community/spaces/${spaceId}/questions?format=${format}`);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Export failed");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${formData.slug || "community-questions"}.${format === "markdown" ? "md" : "csv"}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Could not export insights",
        variant: "destructive",
      });
    } finally {
      setIsExporting(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-5 lg:p-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <section className="rounded-xl border border-border bg-white px-4 py-3 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
            <Link
              href="/admin/community"
              className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Terug naar communities
            </Link>
                <h1 className="mt-2 truncate text-lg font-semibold text-slate-950">
                  {formData.iconEmoji} {formData.name}
                </h1>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {(stats?.posts ?? 0)} posts · {(stats?.members ?? 0)} members
                  {formData.groupLabel ? ` · ${formData.groupLabel}` : ""}
                </p>
            </div>
                <div className="flex flex-wrap gap-1.5">
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/community/${formData.slug}`} target="_blank">
                      <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                      Open community
                    </Link>
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/admin/community/spaces/${spaceId}?tab=members`}>
                      <Users className="mr-1.5 h-3.5 w-3.5" />Leden
                    </Link>
                  </Button>
                </div>
          </div>
        </section>

        <section className="flex flex-wrap gap-2">
          {SPACE_TABS.map((tab) => (
            <Link
              key={tab.id}
              href={`/admin/community/spaces/${spaceId}?tab=${tab.id}`}
              className={cn(
                "rounded-md border px-3 py-1.5 text-xs font-medium transition",
                activeTab === tab.id
                  ? "border-stone-950 bg-stone-950 text-white"
                  : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground"
              )}
              aria-current={activeTab === tab.id ? "page" : undefined}
            >
              {tab.label}
            </Link>
          ))}
        </section>

        {activeTab === "settings" ? (
          <Card className="app-halo">
              <CardHeader>
                <CardTitle>Space settings</CardTitle>
              </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-6">
                <div className="space-y-2">
                  <Label>Icon</Label>
                  <div className="flex flex-wrap gap-2">
                    {EMOJI_OPTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, iconEmoji: emoji }))}
                        className={`rounded-lg border p-2 text-2xl transition-colors ${
                          formData.iconEmoji === emoji
                            ? "border-primary bg-primary/10"
                            : "border-transparent hover:bg-muted"
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Name">
                    <Input value={formData.name} onChange={(e) => handleNameChange(e.target.value)} required />
                  </Field>
                  <Field label="Slug">
                    <Input value={formData.slug} onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))} required />
                  </Field>
                </div>

                <Field label="Description">
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    className="min-h-[96px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                </Field>

                <Field label="Position">
                  <Input
                    type="number"
                    min={0}
                    value={formData.position}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        position: Number.isNaN(Number(e.target.value)) ? 0 : Number(e.target.value),
                      }))
                    }
                  />
                </Field>

                <div className="rounded-2xl border border-border bg-muted/20 p-4">
                  <Field label="Linked products">
                    <div className="flex flex-col gap-3 md:flex-row">
                      <select
                        value={selectedOfferId}
                        onChange={(e) => setSelectedOfferId(e.target.value)}
                        className="flex h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                      >
                        <option value="">Select an offer or product...</option>
                        {availableOffers
                          .filter((offer) => !formData.linkedOfferIds.includes(offer.id))
                          .map((offer) => (
                            <option key={offer.id} value={offer.id}>
                              {offer.title}
                            </option>
                          ))}
                      </select>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          if (!selectedOfferId) return;
                          setFormData((prev) => ({
                            ...prev,
                            linkedOfferIds: uniqueIds([...prev.linkedOfferIds, selectedOfferId]),
                          }));
                          setSelectedOfferId("");
                        }}
                      >
                        Link product
                      </Button>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Linking an offer automatically links every course inside that offer to this space.
                    </p>
                    {formData.linkedOfferIds.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {formData.linkedOfferIds.map((offerId) => {
                          const offer = availableOffers.find((entry) => entry.id === offerId);
                          return (
                            <span
                              key={offerId}
                              className="inline-flex items-center gap-2 rounded-full bg-background px-3 py-1.5 text-sm text-foreground"
                            >
                              {offer?.title || offerId}
                              <button
                                type="button"
                                onClick={() =>
                                  setFormData((prev) => ({
                                    ...prev,
                                    linkedOfferIds: prev.linkedOfferIds.filter((entry) => entry !== offerId),
                                  }))
                                }
                                className="text-muted-foreground"
                                aria-label="Remove linked product"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    ) : null}
                  </Field>
                </div>

                <div className="rounded-2xl border border-border bg-muted/20 p-4">
                  <Field label="Linked courses">
                    <div className="flex flex-col gap-3 md:flex-row">
                      <select
                        value={selectedCourseId}
                        onChange={(e) => setSelectedCourseId(e.target.value)}
                        className="flex h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                      >
                        <option value="">Select a standalone course...</option>
                        {availableCourses
                          .filter((course) => !effectiveLinkedCourseIds.includes(course.id))
                          .map((course) => (
                            <option key={course.id} value={course.id}>
                              {course.title}
                            </option>
                          ))}
                      </select>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          if (!selectedCourseId) return;
                          setFormData((prev) => ({
                            ...prev,
                            linkedCourseIds: uniqueIds([...prev.linkedCourseIds, selectedCourseId]),
                          }));
                          setSelectedCourseId("");
                        }}
                      >
                        Link course
                      </Button>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Use this when access should come from one specific course instead of a full offer.
                    </p>
                    {formData.linkedCourseIds.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {formData.linkedCourseIds.map((courseId) => {
                          const course = availableCourses.find((entry) => entry.id === courseId);
                          return (
                            <span
                              key={courseId}
                              className="inline-flex items-center gap-2 rounded-full bg-background px-3 py-1.5 text-sm text-foreground"
                            >
                              {course?.title || courseId}
                              <button
                                type="button"
                                onClick={() =>
                                  setFormData((prev) => ({
                                    ...prev,
                                    linkedCourseIds: prev.linkedCourseIds.filter((entry) => entry !== courseId),
                                  }))
                                }
                                className="text-muted-foreground"
                                aria-label="Remove linked product"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    ) : null}
                  </Field>
                </div>

                <div className="space-y-4 rounded-2xl border border-border bg-muted/20 p-4">
                  <div className="rounded-2xl border border-border bg-background p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium text-foreground">Publish space</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Turn this on to show the space to members. When off, the space disappears from the community.
                        </p>
                      </div>
                      <Switch
                        checked={formData.isActive}
                        onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isActive: checked }))}
                        ariaLabel="Publish space"
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border bg-background p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium text-foreground">Only hosts can post</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Use this for announcements and one-way communication.
                        </p>
                      </div>
                      <Switch
                        checked={formData.isHostOnly}
                        onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isHostOnly: checked }))}
                        ariaLabel="Only hosts can post"
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border bg-background p-4">
                    <Label>Access level</Label>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, isPublic: true }))}
                        className={cn(
                          "rounded-2xl border px-4 py-4 text-left transition",
                          accessLevel === "public"
                            ? "border-primary bg-primary/10"
                            : "border-border bg-background"
                        )}
                      >
                        <p className="font-medium text-foreground">Public</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          All members with community access can see this space.
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, isPublic: false }))}
                        className={cn(
                          "rounded-2xl border px-4 py-4 text-left transition",
                          accessLevel === "group"
                            ? "border-primary bg-primary/10"
                            : "border-border bg-background"
                        )}
                      >
                        <p className="font-medium text-foreground">Restricted client group</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Only clients you add to this space can access it.
                        </p>
                      </button>
                    </div>

                    {!formData.isPublic ? (
                      <div className="mt-4 space-y-2">
                        <Label htmlFor="groupLabel">Group label</Label>
                        <Input
                          id="groupLabel"
                          value={formData.groupLabel}
                          onChange={(e) => setFormData((prev) => ({ ...prev, groupLabel: e.target.value }))}
                          placeholder="For example: Challenge 15 cohort"
                        />
                        <p className="text-xs text-muted-foreground">
                          Then use the members tab to add the right clients to this restricted space.
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save
                  </Button>
                  <Button type="button" variant="outline" onClick={handleDelete} disabled={isDeleting}>
                    {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                    Delete
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : null}

        {activeTab === "members" ? (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]">
            <Card className="app-halo">
              <CardHeader>
                <CardTitle>Space members</CardTitle>
              </CardHeader>
              <CardContent>
                {members.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No members are linked to this space yet.</p>
                ) : (
                  <div className="space-y-3">
                    {members.map((member) => (
                      <div key={member.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                        <div className="min-w-0">
                          <p className="font-medium">
                            {member.user.firstName} {member.user.lastName}
                          </p>
                          <p className="truncate text-sm text-muted-foreground">{member.user.email}</p>
                          <p className="text-xs text-muted-foreground">
                            {member.user.role} • added on {new Date(member.createdAt).toLocaleDateString("en-GB")}
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={removingMemberId === member.id}
                          onClick={() => void handleRemoveMember(member.id)}
                        >
                          {removingMemberId === member.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="app-halo">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-primary" />
                  Add members
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddMembers} className="space-y-4">
                  <Field label="Emails">
                    <textarea
                      value={memberEmails}
                      onChange={(e) => setMemberEmails(e.target.value)}
                      placeholder="client1@email.com&#10;client2@email.com"
                      className="min-h-[120px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    />
                  </Field>
                  <Button type="submit" disabled={isAddingMembers}>
                    {isAddingMembers ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                    Add members
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {activeTab === "content" ? (
          <Card className="app-halo">
            <CardHeader>
              <CardTitle>Recent posts</CardTitle>
            </CardHeader>
            <CardContent>
              {posts.length === 0 ? (
                <p className="text-sm text-muted-foreground">There are no posts in this space yet.</p>
              ) : (
                <div className="space-y-3">
                  {posts.map((post) => (
                    <div
                      key={post.id}
                      className="rounded-lg border p-3"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <Link
                          href={`/community/post/${post.id}`}
                          className="block min-w-0 flex-1 transition-colors hover:text-foreground"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium">
                              {post.author.firstName} {post.author.lastName}
                            </p>
                            {post.isPinned ? (
                              <span className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">Pinned</span>
                            ) : null}
                          </div>
                          <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{post.content}</p>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {new Date(post.createdAt).toLocaleDateString("en-GB")} • {post._count.comments} comments • {post._count.likes} likes
                          </p>
                        </Link>

                        <div className="w-full rounded-2xl border border-border bg-muted/20 p-3 lg:w-[320px]">
                          <p className="text-sm font-medium text-foreground">Move conversation</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Move this post, including its comments and likes, to another community space.
                          </p>
                          <div className="mt-3 flex flex-col gap-2">
                            <select
                              value={moveTargets[post.id] || ""}
                              onChange={(event) =>
                                setMoveTargets((prev) => ({
                                  ...prev,
                                  [post.id]: event.target.value,
                                }))
                              }
                              className="flex h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                            >
                              <option value="">Select target community...</option>
                              {availableSpaces
                                .filter((space) => space.id !== spaceId)
                                .map((space) => (
                                  <option key={space.id} value={space.id}>
                                    {space.name}
                                  </option>
                                ))}
                            </select>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => void handleMovePost(post.id)}
                              disabled={movingPostId === post.id || !moveTargets[post.id]}
                            >
                              {movingPostId === post.id ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : null}
                              Move to community
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ) : null}

        {activeTab === "insights" ? (
          <Card className="app-halo">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                AI vraaganalyse
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Verzamel vragen uit posts en reacties, groepeer ze op onderwerp en exporteer ze voor FAQ, contentplanning of support.
              </p>

              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={() => void loadQuestionInsights()} disabled={isLoadingInsights}>
                  {isLoadingInsights ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Brain className="mr-2 h-4 w-4" />}
                  Analyseer vragen
                </Button>
                <Button type="button" variant="outline" onClick={() => void exportQuestionInsights("markdown")} disabled={!questionInsights || isExporting !== null}>
                  {isExporting === "markdown" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                  Export .md
                </Button>
                <Button type="button" variant="outline" onClick={() => void exportQuestionInsights("csv")} disabled={!questionInsights || isExporting !== null}>
                  {isExporting === "csv" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                  Export .csv
                </Button>
              </div>

              {questionInsights ? (
                <div className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <OverviewStat icon={Brain} label="Gevonden vragen" value={String(questionInsights.totals.detectedQuestions)} helper="Gedetecteerde vragen in posts en comments." />
                    <OverviewStat icon={Workflow} label="Onderwerpen" value={String(questionInsights.totals.groupedTopics)} helper="Gegroepeerde thema's voor FAQ en support." />
                  </div>

                  {questionInsights.topics.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Er zijn nog geen duidelijke vragen gevonden in deze space.</p>
                  ) : (
                    <div className="space-y-3">
                      {questionInsights.topics.map((topic) => (
                        <div key={topic.key} className="rounded-lg border p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-medium">{topic.label}</p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                Keywords: {topic.keywords.join(", ") || "algemeen"}
                              </p>
                            </div>
                            <span className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">
                              {topic.questionCount} vragen
                            </span>
                          </div>
                          <p className="mt-3 text-sm text-muted-foreground">Voorbeeld: {topic.sampleQuestion}</p>
                          <div className="mt-3 space-y-2">
                            {topic.questions.slice(0, 3).map((question) => (
                              <Link
                                key={question.id}
                                href={question.href}
                                className="block rounded-md bg-muted/40 px-3 py-2 text-sm transition-colors hover:bg-muted"
                              >
                                <p>{question.text}</p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {question.authorName} • {question.sourceType} • {new Date(question.createdAt).toLocaleDateString("nl-BE")}
                                </p>
                              </Link>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

function OverviewStat({
  icon: Icon,
  label,
  value,
  helper,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-border bg-background/90 p-5">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Icon className="h-4 w-4 text-primary" />
        {label}
      </div>
      <p className="mt-4 text-2xl font-semibold text-foreground">{value}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{helper}</p>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
