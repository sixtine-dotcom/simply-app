"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Loader2, MoveRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

type LessonOption = {
  id: string;
  title: string;
};

type ModuleOption = {
  id: string;
  title: string;
  lessons: LessonOption[];
};

type CourseOption = {
  id: string;
  title: string;
  modules: ModuleOption[];
};

interface LessonActionsPanelProps {
  courseId: string;
  moduleId: string;
  lessonId: string;
  courses: CourseOption[];
}

export function LessonActionsPanel({
  courseId,
  moduleId,
  lessonId,
  courses,
}: LessonActionsPanelProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [targetCourseId, setTargetCourseId] = useState(courseId);
  const [targetModuleId, setTargetModuleId] = useState(moduleId);
  const [position, setPosition] = useState("1");
  const [isMoving, setIsMoving] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);

  const targetCourse = useMemo(
    () => courses.find((course) => course.id === targetCourseId) ?? courses[0],
    [courses, targetCourseId]
  );

  const targetModule = useMemo(
    () => targetCourse?.modules.find((courseModule) => courseModule.id === targetModuleId),
    [targetCourse, targetModuleId]
  );

  const availablePositions = useMemo(() => {
    const lessonCount = targetModule?.lessons.filter((lesson) => lesson.id !== lessonId).length ?? 0;
    return Array.from({ length: lessonCount + 1 }, (_, index) => index + 1);
  }, [lessonId, targetModule]);

  useEffect(() => {
    if (!targetCourse) {
      return;
    }

    const moduleIsInCourse = targetCourse.modules.some((courseModule) => courseModule.id === targetModuleId);
    if (!moduleIsInCourse) {
      setTargetModuleId(targetCourse.modules[0]?.id ?? "");
    }
  }, [targetCourse, targetModuleId]);

  useEffect(() => {
    const currentLessonIndex = targetModule?.lessons
      .filter((lesson) => lesson.id !== lessonId)
      .findIndex((lesson) => lesson.id === lessonId);
    const maxPosition = availablePositions.length || 1;
    const nextPosition = Math.min(Number(position) || 1, maxPosition);

    if (String(nextPosition) !== position) {
      setPosition(String(nextPosition));
      return;
    }

    if (currentLessonIndex === -1 && !position) {
      setPosition("1");
    }
  }, [availablePositions.length, lessonId, position, targetModule]);

  async function moveLesson() {
    if (!targetModuleId) {
      toast({
        title: "Kies eerst een module",
        variant: "destructive",
      });
      return;
    }

    setIsMoving(true);
    try {
      const response = await fetch(
        `/api/admin/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/move`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            targetModuleId,
            position: Math.max(0, Number(position) - 1),
          }),
        }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Kon les niet verplaatsen");
      }

      toast({ title: "Les verplaatst" });
      router.push(`/admin/courses/${data.courseId}/modules/${data.moduleId}/lessons/${data.lessonId}`);
      router.refresh();
    } catch (error) {
      toast({
        title: "Fout",
        description: error instanceof Error ? error.message : "Kon les niet verplaatsen",
        variant: "destructive",
      });
    } finally {
      setIsMoving(false);
    }
  }

  async function duplicateLesson() {
    setIsDuplicating(true);
    try {
      const response = await fetch(
        `/api/admin/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/duplicate`,
        { method: "POST" }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Kon les niet dupliceren");
      }

      toast({ title: "Les gedupliceerd" });
      router.push(`/admin/courses/${data.courseId}/modules/${data.moduleId}/lessons/${data.id}`);
      router.refresh();
    } catch (error) {
      toast({
        title: "Fout",
        description: error instanceof Error ? error.message : "Kon les niet dupliceren",
        variant: "destructive",
      });
    } finally {
      setIsDuplicating(false);
    }
  }

  const hasModules = courses.some((course) => course.modules.length > 0);

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Les verplaatsen of dupliceren</CardTitle>
        <p className="text-sm text-muted-foreground">
          Kies een product, module en positie om deze les te verplaatsen. Dupliceren maakt een kopie in dezelfde module.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="target-course">Product</Label>
            <select
              id="target-course"
              value={targetCourseId}
              onChange={(event) => setTargetCourseId(event.target.value)}
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none transition focus:border-primary"
              disabled={!hasModules || isMoving}
            >
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="target-module">Module</Label>
            <select
              id="target-module"
              value={targetModuleId}
              onChange={(event) => setTargetModuleId(event.target.value)}
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none transition focus:border-primary"
              disabled={!hasModules || isMoving}
            >
              {targetCourse?.modules.map((courseModule) => (
                <option key={courseModule.id} value={courseModule.id}>
                  {courseModule.title}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="target-position">Positie</Label>
            <select
              id="target-position"
              value={position}
              onChange={(event) => setPosition(event.target.value)}
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none transition focus:border-primary"
              disabled={!hasModules || isMoving}
            >
              {availablePositions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button type="button" onClick={moveLesson} disabled={!hasModules || isMoving || isDuplicating}>
            {isMoving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MoveRight className="mr-2 h-4 w-4" />}
            Les verplaatsen
          </Button>
          <Button type="button" variant="outline" onClick={duplicateLesson} disabled={isMoving || isDuplicating}>
            {isDuplicating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Copy className="mr-2 h-4 w-4" />}
            Les dupliceren
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
