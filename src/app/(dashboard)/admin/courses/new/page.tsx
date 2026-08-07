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
import { ChevronLeft, Loader2, Sparkles, Users, Video } from "lucide-react";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export default function NewCoursePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [spaces, setSpaces] = useState<Array<{ id: string; name: string; slug: string }>>([]);
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    description: "",
    isPrivate: false,
    hideForUnauthorized: true,
    hasCommunity: true,
    communitySpaceId: "",
    createCommunitySpace: true,
    drippingEnabled: false,
    drippingUnit: "weeks",
    photoMomentsCount: 0,
    photoMomentsIntervalWeeks: "" as number | "",
  });

  useEffect(() => {
    const loadSpaces = async () => {
      try {
        const response = await fetch("/api/admin/community/spaces");
        const data = await response.json();
        if (response.ok) {
          setSpaces(data || []);
        }
      } catch {
        // Ignore loading issues here.
      }
    };
    void loadSpaces();
  }, []);

  const handleTitleChange = (title: string) => {
    setFormData((prev) => ({
      ...prev,
      title,
      slug: !prev.slug || prev.slug === slugify(prev.title) ? slugify(title) : prev.slug,
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/admin/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          slug: slugify(formData.slug),
          description: formData.description,
          isPrivate: formData.isPrivate,
          hideForUnauthorized: formData.hideForUnauthorized,
          hasCommunity: formData.hasCommunity,
          communitySpaceId: formData.hasCommunity ? formData.communitySpaceId || null : null,
          createCommunitySpace:
            formData.hasCommunity && !formData.communitySpaceId && formData.createCommunitySpace,
          drippingEnabled: formData.drippingEnabled,
          drippingUnit: formData.drippingUnit,
          photoMomentsCount: formData.photoMomentsCount,
          photoMomentsIntervalWeeks:
            formData.photoMomentsCount > 0 && formData.photoMomentsIntervalWeeks !== ""
              ? Number(formData.photoMomentsIntervalWeeks)
              : null,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Kon cursus niet aanmaken");
      }

      toast({
        title: "Cursus aangemaakt",
        description: "Je kunt nu modules, lessen, community en groepssessies instellen.",
      });

      router.push(`/admin/courses/${result.id}`);
    } catch (error) {
      toast({
        title: "Fout",
        description: error instanceof Error ? error.message : "Kon cursus niet aanmaken",
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
          href="/admin/courses"
          className="inline-flex items-center text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Terug naar cursussen
        </Link>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="rounded-[2rem] border-stone-200 bg-white shadow-[0_24px_80px_-55px_rgba(0,0,0,0.35)]">
            <CardHeader>
              <CardTitle className="font-display text-3xl tracking-[0.08em] text-stone-900">
                NIEUW PROGRAMMA
              </CardTitle>
              <CardDescription>
                Zet eerst de basis neer. Modules en lessen voeg je daarna toe in de editor.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="title">Titel *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(event) => handleTitleChange(event.target.value)}
                      placeholder="Bijv. Reset in 8 weken"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="slug">Slug *</Label>
                    <Input
                      id="slug"
                      value={formData.slug}
                      onChange={(event) => setFormData((prev) => ({ ...prev, slug: event.target.value }))}
                      placeholder="reset-in-8-weken"
                      required
                    />
                  </div>
                </div>

                <div className="rounded-2xl bg-stone-50 px-4 py-3 text-sm text-stone-600">
                  Publieke cursuslink: <span className="font-medium text-stone-900">/courses/{formData.slug || "jouw-cursus"}</span>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Beschrijving</Label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))}
                    className="min-h-[120px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    placeholder="Omschrijf kort voor wie dit programma is en wat het resultaat is."
                  />
                </div>

                <div className="grid gap-4">
                  <label className="flex items-start justify-between rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4">
                    <div>
                      <p className="font-medium text-stone-900">1-op-1 traject</p>
                      <p className="mt-1 text-sm text-stone-600">
                        Gebruik dit voor privetrajecten in plaats van een open groepsprogramma.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.isPrivate}
                      onChange={(event) => setFormData((prev) => ({ ...prev, isPrivate: event.target.checked }))}
                      className="mt-1 h-4 w-4"
                    />
                  </label>

                  <label className="flex items-start justify-between gap-4 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4">
                    <div>
                      <p className="font-medium text-stone-900">Verbergen zonder toegang</p>
                      <p className="mt-1 text-sm text-stone-600">
                        Aan: alleen deelnemers met toegang zien deze cursus. Uit: deelnemers zonder
                        toegang zien alleen de cursusnaam met een slotje, zonder modules of lessen.
                      </p>
                    </div>
                    <Switch
                      checked={formData.hideForUnauthorized}
                      onCheckedChange={(checked) =>
                        setFormData((prev) => ({ ...prev, hideForUnauthorized: checked }))
                      }
                      ariaLabel="Cursus verbergen voor deelnemers zonder toegang"
                      className="mt-1"
                    />
                  </label>

                  <label className="flex items-start justify-between rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4">
                    <div>
                      <p className="font-medium text-stone-900">Community koppelen</p>
                      <p className="mt-1 text-sm text-stone-600">
                        Geef leden direct toegang tot een groepsruimte rond dit programma.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.hasCommunity}
                      onChange={(event) => setFormData((prev) => ({ ...prev, hasCommunity: event.target.checked }))}
                      className="mt-1 h-4 w-4"
                    />
                  </label>
                </div>

                {formData.hasCommunity ? (
                  <div className="rounded-[1.5rem] border border-stone-200 bg-stone-50 p-4">
                    <div className="space-y-2">
                      <Label htmlFor="communitySpaceId">Bestaande community space</Label>
                      <select
                        id="communitySpaceId"
                        value={formData.communitySpaceId}
                        onChange={(event) =>
                          setFormData((prev) => ({
                            ...prev,
                            communitySpaceId: event.target.value,
                            createCommunitySpace: false,
                          }))
                        }
                        className="flex h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                      >
                        <option value="">Geen bestaande space koppelen</option>
                        {spaces.map((space) => (
                          <option key={space.id} value={space.id}>
                            {space.name} ({space.slug})
                          </option>
                        ))}
                      </select>
                    </div>
                    {!formData.communitySpaceId ? (
                      <label className="mt-4 flex items-center gap-3 text-sm text-stone-700">
                        <input
                          type="checkbox"
                          checked={formData.createCommunitySpace}
                          onChange={(event) =>
                            setFormData((prev) => ({ ...prev, createCommunitySpace: event.target.checked }))
                          }
                          className="h-4 w-4"
                        />
                        Maak automatisch een besloten space voor dit programma
                      </label>
                    ) : null}
                  </div>
                ) : null}

                <div className="rounded-[1.5rem] border border-stone-200 bg-stone-50 p-4">
                  <label className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-stone-900">Dripping activeren</p>
                      <p className="mt-1 text-sm text-stone-600">
                        Modules en lessen gefaseerd vrijgeven per dag of per week.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.drippingEnabled}
                      onChange={(event) => setFormData((prev) => ({ ...prev, drippingEnabled: event.target.checked }))}
                      className="mt-1 h-4 w-4"
                    />
                  </label>
                  {formData.drippingEnabled ? (
                    <div className="mt-4 space-y-2">
                      <Label htmlFor="drippingUnit">Dripping eenheid</Label>
                      <select
                        id="drippingUnit"
                        value={formData.drippingUnit}
                        onChange={(event) => setFormData((prev) => ({ ...prev, drippingUnit: event.target.value }))}
                        className="flex h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                      >
                        <option value="days">Dagen</option>
                        <option value="weeks">Weken</option>
                      </select>
                    </div>
                  ) : null}
                </div>

                <div className="rounded-[1.5rem] border border-stone-200 bg-stone-50 p-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="photoMomentsCount">Aantal fotomomenten</Label>
                      <Input
                        id="photoMomentsCount"
                        type="number"
                        min={0}
                        value={formData.photoMomentsCount}
                        onChange={(event) =>
                          setFormData((prev) => ({
                            ...prev,
                            photoMomentsCount: Number(event.target.value) || 0,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="photoInterval">Interval in weken</Label>
                      <Input
                        id="photoInterval"
                        type="number"
                        min={1}
                        value={formData.photoMomentsIntervalWeeks}
                        onChange={(event) =>
                          setFormData((prev) => ({
                            ...prev,
                            photoMomentsIntervalWeeks:
                              event.target.value === "" ? "" : Number(event.target.value),
                          }))
                        }
                        disabled={formData.photoMomentsCount === 0}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button type="submit" disabled={isLoading} className="rounded-full px-6">
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Programma aanmaken
                  </Button>
                  <Button type="button" variant="outline" asChild className="rounded-full px-6">
                    <Link href="/admin/courses">Annuleren</Link>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-5">
            <Card className="rounded-[2rem] border-stone-200 bg-stone-950 text-stone-100 shadow-[0_24px_80px_-55px_rgba(0,0,0,0.6)]">
              <CardHeader>
                <CardTitle className="text-white">Wat maak je nu aan?</CardTitle>
                <CardDescription className="text-stone-400">
                  Dit is de basisstructuur. Daarna werk je de inhoud verder uit.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-stone-300">
                <div className="rounded-2xl bg-white/5 p-4">
                  <div className="flex items-center gap-2 font-medium text-white">
                    <Sparkles className="h-4 w-4" />
                    Eerste stap
                  </div>
                  <p className="mt-2 leading-6">
                    Na opslaan ga je direct naar de cursuseditor om modules en lessen toe te voegen.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 p-4">
                  <div className="flex items-center gap-2 font-medium text-white">
                    <Users className="h-4 w-4" />
                    Community
                  </div>
                  <p className="mt-2 leading-6">
                    Als je community activeert, kan toegang later automatisch meekoppelen met enrollments en offers.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 p-4">
                  <div className="flex items-center gap-2 font-medium text-white">
                    <Video className="h-4 w-4" />
                    Coaching en lessen
                  </div>
                  <p className="mt-2 leading-6">
                    Je kunt later video&apos;s, downloads, drip-content en progressiefoto&apos;s toevoegen.
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
