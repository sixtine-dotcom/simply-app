"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Plus, 
  GripVertical, 
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash2,
  Video,
  FileText,
  Loader2
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

interface Lesson {
  id: string;
  title: string;
  position: number;
  videoUrl: string | null;
  content: string | null;
  unlockAfterDays: number | null;
}

interface Module {
  id: string;
  title: string;
  description: string | null;
  position: number;
  unlockAfterDays: number | null;
  lessons: Lesson[];
}

interface ModuleListProps {
  courseId: string;
  modules: Module[];
}

export function ModuleList({ courseId, modules: initialModules }: ModuleListProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [modules, setModules] = useState(initialModules);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    new Set(initialModules.map((m) => m.id))
  );
  const [isAddingModule, setIsAddingModule] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [addingLessonToModule, setAddingLessonToModule] = useState<string | null>(null);
  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const toggleModule = (moduleId: string) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(moduleId)) {
      newExpanded.delete(moduleId);
    } else {
      newExpanded.add(moduleId);
    }
    setExpandedModules(newExpanded);
  };

  const handleAddModule = async () => {
    if (!newModuleTitle.trim()) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/courses/${courseId}/modules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          title: newModuleTitle,
          position: modules.length
        }),
      });

      if (!response.ok) throw new Error("Failed to add module");
      
      const newModule = await response.json();
      setModules([...modules, { ...newModule, lessons: [] }]);
      setExpandedModules(new Set([...Array.from(expandedModules), newModule.id]));
      setNewModuleTitle("");
      setIsAddingModule(false);
      
      toast({ title: "Module toegevoegd" });
      router.refresh();
    } catch (error) {
      toast({ title: "Fout", description: "Kon module niet toevoegen", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddLesson = async (moduleId: string) => {
    if (!newLessonTitle.trim()) return;
    
    const module = modules.find((m) => m.id === moduleId);
    if (!module) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/courses/${courseId}/modules/${moduleId}/lessons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          title: newLessonTitle,
          position: module.lessons.length
        }),
      });

      if (!response.ok) throw new Error("Failed to add lesson");
      
      const newLesson = await response.json();
      setModules(modules.map((m) => 
        m.id === moduleId 
          ? { ...m, lessons: [...m.lessons, newLesson] }
          : m
      ));
      setNewLessonTitle("");
      setAddingLessonToModule(null);
      
      toast({ title: "Les toegevoegd" });
      router.refresh();
    } catch (error) {
      toast({ title: "Fout", description: "Kon les niet toevoegen", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!confirm("Weet je zeker dat je deze module wilt verwijderen? Alle lessen worden ook verwijderd.")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/courses/${courseId}/modules/${moduleId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete module");
      
      setModules(modules.filter((m) => m.id !== moduleId));
      toast({ title: "Module verwijderd" });
      router.refresh();
    } catch (error) {
      toast({ title: "Fout", description: "Kon module niet verwijderen", variant: "destructive" });
    }
  };

  const handleDeleteLesson = async (moduleId: string, lessonId: string) => {
    if (!confirm("Weet je zeker dat je deze les wilt verwijderen?")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete lesson");
      
      setModules(modules.map((m) => 
        m.id === moduleId 
          ? { ...m, lessons: m.lessons.filter((l) => l.id !== lessonId) }
          : m
      ));
      toast({ title: "Les verwijderd" });
      router.refresh();
    } catch (error) {
      toast({ title: "Fout", description: "Kon les niet verwijderen", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      {modules.map((module, index) => (
        <div key={module.id} className="border rounded-lg">
          {/* Module Header */}
          <div 
            className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/50"
            onClick={() => toggleModule(module.id)}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
            
            {expandedModules.has(module.id) ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">Module {index + 1}: {module.title}</span>
                {module.unlockAfterDays !== null && module.unlockAfterDays > 0 && (
                  <span className="text-xs bg-muted px-2 py-0.5 rounded">
                    Dag {module.unlockAfterDays}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {module.lessons.length} lessen
              </p>
            </div>

            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm" asChild>
                <a href={`/admin/courses/${courseId}/modules/${module.id}`}>
                  <Pencil className="h-4 w-4" />
                </a>
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => handleDeleteModule(module.id)}
              >
                <Trash2 className="h-4 w-4 text-error" />
              </Button>
            </div>
          </div>

          {/* Lessons */}
          {expandedModules.has(module.id) && (
            <div className="border-t">
              {module.lessons.map((lesson, lessonIndex) => (
                <div 
                  key={lesson.id}
                  className="flex items-center gap-3 px-4 py-3 pl-12 hover:bg-muted/30 border-b last:border-0"
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                  
                  {lesson.videoUrl ? (
                    <Video className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  )}
                  
                  <div className="flex-1">
                    <span>{lesson.title}</span>
                    {lesson.unlockAfterDays !== null && lesson.unlockAfterDays > 0 && (
                      <span className="text-xs bg-muted px-2 py-0.5 rounded ml-2">
                        Dag {lesson.unlockAfterDays}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" asChild>
                      <a href={`/admin/courses/${courseId}/modules/${module.id}/lessons/${lesson.id}`}>
                        <Pencil className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleDeleteLesson(module.id, lesson.id)}
                    >
                      <Trash2 className="h-4 w-4 text-error" />
                    </Button>
                  </div>
                </div>
              ))}

              {/* Add Lesson */}
              {addingLessonToModule === module.id ? (
                <div className="flex items-center gap-2 p-4 pl-12 border-t">
                  <Input
                    placeholder="Les titel..."
                    value={newLessonTitle}
                    onChange={(e) => setNewLessonTitle(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddLesson(module.id)}
                    autoFocus
                  />
                  <Button 
                    size="sm" 
                    onClick={() => handleAddLesson(module.id)}
                    disabled={isLoading}
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Toevoegen"}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => {
                      setAddingLessonToModule(null);
                      setNewLessonTitle("");
                    }}
                  >
                    Annuleren
                  </Button>
                </div>
              ) : (
                <button 
                  className="flex items-center gap-2 w-full p-3 pl-12 text-sm text-muted-foreground hover:bg-muted/30 border-t"
                  onClick={() => setAddingLessonToModule(module.id)}
                >
                  <Plus className="h-4 w-4" />
                  Les toevoegen
                </button>
              )}
            </div>
          )}
        </div>
      ))}

      {/* Add Module */}
      {isAddingModule ? (
        <div className="flex items-center gap-2 p-4 border rounded-lg">
          <Input
            placeholder="Module titel..."
            value={newModuleTitle}
            onChange={(e) => setNewModuleTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddModule()}
            autoFocus
          />
          <Button onClick={handleAddModule} disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Toevoegen"}
          </Button>
          <Button 
            variant="ghost"
            onClick={() => {
              setIsAddingModule(false);
              setNewModuleTitle("");
            }}
          >
            Annuleren
          </Button>
        </div>
      ) : (
        <Button 
          variant="outline" 
          className="w-full"
          onClick={() => setIsAddingModule(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Module toevoegen
        </Button>
      )}
    </div>
  );
}
