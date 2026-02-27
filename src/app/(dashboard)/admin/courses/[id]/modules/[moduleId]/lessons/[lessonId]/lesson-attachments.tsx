"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { FileText, Upload, Loader2, Trash2, Link as LinkIcon } from "lucide-react";

interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number | null;
}

interface LessonAttachmentsSectionProps {
  courseId: string;
  moduleId: string;
  lessonId: string;
  attachments: Attachment[];
}

export function LessonAttachmentsSection({
  courseId,
  moduleId,
  lessonId,
  attachments: initialAttachments,
}: LessonAttachmentsSectionProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [attachments, setAttachments] = useState<Attachment[]>(initialAttachments);
  const [addMode, setAddMode] = useState<"upload" | "url">("upload");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [type, setType] = useState<"pdf" | "image" | "file">("pdf");
  const [isUploading, setIsUploading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const baseUrl = `/api/admin/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}`;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setIsUploading(true);
    try {
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
      const data = await res.json();
      const inferredType: "pdf" | "image" | "file" =
        file.type === "application/pdf"
          ? "pdf"
          : file.type.startsWith("image/")
            ? "image"
            : "file";
      const addRes = await fetch(`${baseUrl}/attachments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name || file.name,
          url: data.url,
          type: inferredType,
          size: file.size,
        }),
      });
      if (!addRes.ok) throw new Error("Kon bijlage niet toevoegen");
      const attachment = await addRes.json();
      setAttachments((prev) => [...prev, attachment]);
      setName("");
      setUrl("");
      toast({ title: "Bijlage toegevoegd" });
      router.refresh();
    } catch (err) {
      toast({
        title: "Fout",
        description: err instanceof Error ? err.message : "Upload of toevoegen mislukt",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddByUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !url.trim()) return;
    setIsAdding(true);
    try {
      const res = await fetch(`${baseUrl}/attachments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          url: url.trim(),
          type,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Kon bijlage niet toevoegen");
      }
      const attachment = await res.json();
      setAttachments((prev) => [...prev, attachment]);
      setName("");
      setUrl("");
      toast({ title: "Bijlage toegevoegd" });
      router.refresh();
    } catch (err) {
      toast({
        title: "Fout",
        description: err instanceof Error ? err.message : "Toevoegen mislukt",
        variant: "destructive",
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (attachmentId: string) => {
    setDeletingId(attachmentId);
    try {
      const res = await fetch(`${baseUrl}/attachments/${attachmentId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Verwijderen mislukt");
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
      toast({ title: "Bijlage verwijderd" });
      router.refresh();
    } catch {
      toast({
        title: "Fout",
        description: "Kon bijlage niet verwijderen",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Bestanden / downloads
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Voeg PDF&apos;s of andere bestanden toe (bijv. van Canva). Klanten kunnen ze in de les downloaden.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {attachments.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              Huidige bijlagen
            </p>
            <ul className="space-y-2">
              {attachments.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-4 rounded-lg border p-3"
                >
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 min-w-0 flex-1"
                  >
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{a.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      ({a.type})
                    </span>
                  </a>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(a.id)}
                    disabled={deletingId === a.id}
                  >
                    {deletingId === a.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="border-t pt-6 space-y-4">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={addMode === "upload" ? "default" : "outline"}
              size="sm"
              onClick={() => setAddMode("upload")}
            >
              <Upload className="h-4 w-4 mr-1" />
              Upload bestand
            </Button>
            <Button
              type="button"
              variant={addMode === "url" ? "default" : "outline"}
              size="sm"
              onClick={() => setAddMode("url")}
            >
              <LinkIcon className="h-4 w-4 mr-1" />
              Link (URL)
            </Button>
          </div>

          {addMode === "upload" && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Kies PDF of bestand (max 25 MB)
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                PDF, Word of afbeeldingen. Wordt opgeslagen in de app; klanten zien een downloadlink in de les.
              </p>
            </div>
          )}

          {addMode === "url" && (
            <form onSubmit={handleAddByUrl} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="att-name">Naam (zoals klant die ziet)</Label>
                <Input
                  id="att-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="bijv. Werkboek week 1"
                  required={addMode === "url"}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="att-url">URL van het bestand</Label>
                <Input
                  id="att-url"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://..."
                  required={addMode === "url"}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="att-type">Type</Label>
                <select
                  id="att-type"
                  value={type}
                  onChange={(e) =>
                    setType(e.target.value as "pdf" | "image" | "file")
                  }
                  className="flex w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="pdf">PDF</option>
                  <option value="image">Afbeelding</option>
                  <option value="file">Overig bestand</option>
                </select>
              </div>
              <Button type="submit" disabled={isAdding}>
                {isAdding ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Bijlage toevoegen
              </Button>
            </form>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
