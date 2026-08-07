"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, FileText, Loader2, Rows3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";

type DrippingUnit = "days" | "weeks";

type CourseDrippingFormProps = {
  course: {
    id: string;
    drippingEnabled: boolean;
    drippingUnit: string | null;
    drippingStartMode: string | null;
    drippingReleaseWeekday: number | null;
    drippingReleaseTime: string | null;
  };
  modules: Array<{
    id: string;
    title: string;
    unlockAfterDays: number | null;
    lessons: Array<{
      id: string;
      title: string;
      unlockAfterDays: number | null;
    }>;
  }>;
};

type ModuleState = CourseDrippingFormProps["modules"][number];

const WEEKDAY_OPTIONS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 7, label: "Sunday" },
];

function getUnlockOptions(unit: DrippingUnit) {
  const options = [{ value: "direct", label: "Direct available" }];

  if (unit === "days") {
    for (let day = 1; day <= 90; day += 1) {
      options.push({
        value: String(day),
        label: `Day ${day}`,
      });
    }
    return options;
  }

  for (let week = 1; week <= 24; week += 1) {
    options.push({
      value: String(week * 7),
      label: `Week ${week}`,
    });
  }

  return options;
}

function getUnlockLabel(unlockAfterDays: number | null, unit: DrippingUnit) {
  if (unlockAfterDays === null || unlockAfterDays <= 0) {
    return "Direct available";
  }

  if (unit === "weeks") {
    const weeks = Math.max(1, Math.round(unlockAfterDays / 7));
    return `Week ${weeks}`;
  }

  return `Day ${unlockAfterDays}`;
}

export function CourseDrippingForm({ course, modules: initialModules }: CourseDrippingFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    new Set(initialModules.map((module) => module.id))
  );
  const [modules, setModules] = useState<ModuleState[]>(initialModules);
  const [formData, setFormData] = useState({
    drippingEnabled: course.drippingEnabled,
    drippingType: "module",
    drippingUnit: (course.drippingUnit || "weeks") as DrippingUnit,
    drippingStartMode: course.drippingStartMode || "enrollment",
    drippingReleaseWeekday: course.drippingReleaseWeekday ? String(course.drippingReleaseWeekday) : "1",
    drippingReleaseTime: course.drippingReleaseTime || "07:00",
  });

  const unlockOptions = useMemo(() => getUnlockOptions(formData.drippingUnit), [formData.drippingUnit]);

  const toggleModule = (moduleId: string) => {
    setExpandedModules((current) => {
      const next = new Set(current);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  };

  const handleSaveSettings = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSavingSettings(true);

    try {
      const response = await fetch(`/api/admin/courses/${course.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          drippingEnabled: formData.drippingEnabled,
          drippingUnit: formData.drippingEnabled ? formData.drippingUnit : null,
          drippingStartMode: formData.drippingEnabled ? formData.drippingStartMode : null,
          drippingReleaseWeekday: formData.drippingEnabled
            ? Number(formData.drippingReleaseWeekday)
            : null,
          drippingReleaseTime: formData.drippingEnabled ? formData.drippingReleaseTime : null,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Could not save dripping settings.");
      }

      toast({
        title: "Dripping saved",
        description: "Your release settings are updated.",
      });
      router.refresh();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Could not save dripping settings.",
        variant: "destructive",
      });
    } finally {
      setIsSavingSettings(false);
    }
  };

  const updateModuleUnlock = async (moduleId: string, value: string) => {
    const unlockAfterDays = value === "direct" ? null : Number(value);
    const previousModules = modules;

    setModules((current) =>
      current.map((module) =>
        module.id === moduleId ? { ...module, unlockAfterDays } : module
      )
    );
    setSavingKey(`module:${moduleId}`);

    try {
      const response = await fetch(`/api/admin/courses/${course.id}/modules/${moduleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unlockAfterDays }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || "Could not save the module schedule.");
      }
      router.refresh();
    } catch (error) {
      setModules(previousModules);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Could not save the module schedule.",
        variant: "destructive",
      });
    } finally {
      setSavingKey(null);
    }
  };

  const updateLessonUnlock = async (moduleId: string, lessonId: string, value: string) => {
    const unlockAfterDays = value === "direct" ? null : Number(value);
    const previousModules = modules;

    setModules((current) =>
      current.map((module) =>
        module.id === moduleId
          ? {
              ...module,
              lessons: module.lessons.map((lesson) =>
                lesson.id === lessonId ? { ...lesson, unlockAfterDays } : lesson
              ),
            }
          : module
      )
    );
    setSavingKey(`lesson:${lessonId}`);

    try {
      const response = await fetch(
        `/api/admin/courses/${course.id}/modules/${moduleId}/lessons/${lessonId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ unlockAfterDays }),
        }
      );
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || "Could not save the lesson schedule.");
      }
      router.refresh();
    } catch (error) {
      setModules(previousModules);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Could not save the lesson schedule.",
        variant: "destructive",
      });
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSaveSettings}
        className="space-y-6 rounded-[1.8rem] border border-border bg-background p-6 shadow-sm"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Dripping options</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Release your modules and lessons on a clear schedule, with manual overrides where needed.
            </p>
          </div>
          <div className="inline-flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">
              {formData.drippingEnabled ? "Enabled" : "Disabled"}
            </span>
            <Switch
              checked={formData.drippingEnabled}
              onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, drippingEnabled: checked }))}
              ariaLabel="Enable dripping"
            />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="drippingType">How do you want to drip?</Label>
            <select
              id="drippingType"
              value={formData.drippingType}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, drippingType: event.target.value }))
              }
              className="flex h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
            >
              <option value="module">Per module</option>
              <option value="lesson">Per lesson</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="drippingUnit">Schedule</Label>
            <select
              id="drippingUnit"
              value={formData.drippingUnit}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, drippingUnit: event.target.value as DrippingUnit }))
              }
              className="flex h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
            >
              <option value="weeks">Weekly</option>
              <option value="days">Daily</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="drippingAccess">No dripping on</Label>
            <Input id="drippingAccess" value="All enrolled clients" disabled />
          </div>

          <div className="space-y-2">
            <Label htmlFor="drippingStartMode">When does dripping start?</Label>
            <select
              id="drippingStartMode"
              value={formData.drippingStartMode}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, drippingStartMode: event.target.value }))
              }
              className="flex h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
            >
              <option value="enrollment">After course access</option>
              <option value="published">After course publish date</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="drippingReleaseWeekday">Day 1 starts on</Label>
            <select
              id="drippingReleaseWeekday"
              value={formData.drippingReleaseWeekday}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, drippingReleaseWeekday: event.target.value }))
              }
              className="flex h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
            >
              {WEEKDAY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="drippingReleaseTime">Release time</Label>
            <Input
              id="drippingReleaseTime"
              type="time"
              value={formData.drippingReleaseTime}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, drippingReleaseTime: event.target.value }))
              }
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSavingSettings}>
            {isSavingSettings ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save schedule settings
          </Button>
        </div>
      </form>

      <div className="rounded-[1.8rem] border border-border bg-background p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Dripping planning</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Expand a module to see lessons and adjust release timing inline.
            </p>
          </div>
          {savingKey ? (
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </div>
          ) : null}
        </div>

        <div className="mt-5 space-y-4">
          {modules.map((module, index) => {
            const isExpanded = expandedModules.has(module.id);
            const moduleLabel = getUnlockLabel(module.unlockAfterDays, formData.drippingUnit);

            return (
              <div key={module.id} className="rounded-[1.4rem] border border-border bg-background">
                <div className="grid gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_220px_220px] lg:items-center">
                  <button
                    type="button"
                    onClick={() => toggleModule(module.id)}
                    className="flex min-w-0 items-center gap-3 text-left"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <Rows3 className="h-4 w-4 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">
                        {`Week ${index + 1}: ${module.title}`}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {module.lessons.length} lesson{module.lessons.length === 1 ? "" : "s"}
                      </p>
                    </div>
                  </button>

                  <div className="text-sm text-muted-foreground">
                    {moduleLabel}
                  </div>

                  <select
                    value={module.unlockAfterDays === null || module.unlockAfterDays <= 0 ? "direct" : String(module.unlockAfterDays)}
                    onChange={(event) => updateModuleUnlock(module.id, event.target.value)}
                    className="flex h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
                  >
                    {unlockOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {isExpanded ? (
                  <div className="border-t border-border/70 px-4 py-3">
                    <div className="space-y-2">
                      {module.lessons.map((lesson) => (
                        <div
                          key={lesson.id}
                          className="grid gap-3 rounded-[1.1rem] px-3 py-3 lg:grid-cols-[minmax(0,1fr)_220px_220px] lg:items-center"
                        >
                          <div className="flex min-w-0 items-center gap-3 pl-3">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <p className="truncate text-sm text-foreground">{lesson.title}</p>
                          </div>

                          <div className="text-sm text-muted-foreground">
                            {getUnlockLabel(lesson.unlockAfterDays, formData.drippingUnit)}
                          </div>

                          <select
                            value={lesson.unlockAfterDays === null || lesson.unlockAfterDays <= 0 ? "direct" : String(lesson.unlockAfterDays)}
                            onChange={(event) =>
                              updateLessonUnlock(module.id, lesson.id, event.target.value)
                            }
                            className="flex h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                          >
                            {unlockOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
