"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { ChevronLeft, Loader2, Lock, Megaphone, PauseCircle, Users, X } from "lucide-react";

const EMOJI_OPTIONS = ["💬", "📢", "🎉", "🍽️", "💪", "❤️", "🌿", "⭐", "🔥", "💡"];
type CourseOption = { id: string; title: string };
type OfferOption = { id: string; title: string; courseIds: string[] };

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function uniqueIds(values: string[]) {
  return Array.from(new Set(values));
}

export default function NewSpacePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [availableCourses, setAvailableCourses] = useState<CourseOption[]>([]);
  const [availableOffers, setAvailableOffers] = useState<OfferOption[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedOfferId, setSelectedOfferId] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    groupLabel: "",
    description: "",
    iconEmoji: "💬",
    isPublic: true,
    isHostOnly: false,
    isActive: true,
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
    Promise.all([fetch("/api/admin/courses"), fetch("/api/admin/offers")])
      .then(async ([coursesResponse, offersResponse]) => {
        const [coursesData, offersData] = await Promise.all([
          coursesResponse.json(),
          offersResponse.json(),
        ]);
        setAvailableCourses(
          Array.isArray(coursesData)
            ? coursesData.map((course) => ({ id: course.id, title: course.title }))
            : []
        );
        setAvailableOffers(
          Array.isArray(offersData?.offers)
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
            : []
        );
      })
      .catch(() => {
        setAvailableCourses([]);
        setAvailableOffers([]);
      });
  }, []);

  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      slug: !prev.slug || prev.slug === slugify(prev.name) ? slugify(name) : prev.slug,
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);

    try {
      if (!formData.isPublic && !formData.groupLabel.trim()) {
        throw new Error("Add a client group label for this restricted space.");
      }

      const response = await fetch("/api/admin/community/spaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          slug: slugify(formData.slug),
          linkedCourseIds: effectiveLinkedCourseIds,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Could not create space");
      }

      toast({
        title: "Space created",
        description: "Your new community space is ready.",
      });

      router.push("/admin/community");
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Could not create space",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f6f1e7_0%,#fcfbf7_28%,#ffffff_100%)]">
      <div className="mx-auto max-w-5xl p-6 md:p-8 lg:p-12">
        <Link
          href="/admin/community"
          className="inline-flex items-center text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back to community
        </Link>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="rounded-[2rem] border-stone-200 bg-white shadow-[0_24px_80px_-55px_rgba(0,0,0,0.35)]">
            <CardHeader>
              <CardTitle className="font-display text-3xl tracking-[0.08em] text-stone-900">
                NEW SPACE
              </CardTitle>
              <CardDescription>
                Create a new space for conversations, announcements, or program-specific support.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label>Icon</Label>
                  <div className="flex flex-wrap gap-2">
                    {EMOJI_OPTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, iconEmoji: emoji }))}
                        className={`rounded-2xl border px-4 py-3 text-2xl transition ${
                          formData.iconEmoji === emoji
                            ? "border-primary bg-primary/10"
                            : "border-stone-200 bg-stone-50 hover:bg-white"
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(event) => handleNameChange(event.target.value)}
                      placeholder="For example: General"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="slug">Slug *</Label>
                    <Input
                      id="slug"
                      value={formData.slug}
                      onChange={(event) => setFormData((prev) => ({ ...prev, slug: event.target.value }))}
                      placeholder="general"
                      required
                    />
                  </div>
                </div>

                <div className="rounded-2xl bg-stone-50 px-4 py-3 text-sm text-stone-600">
                  Community link: <span className="font-medium text-stone-900">/community/{formData.slug || "your-space"}</span>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))}
                    className="min-h-[100px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    placeholder="Describe in one sentence what this space is for."
                  />
                </div>

                <div className="rounded-[1.5rem] border border-stone-200 bg-stone-50 p-4">
                  <Label htmlFor="linkedOffer">Linked products</Label>
                  <div className="mt-3 flex flex-col gap-3 md:flex-row">
                    <select
                      id="linkedOffer"
                      value={selectedOfferId}
                      onChange={(event) => setSelectedOfferId(event.target.value)}
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
                    Example: link `Simply Challenge 15` so every course inside that offer automatically grants access to this space.
                  </p>
                  {formData.linkedOfferIds.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {formData.linkedOfferIds.map((offerId) => {
                        const offer = availableOffers.find((entry) => entry.id === offerId);
                        return (
                          <span
                            key={offerId}
                            className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm text-stone-900"
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
                </div>

                <div className="rounded-[1.5rem] border border-stone-200 bg-stone-50 p-4">
                  <Label htmlFor="linkedCourse">Linked courses</Label>
                  <div className="mt-3 flex flex-col gap-3 md:flex-row">
                    <select
                      id="linkedCourse"
                      value={selectedCourseId}
                      onChange={(event) => setSelectedCourseId(event.target.value)}
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
                            className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm text-stone-900"
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
                              aria-label="Remove linked course"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  ) : null}
                </div>

                <div className="grid gap-4">
                  <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4">
                    <div>
                      <p className="font-medium text-stone-900">Publish space</p>
                      <p className="mt-1 text-sm text-stone-600">
                        Turn this on to show the space to members. When off, the space disappears from the member-facing community.
                      </p>
                    </div>
                    <div className="mt-3 flex items-center justify-end">
                      <Switch
                        checked={formData.isActive}
                        onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isActive: checked }))}
                        ariaLabel="Publish space"
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4">
                    <div>
                      <p className="font-medium text-stone-900">Only hosts can post</p>
                      <p className="mt-1 text-sm text-stone-600">
                        Useful for announcements or updates without open discussion in the feed.
                      </p>
                    </div>
                    <div className="mt-3 flex items-center justify-end">
                      <Switch
                        checked={formData.isHostOnly}
                        onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isHostOnly: checked }))}
                        ariaLabel="Only hosts can post"
                      />
                    </div>
                  </div>

                  <div className="rounded-[1.5rem] border border-stone-200 bg-stone-50 p-4">
                    <Label>Access level</Label>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, isPublic: true }))}
                        className={`rounded-2xl border px-4 py-4 text-left transition ${
                          accessLevel === "public"
                            ? "border-primary bg-primary/10"
                            : "border-stone-200 bg-white"
                        }`}
                      >
                        <p className="font-medium text-stone-900">Public</p>
                        <p className="mt-1 text-sm text-stone-600">
                          All members with community access can see this space.
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, isPublic: false }))}
                        className={`rounded-2xl border px-4 py-4 text-left transition ${
                          accessLevel === "group"
                            ? "border-primary bg-primary/10"
                            : "border-stone-200 bg-white"
                        }`}
                      >
                        <p className="font-medium text-stone-900">Restricted client group</p>
                        <p className="mt-1 text-sm text-stone-600">
                          Only clients you add to this space will get access.
                        </p>
                      </button>
                    </div>

                    {!formData.isPublic ? (
                      <div className="mt-4 space-y-2">
                        <Label htmlFor="groupLabel">Group label</Label>
                        <Input
                          id="groupLabel"
                          value={formData.groupLabel}
                          onChange={(event) =>
                            setFormData((prev) => ({ ...prev, groupLabel: event.target.value }))
                          }
                          placeholder="For example: Challenge 15 cohort"
                        />
                        <p className="text-xs text-muted-foreground">
                          After creating the space, add the right clients in the members section.
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button type="submit" disabled={isLoading} className="rounded-full px-6">
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Create space
                  </Button>
                  <Button type="button" variant="outline" asChild className="rounded-full px-6">
                    <Link href="/admin/community">Cancel</Link>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-5">
            <Card className="rounded-[2rem] border-stone-200 bg-stone-950 text-stone-100 shadow-[0_24px_80px_-55px_rgba(0,0,0,0.6)]">
              <CardHeader>
                <CardTitle className="text-white">Recommended setups</CardTitle>
                <CardDescription className="text-stone-400">
                  Pick the right type of space from the start.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-stone-300">
                <div className="rounded-2xl bg-white/5 p-4">
                  <div className="flex items-center gap-2 font-medium text-white">
                    <Users className="h-4 w-4" />
                    Group space
                  </div>
                  <p className="mt-2 leading-6">
                    Best for questions, wins, updates, and day-to-day member interaction.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 p-4">
                  <div className="flex items-center gap-2 font-medium text-white">
                    <Lock className="h-4 w-4" />
                    Restricted space
                  </div>
                  <p className="mt-2 leading-6">
                    Turn public access off for a selected cohort. Only linked clients will see and access this space.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 p-4">
                  <div className="flex items-center gap-2 font-medium text-white">
                    <Megaphone className="h-4 w-4" />
                    Announcements
                  </div>
                  <p className="mt-2 leading-6">
                    Turn on host-only posting when you only want to share important updates.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 p-4">
                  <div className="flex items-center gap-2 font-medium text-white">
                    <PauseCircle className="h-4 w-4" />
                    Temporarily paused
                  </div>
                  <p className="mt-2 leading-6">
                    Helpful between cohorts or during a break. Content stays intact while the space is hidden from members.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
