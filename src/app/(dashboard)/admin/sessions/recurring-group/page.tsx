"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { ChevronLeft, Loader2, Calendar, Users } from "lucide-react";

const DAYS = [
  { value: 0, label: "Zondag" },
  { value: 1, label: "Maandag" },
  { value: 2, label: "Dinsdag" },
  { value: 3, label: "Woensdag" },
  { value: 4, label: "Donderdag" },
  { value: 5, label: "Vrijdag" },
  { value: 6, label: "Zaterdag" },
];

export default function RecurringGroupSessionPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [courses, setCourses] = useState<{ id: string; title: string }[]>([]);
  const [formData, setFormData] = useState({
    courseId: "",
    title: "",
    dayOfWeek: 1,
    startTime: "19:30",
    duration: "60",
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    fetch("/api/admin/courses")
      .then((res) => res.json())
      .then((data) => setCourses(Array.isArray(data) ? data : []))
      .catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/admin/sessions/recurring-group", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: formData.courseId,
          title: formData.title,
          dayOfWeek: formData.dayOfWeek,
          startTime: formData.startTime,
          duration: parseInt(formData.duration, 10),
          startDate: formData.startDate,
          endDate: formData.endDate,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Kon groepssessies niet plannen");
      }

      toast({
        title: "Groepssessies gepland",
        description: data.message || `${data.created} sessies ingepland.`,
      });

      router.push("/admin/sessions");
    } catch (error) {
      toast({
        title: "Fout",
        description:
          error instanceof Error ? error.message : "Kon groepssessies niet plannen",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-8 lg:p-12 max-w-2xl">
      <Link
        href="/admin/sessions"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Terug naar sessies
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-2xl tracking-wider flex items-center gap-2">
            <Users className="h-6 w-6" />
            GROEPSSESSIE PLANNEN
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Plan terugkerende coaching voor alle deelnemers van een traject (bijv. elke maandag 19:30–20:30 tot einddatum). Elke deelnemer krijgt de sessies in de app en een herinnering 1u15 voor start.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="courseId">Cursus / traject *</Label>
              <select
                id="courseId"
                value={formData.courseId}
                onChange={(e) =>
                  setFormData({ ...formData, courseId: e.target.value })
                }
                className="flex w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                required
              >
                <option value="">Selecteer cursus (bijv. Coaching groep 2)...</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Alle actief ingeschreven deelnemers van deze cursus krijgen de sessies
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Titel *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="bijv. Groepscoaching"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dayOfWeek">Dag van de week *</Label>
              <select
                id="dayOfWeek"
                value={formData.dayOfWeek}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    dayOfWeek: parseInt(e.target.value, 10),
                  })
                }
                className="flex w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                {DAYS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">Starttijd *</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) =>
                    setFormData({ ...formData, startTime: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">Duur (min) *</Label>
                <select
                  id="duration"
                  value={formData.duration}
                  onChange={(e) =>
                    setFormData({ ...formData, duration: e.target.value })
                  }
                  className="flex w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="45">45 min</option>
                  <option value="60">1 uur</option>
                  <option value="90">1u30</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Vanaf datum *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) =>
                    setFormData({ ...formData, startDate: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">Tot en met datum *</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) =>
                    setFormData({ ...formData, endDate: e.target.value })
                  }
                  required
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Bijv. elke maandag van 19:30–20:30 tot en met 30 juni 2025
            </p>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Plannen...
                  </>
                ) : (
                  <>
                    <Calendar className="mr-2 h-4 w-4" />
                    Groepssessies aanmaken
                  </>
                )}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/admin/sessions">Annuleren</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
