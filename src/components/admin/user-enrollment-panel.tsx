"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

type CourseOption = {
  id: string;
  title: string;
  isPublished: boolean;
};

type EnrollmentItem = {
  id: string;
  title: string;
  isPublished: boolean;
};

export function UserEnrollmentPanel({
  userId,
  courses,
  enrollments,
}: {
  userId: string;
  courses: CourseOption[];
  enrollments: EnrollmentItem[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [courseId, setCourseId] = useState("");
  const [endDate, setEndDate] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!courseId) {
      toast({
        title: "Selecteer een cursus",
        description: "Kies eerst welke cursus je wilt toekennen.",
        variant: "destructive",
      });
      return;
    }

    setBusyKey(`add:${courseId}`);
    try {
      const response = await fetch(`/api/admin/users/${userId}/enrollments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          endDate: endDate || null,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Kon cursus niet toekennen");
      }

      toast({
        title: "Cursus toegewezen",
        description: data.matchedExistingEnrollment
          ? "Dit lid was hier al ingeschreven."
          : "De cursus en gekoppelde communitytoegang zijn toegevoegd.",
      });
      setCourseId("");
      setEndDate("");
      router.refresh();
    } catch (error) {
      toast({
        title: "Fout",
        description: error instanceof Error ? error.message : "Kon cursus niet toekennen",
        variant: "destructive",
      });
    } finally {
      setBusyKey(null);
    }
  };

  const handleRemove = async (enrollmentId: string) => {
    setBusyKey(`remove:${enrollmentId}`);
    try {
      const response = await fetch(
        `/api/admin/users/${userId}/enrollments/${enrollmentId}`,
        { method: "DELETE" }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Kon cursusinschrijving niet verwijderen");
      }

      toast({
        title: "Cursus verwijderd",
        description: "Deze inschrijving is ingetrokken.",
      });
      router.refresh();
    } catch (error) {
      toast({
        title: "Fout",
        description:
          error instanceof Error ? error.message : "Kon cursusinschrijving niet verwijderen",
        variant: "destructive",
      });
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="space-y-3 rounded-2xl border bg-muted/20 p-4">
      <div>
        <p className="text-sm font-medium text-foreground">Cursusinschrijving beheren</p>
        <p className="text-xs text-muted-foreground">
          Geef hier direct toegang tot programma&apos;s en trek die weer in.
        </p>
      </div>

      {courses.length > 0 ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="user-course-select">Cursus</Label>
            <select
              id="user-course-select"
              value={courseId}
              onChange={(event) => setCourseId(event.target.value)}
              className="flex w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">Selecteer cursus...</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title} {course.isPublished ? "· live" : "· draft"}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="user-course-end-date">Einddatum</Label>
            <Input
              id="user-course-end-date"
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </div>

          <Button onClick={handleAdd} disabled={busyKey !== null} className="w-full">
            {busyKey?.startsWith("add:") ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Toekennen...
              </>
            ) : (
              <>
                <BookOpen className="mr-2 h-4 w-4" />
                Cursus toekennen
              </>
            )}
          </Button>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Maak eerst een cursus aan om die hier te kunnen toekennen.
        </p>
      )}

      {enrollments.length > 0 ? (
        <div className="space-y-2">
          {enrollments.map((enrollment) => (
            <div
              key={enrollment.id}
              className="flex items-center justify-between rounded-xl border bg-background px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium">{enrollment.title}</p>
                <p className="text-xs text-muted-foreground">
                  {enrollment.isPublished ? "Live" : "Draft"}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => void handleRemove(enrollment.id)}
                disabled={busyKey !== null}
              >
                {busyKey === `remove:${enrollment.id}` ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
