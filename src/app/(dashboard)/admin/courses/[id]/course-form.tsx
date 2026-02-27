"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface Course {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  thumbnailUrl: string | null;
  isPublished: boolean;
  isPrivate: boolean;
  hasCommunity: boolean;
  drippingEnabled: boolean;
  drippingUnit: string | null;
  photoMomentsCount: number;
  photoMomentsIntervalWeeks: number | null;
}

interface CourseEditFormProps {
  course: Course;
}

export function CourseEditForm({ course }: CourseEditFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: course.title,
    slug: course.slug,
    description: course.description || "",
    thumbnailUrl: course.thumbnailUrl || "",
    isPublished: course.isPublished,
    isPrivate: course.isPrivate,
    hasCommunity: course.hasCommunity ?? true,
    drippingEnabled: course.drippingEnabled,
    drippingUnit: course.drippingUnit || "days",
    photoMomentsCount: course.photoMomentsCount ?? 0,
    photoMomentsIntervalWeeks: course.photoMomentsIntervalWeeks ?? "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(`/api/admin/courses/${course.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          hasCommunity: formData.hasCommunity,
          photoMomentsIntervalWeeks:
            formData.photoMomentsCount > 0 && formData.photoMomentsIntervalWeeks !== ""
              ? Number(formData.photoMomentsIntervalWeeks)
              : null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update course");
      }

      toast({
        title: "Opgeslagen",
        description: "De cursus is bijgewerkt.",
      });

      router.refresh();
    } catch (error) {
      toast({
        title: "Fout",
        description: "Kon cursus niet opslaan.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Titel</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="slug">Slug (URL)</Label>
        <Input
          id="slug"
          value={formData.slug}
          onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
          required
        />
        <p className="text-xs text-muted-foreground">
          /courses/{formData.slug}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Beschrijving</Label>
        <textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="flex w-full rounded-lg border border-border bg-background px-3 py-2 text-sm min-h-[100px]"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="thumbnailUrl">Thumbnail URL</Label>
        <Input
          id="thumbnailUrl"
          value={formData.thumbnailUrl}
          onChange={(e) => setFormData({ ...formData, thumbnailUrl: e.target.value })}
          placeholder="https://..."
        />
      </div>

      <div className="space-y-4 pt-4 border-t">
        <div className="flex items-center justify-between">
          <div>
            <Label>Gepubliceerd</Label>
            <p className="text-sm text-muted-foreground">
              Zichtbaar voor ingeschreven klanten
            </p>
          </div>
          <input
            type="checkbox"
            checked={formData.isPublished}
            onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
            className="h-4 w-4"
          />
        </div>

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
                  photoMomentsIntervalWeeks: e.target.value === "" ? "" : Math.max(1, parseInt(e.target.value, 10) || 1),
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

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Opslaan...
          </>
        ) : (
          "Opslaan"
        )}
      </Button>
    </form>
  );
}
