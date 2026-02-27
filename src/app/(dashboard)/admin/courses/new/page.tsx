"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { ChevronLeft, Loader2 } from "lucide-react";

export default function NewCoursePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    description: "",
    isPrivate: false,
    hasCommunity: true,
    drippingEnabled: false,
    drippingUnit: "weeks",
    photoMomentsCount: 0,
    photoMomentsIntervalWeeks: "" as number | "",
  });

  // Auto-generate slug from title
  const handleTitleChange = (title: string) => {
    const slug = title
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
    
    setFormData({ ...formData, title, slug });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/admin/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          slug: formData.slug,
          description: formData.description,
          isPrivate: formData.isPrivate,
          hasCommunity: formData.hasCommunity,
          drippingEnabled: formData.drippingEnabled,
          drippingUnit: formData.drippingUnit,
          photoMomentsCount: formData.photoMomentsCount,
          photoMomentsIntervalWeeks:
            formData.photoMomentsCount > 0 && formData.photoMomentsIntervalWeeks !== ""
              ? Number(formData.photoMomentsIntervalWeeks)
              : null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create course");
      }

      const course = await response.json();
      
      toast({
        title: "Cursus aangemaakt",
        description: "Je kunt nu modules en lessen toevoegen.",
      });

      router.push(`/admin/courses/${course.id}`);
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
    <div className="p-6 md:p-8 lg:p-12 max-w-2xl">
      <Link 
        href="/admin/courses"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Terug naar cursussen
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-2xl tracking-wider">
            NIEUWE CURSUS
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Titel *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="bijv. 8 Weken Reset Challenge"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug (URL) *</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="8-weken-reset-challenge"
                required
              />
              <p className="text-xs text-muted-foreground">
                /courses/{formData.slug || "..."}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Beschrijving</Label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="flex w-full rounded-lg border border-border bg-background px-3 py-2 text-sm min-h-[100px]"
                placeholder="Korte beschrijving van de cursus..."
              />
            </div>

            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <Label>1-op-1 Traject</Label>
                  <p className="text-sm text-muted-foreground">
                    Privé cursus voor individuele klanten
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.isPrivate}
                  onChange={(e) => setFormData({ ...formData, isPrivate: e.target.checked })}
                  className="h-4 w-4"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Heeft community</Label>
                  <p className="text-sm text-muted-foreground">
                    Minicursussen zonder groep: uitvinken
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.hasCommunity}
                  onChange={(e) => setFormData({ ...formData, hasCommunity: e.target.checked })}
                  className="h-4 w-4"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Dripping inschakelen</Label>
                  <p className="text-sm text-muted-foreground">
                    Content gefaseerd vrijgeven
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.drippingEnabled}
                  onChange={(e) => setFormData({ ...formData, drippingEnabled: e.target.checked })}
                  className="h-4 w-4"
                />
              </div>

              {formData.drippingEnabled && (
                <div className="space-y-2">
                  <Label htmlFor="drippingUnit">Dripping eenheid</Label>
                  <select
                    id="drippingUnit"
                    value={formData.drippingUnit}
                    onChange={(e) => setFormData({ ...formData, drippingUnit: e.target.value })}
                    className="flex w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="days">Dagen</option>
                    <option value="weeks">Weken</option>
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Bepaalt hoe &quot;unlock na X&quot; wordt berekend per module/les
                  </p>
                </div>
              )}

              <div className="space-y-2 pt-4 border-t">
                <Label htmlFor="photoMomentsCount">Progressiefoto&apos;s – aantal momenten</Label>
                <input
                  id="photoMomentsCount"
                  type="number"
                  min={0}
                  value={formData.photoMomentsCount}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      photoMomentsCount: Math.max(0, parseInt(e.target.value, 10) || 0),
                    })
                  }
                  className="flex w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Aantal keren dat deelnemers voor/na foto&apos;s moeten insturen (0 = uit)
                </p>
              </div>
              {formData.photoMomentsCount > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="photoMomentsIntervalWeeks">Interval (weken)</Label>
                  <input
                    id="photoMomentsIntervalWeeks"
                    type="number"
                    min={1}
                    value={formData.photoMomentsIntervalWeeks === "" ? "" : formData.photoMomentsIntervalWeeks}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        photoMomentsIntervalWeeks:
                          e.target.value === "" ? "" : Math.max(1, parseInt(e.target.value, 10) || 1),
                      })
                    }
                    placeholder="bijv. 4"
                    className="flex w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Om de hoeveel weken (bv. 4 = week 0, 4, 8, …)
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Aanmaken...
                  </>
                ) : (
                  "Cursus aanmaken"
                )}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/admin/courses">Annuleren</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
