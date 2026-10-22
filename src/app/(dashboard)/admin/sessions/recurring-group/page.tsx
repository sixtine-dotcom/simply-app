"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

const SCHEDULE_MODES = [
  { value: "weekly", label: "Wekelijks" },
  { value: "biweekly", label: "Tweewekelijks" },
  { value: "monthly", label: "Maandelijks" },
  { value: "custom", label: "Flexibel" },
] as const;

const DURATION_OPTIONS = [15, 30, 45, 60, 75, 90, 120];

type CourseOption = {
  id: string;
  title: string;
  _count?: {
    enrollments?: number;
  };
};

function formatDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function countOccurrences(
  scheduleMode: string,
  dayOfWeek: number,
  startDateValue: string,
  endDateValue: string,
  customDates: string[]
) {
  if (!startDateValue || !endDateValue) return 0;
  const start = new Date(`${startDateValue}T00:00:00`);
  const end = new Date(`${endDateValue}T23:59:59`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;

  if (scheduleMode === "custom") {
    return customDates.filter((value) => {
      const date = new Date(`${value}T00:00:00`);
      return !Number.isNaN(date.getTime()) && date >= start && date <= end;
    }).length;
  }

  if (scheduleMode === "monthly") {
    const originalDayOfMonth = start.getDate();
    let count = 0;
    let monthOffset = 0;
    while (true) {
      const year = start.getFullYear();
      const month = start.getMonth() + monthOffset;
      const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
      const cursor = new Date(
        year,
        month,
        Math.min(originalDayOfMonth, lastDayOfMonth)
      );
      cursor.setHours(0, 0, 0, 0);
      if (cursor > end) break;
      count += 1;
      monthOffset += 1;
    }
    return count;
  }

  const cursor = new Date(start);
  let diff = dayOfWeek - cursor.getDay();
  if (diff < 0) diff += 7;
  cursor.setDate(cursor.getDate() + diff);

  const stepDays = scheduleMode === "biweekly" ? 14 : 7;
  let count = 0;
  while (cursor <= end) {
    count += 1;
    cursor.setDate(cursor.getDate() + stepDays);
  }

  return count;
}

export default function RecurringGroupSessionPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [prefilledCourseId, setPrefilledCourseId] = useState("");
  const [formData, setFormData] = useState({
    courseId: "",
    title: "",
    description: "",
    scheduleMode: "weekly",
    dayOfWeek: 1,
    startTime: "19:30",
    duration: "60",
    startDate: "",
    endDate: "",
    customDates: [""],
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const courseId = params.get("courseId") || "";
    if (courseId) {
      setPrefilledCourseId(courseId);
    }

    const now = new Date();
    const eightWeeksLater = new Date(now);
    eightWeeksLater.setDate(eightWeeksLater.getDate() + 56);
    setFormData((current) => ({
      ...current,
      startDate: current.startDate || formatDateInput(now),
      endDate: current.endDate || formatDateInput(eightWeeksLater),
    }));

    fetch("/api/admin/courses")
      .then((res) => res.json())
      .then((data) => {
        const nextCourses = Array.isArray(data) ? data : [];
        setCourses(nextCourses);

        if (courseId) {
          const selectedCourse = nextCourses.find((entry) => entry.id === courseId);
          if (selectedCourse) {
            setFormData((current) => ({
              ...current,
              courseId,
              title: current.title || `Groepscoaching ${selectedCourse.title}`,
            }));
          }
        }
      })
      .catch(console.error);
  }, []);

  const selectedCourse = courses.find((course) => course.id === formData.courseId) || null;
  const participantCount = selectedCourse?._count?.enrollments || 0;
  const occurrenceCount = countOccurrences(
    formData.scheduleMode,
    formData.dayOfWeek,
    formData.startDate,
    formData.endDate,
    formData.customDates
  );
  const estimatedSessions = participantCount * occurrenceCount;

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
          description: formData.description,
          scheduleMode: formData.scheduleMode,
          dayOfWeek: formData.dayOfWeek,
          startTime: formData.startTime,
          duration: parseInt(formData.duration, 10),
          startDate: formData.startDate,
          endDate: formData.endDate,
          customDates: formData.customDates.filter(Boolean),
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

      router.push(`/admin/sessions?view=month&date=${formData.startDate}`);
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
                  setFormData((current) => {
                    const course = courses.find((entry) => entry.id === e.target.value);
                    return {
                      ...current,
                      courseId: e.target.value,
                      title:
                        current.title ||
                        (course ? `Groepscoaching ${course.title}` : current.title),
                    };
                  })
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
              {prefilledCourseId && selectedCourse ? (
                <p className="text-xs text-primary">
                  Deze cursus werd automatisch voorgeselecteerd vanuit je cursusoverzicht.
                </p>
              ) : null}
              <p className="text-xs text-muted-foreground">
                Je kunt deze groepsreeks al klaarzetten zonder deelnemers. Huidige deelnemers krijgen meteen sessies, en nieuwe deelnemers kunnen later automatisch gekoppeld worden.
              </p>
              {selectedCourse ? (
                <div className="rounded-xl border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                  Actieve inschrijvingen in deze cursus:{" "}
                  <span className="font-medium text-foreground">{participantCount}</span>
                </div>
              ) : null}
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
              <Label htmlFor="description">Beschrijving (optioneel)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Agenda, voorbereiding of afspraken voor deze groepscall..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="scheduleMode">Herhaling *</Label>
              <select
                id="scheduleMode"
                value={formData.scheduleMode}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    scheduleMode: e.target.value,
                  })
                }
                className="flex w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                {SCHEDULE_MODES.map((mode) => (
                  <option key={mode.value} value={mode.value}>
                    {mode.label}
                  </option>
                ))}
              </select>
            </div>

            {formData.scheduleMode === "weekly" || formData.scheduleMode === "biweekly" ? (
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
            ) : null}

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
                <div className="grid grid-cols-4 gap-2">
                  {DURATION_OPTIONS.map((minutes) => (
                    <Button
                      key={minutes}
                      type="button"
                      variant={formData.duration === String(minutes) ? "default" : "outline"}
                      onClick={() =>
                        setFormData({ ...formData, duration: String(minutes) })
                      }
                    >
                      {minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}u${minutes % 60 ? ` ${minutes % 60}m` : ""}`}
                    </Button>
                  ))}
                </div>
                <Input
                  id="duration"
                  type="number"
                  min="5"
                  max="1440"
                  step="5"
                  value={formData.duration}
                  onChange={(e) =>
                    setFormData({ ...formData, duration: e.target.value })
                  }
                  placeholder="Bijv. 50"
                />
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
              Bij wekelijks/tweewekelijks kies je een vaste weekdag. Bij maandelijks is de startdatum het terugkerende maandmoment.
            </p>

            {formData.scheduleMode === "custom" ? (
              <div className="space-y-3 rounded-2xl border bg-muted/20 p-4">
                <div>
                  <Label>Flexibele datums *</Label>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Voeg de losse call-datums toe, bijvoorbeeld week 1, week 2 en daarna om de twee weken.
                  </p>
                </div>
                <div className="space-y-2">
                  {formData.customDates.map((date, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        type="date"
                        value={date}
                        onChange={(e) =>
                          setFormData((current) => ({
                            ...current,
                            customDates: current.customDates.map((entry, entryIndex) =>
                              entryIndex === index ? e.target.value : entry
                            ),
                          }))
                        }
                        required={formData.scheduleMode === "custom"}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          setFormData((current) => ({
                            ...current,
                            customDates:
                              current.customDates.length > 1
                                ? current.customDates.filter((_, entryIndex) => entryIndex !== index)
                                : [""],
                          }))
                        }
                      >
                        Verwijder
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setFormData((current) => ({
                      ...current,
                      customDates: [...current.customDates, ""],
                    }))
                  }
                >
                  Datum toevoegen
                </Button>
              </div>
            ) : null}

            <div className="rounded-2xl border bg-muted/20 p-4">
              <p className="text-sm font-medium text-foreground">Planning inschatting</p>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border bg-background px-3 py-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Deelnemers
                  </p>
                  <p className="mt-2 text-2xl font-semibold">{participantCount}</p>
                </div>
                <div className="rounded-xl border bg-background px-3 py-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Herhalingen
                  </p>
                  <p className="mt-2 text-2xl font-semibold">{occurrenceCount}</p>
                </div>
                <div className="rounded-xl border bg-background px-3 py-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Sessies totaal
                  </p>
                  <p className="mt-2 text-2xl font-semibold">{estimatedSessions}</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Dit is een schatting op basis van actieve cursusinschrijvingen × aantal weekmomenten.
              </p>
              {participantCount === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Er zijn nog geen deelnemers in deze cursus. De planning kan wel al opgeslagen worden voor later.
                </p>
              ) : null}
            </div>

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
