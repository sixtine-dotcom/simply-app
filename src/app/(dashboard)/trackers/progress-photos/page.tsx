"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { ChevronLeft, Camera, Loader2, Upload, X } from "lucide-react";

interface Moment {
  periodIndex: number;
  weekLabel: string;
  beforePhotoUrl: string | null;
  afterPhotoUrl: string | null;
  submittedAt: string | null;
}

interface CourseProgress {
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  enrollmentStartDate: string;
  intervalWeeks: number;
  moments: Moment[];
}

export default function ProgressPhotosPage() {
  const { toast } = useToast();
  const [courses, setCourses] = useState<CourseProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/user/progress-photos");
      const data = await res.json();
      if (data.courses) setCourses(data.courses);
    } catch (e) {
      console.error(e);
      toast({ title: "Fout", description: "Kon gegevens niet laden.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Upload mislukt");
    }
    const { url } = await res.json();
    return url;
  };

  const savePhoto = async (
    courseId: string,
    periodIndex: number,
    type: "before" | "after",
    url: string | null
  ) => {
    const key = `${courseId}-${periodIndex}-${type}`;
    setUploading(key);
    try {
      const res = await fetch(`/api/user/courses/${courseId}/progress-photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodIndex,
          ...(type === "before" ? { beforePhotoUrl: url } : { afterPhotoUrl: url }),
        }),
      });
      if (!res.ok) throw new Error("Opslaan mislukt");
      toast({ title: "Opgeslagen", description: "Foto is bijgewerkt." });
      load();
    } catch (e) {
      toast({
        title: "Fout",
        description: e instanceof Error ? e.message : "Kon niet opslaan",
        variant: "destructive",
      });
    } finally {
      setUploading(null);
    }
  };

  const handleFileSelect = async (
    courseId: string,
    periodIndex: number,
    type: "before" | "after",
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const key = `${courseId}-${periodIndex}-${type}`;
    setUploading(key);
    try {
      const url = await uploadFile(file);
      await savePhoto(courseId, periodIndex, type, url);
    } catch (err) {
      toast({
        title: "Upload mislukt",
        description: err instanceof Error ? err.message : "Probeer opnieuw",
        variant: "destructive",
      });
    } finally {
      setUploading(null);
    }
  };

  const removePhoto = async (
    courseId: string,
    periodIndex: number,
    type: "before" | "after"
  ) => {
    await savePhoto(courseId, periodIndex, type, null);
  };

  return (
    <div className="p-6 md:p-8 lg:p-12">
      <Link
        href="/trackers"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Terug naar trackers
      </Link>

      <div className="mb-8">
        <h1 className="font-display text-2xl md:text-3xl tracking-wider flex items-center gap-2">
          <Camera className="h-6 w-6" />
          PROGRESSIEFOTO&apos;S
        </h1>
        <p className="mt-2 text-muted-foreground">
          Upload voor- en nafoto&apos;s op vaste momenten om je voortgang te volgen
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : courses.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Camera className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h2 className="font-display text-xl tracking-wider mb-2">
              GEEN CURSUSSEN MET FOTOMOMENTEN
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Voor de cursussen waar je op staat, zijn nog geen progressiefoto-momenten ingesteld.
              Je kunt hier voor- en nafoto&apos;s uploaden zodra je coach dat per cursus heeft aangezet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {courses.map((c) => (
            <Card key={c.courseId}>
              <CardHeader>
                <CardTitle className="font-display text-lg tracking-wider">
                  {c.courseTitle}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Om de {c.intervalWeeks} weken een voor- en nafoto
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {c.moments.map((m) => (
                  <div
                    key={m.periodIndex}
                    className="border rounded-lg p-4 space-y-4"
                  >
                    <h3 className="font-medium text-muted-foreground">
                      {m.weekLabel}
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {/* Voor */}
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Voor</p>
                        {m.beforePhotoUrl ? (
                          <div className="relative aspect-[3/4] max-w-[200px] rounded overflow-hidden bg-muted">
                            <Image
                              src={m.beforePhotoUrl}
                              alt="Voor"
                              fill
                              className="object-cover"
                              sizes="200px"
                            />
                            <div className="absolute top-2 right-2 flex gap-1">
                              <Button
                                type="button"
                                size="icon"
                                variant="secondary"
                                className="h-8 w-8"
                                onClick={() => {
                                  const id = `before-${c.courseId}-${m.periodIndex}`;
                                  fileInputRefs.current[id]?.click();
                                }}
                                disabled={uploading !== null}
                              >
                                <Upload className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="secondary"
                                className="h-8 w-8"
                                onClick={() =>
                                  removePhoto(c.courseId, m.periodIndex, "before")
                                }
                                disabled={uploading !== null}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                            <input
                              ref={(el) => {
                                fileInputRefs.current[
                                  `before-${c.courseId}-${m.periodIndex}`
                                ] = el;
                              }}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) =>
                                handleFileSelect(
                                  c.courseId,
                                  m.periodIndex,
                                  "before",
                                  e
                                )
                              }
                            />
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center aspect-[3/4] max-w-[200px] rounded border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 cursor-pointer transition-colors">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) =>
                                handleFileSelect(
                                  c.courseId,
                                  m.periodIndex,
                                  "before",
                                  e
                                )
                              }
                              disabled={uploading !== null}
                            />
                            {uploading ===
                            `${c.courseId}-${m.periodIndex}-before` ? (
                              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            ) : (
                              <>
                                <Camera className="h-8 w-8 text-muted-foreground mb-1" />
                                <span className="text-xs text-muted-foreground">
                                  Upload voor
                                </span>
                              </>
                            )}
                          </label>
                        )}
                      </div>
                      {/* Na */}
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Na</p>
                        {m.afterPhotoUrl ? (
                          <div className="relative aspect-[3/4] max-w-[200px] rounded overflow-hidden bg-muted">
                            <Image
                              src={m.afterPhotoUrl}
                              alt="Na"
                              fill
                              className="object-cover"
                              sizes="200px"
                            />
                            <div className="absolute top-2 right-2 flex gap-1">
                              <Button
                                type="button"
                                size="icon"
                                variant="secondary"
                                className="h-8 w-8"
                                onClick={() => {
                                  const id = `after-${c.courseId}-${m.periodIndex}`;
                                  fileInputRefs.current[id]?.click();
                                }}
                                disabled={uploading !== null}
                              >
                                <Upload className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="secondary"
                                className="h-8 w-8"
                                onClick={() =>
                                  removePhoto(c.courseId, m.periodIndex, "after")
                                }
                                disabled={uploading !== null}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                            <input
                              ref={(el) => {
                                fileInputRefs.current[
                                  `after-${c.courseId}-${m.periodIndex}`
                                ] = el;
                              }}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) =>
                                handleFileSelect(
                                  c.courseId,
                                  m.periodIndex,
                                  "after",
                                  e
                                )
                              }
                            />
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center aspect-[3/4] max-w-[200px] rounded border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 cursor-pointer transition-colors">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) =>
                                handleFileSelect(
                                  c.courseId,
                                  m.periodIndex,
                                  "after",
                                  e
                                )
                              }
                              disabled={uploading !== null}
                            />
                            {uploading ===
                            `${c.courseId}-${m.periodIndex}-after` ? (
                              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            ) : (
                              <>
                                <Camera className="h-8 w-8 text-muted-foreground mb-1" />
                                <span className="text-xs text-muted-foreground">
                                  Upload na
                                </span>
                              </>
                            )}
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
