"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Trash2 } from "lucide-react";

type CourseOption = { id: string; title: string };
type ClientOption = { id: string; firstName: string; lastName: string; email: string };
type AccessRule = {
  id: string;
  audienceType: "course" | "user";
  course?: CourseOption | null;
  user?: ClientOption | null;
};

export function CalendarAccessPanel() {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [rules, setRules] = useState<AccessRule[]>([]);
  const [formData, setFormData] = useState({
    audienceType: "course",
    courseId: "",
    userId: "",
  });

  const loadRules = () => {
    fetch("/api/admin/calendar-access")
      .then((res) => res.json())
      .then((data) => setRules(Array.isArray(data) ? data : []))
      .catch(console.error);
  };

  useEffect(() => {
    fetch("/api/admin/courses")
      .then((res) => res.json())
      .then((data) => setCourses(Array.isArray(data) ? data : []))
      .catch(console.error);
    fetch("/api/admin/users?role=CLIENT")
      .then((res) => res.json())
      .then((data) => setClients(Array.isArray(data) ? data : []))
      .catch(console.error);
    loadRules();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/admin/calendar-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audienceType: formData.audienceType,
          courseId: formData.audienceType === "course" ? formData.courseId : undefined,
          userId: formData.audienceType === "user" ? formData.userId : undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Kon toegang niet opslaan");
      toast({ title: "Agenda opengezet", description: "Deze doelgroep kan aan de coach-agenda gekoppeld worden." });
      loadRules();
    } catch (error) {
      toast({
        title: "Fout",
        description: error instanceof Error ? error.message : "Kon toegang niet opslaan",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/admin/calendar-access?id=${id}`, { method: "DELETE" });
    loadRules();
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-[160px_1fr_auto]">
        <div className="space-y-2">
          <Label htmlFor="calendar-access-type">Doelgroep</Label>
          <select
            id="calendar-access-type"
            value={formData.audienceType}
            onChange={(event) =>
              setFormData((current) => ({ ...current, audienceType: event.target.value }))
            }
            className="flex w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="course">Cursusgroep</option>
            <option value="user">Individu</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label>{formData.audienceType === "course" ? "Cursusgroep" : "Klant"}</Label>
          {formData.audienceType === "course" ? (
            <select
              value={formData.courseId}
              onChange={(event) =>
                setFormData((current) => ({ ...current, courseId: event.target.value }))
              }
              className="flex w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">Selecteer cursus...</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>{course.title}</option>
              ))}
            </select>
          ) : (
            <select
              value={formData.userId}
              onChange={(event) =>
                setFormData((current) => ({ ...current, userId: event.target.value }))
              }
              className="flex w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">Selecteer klant...</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.firstName} {client.lastName} ({client.email})
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="flex items-end">
          <Button type="button" onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Openzetten
          </Button>
        </div>
      </div>

      {rules.length > 0 ? (
        <div className="space-y-2">
          {rules.map((rule) => (
            <div key={rule.id} className="flex items-center justify-between rounded-xl border bg-background px-3 py-2 text-sm">
              <span>
                {rule.audienceType === "course"
                  ? `Groep: ${rule.course?.title ?? "Cursus"}`
                  : `Klant: ${rule.user ? `${rule.user.firstName} ${rule.user.lastName}` : "Klant"}`}
              </span>
              <Button type="button" variant="ghost" size="icon" onClick={() => handleDelete(rule.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Nog geen groepen of klanten met agenda-toegang.
        </p>
      )}
    </div>
  );
}
