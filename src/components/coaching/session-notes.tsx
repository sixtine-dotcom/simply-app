"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { formatDateTime } from "@/lib/utils";
import { Loader2, Send, FileText } from "lucide-react";

interface Note {
  id: string;
  content: string;
  isSharedWithClient: boolean;
  createdAt: Date;
}

interface SessionNotesProps {
  notes?: Note[];
  sessionId?: string;
  canAddNote?: boolean;
}

export function SessionNotes({ notes = [], sessionId, canAddNote = false }: SessionNotesProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [newNote, setNewNote] = useState("");
  const [shareWithClient, setShareWithClient] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId || !newNote.trim() || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/sessions/${sessionId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newNote.trim(),
          isSharedWithClient: shareWithClient,
        }),
      });

      if (!response.ok) {
        throw new Error("Kon notitie niet toevoegen");
      }

      setNewNote("");
      setShareWithClient(false);
      router.refresh();
      
      toast({
        title: "Notitie toegevoegd",
        description: "De notitie is opgeslagen.",
      });
    } catch (error) {
      toast({
        title: "Fout",
        description: error instanceof Error ? error.message : "Kon notitie niet toevoegen",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (canAddNote) {
    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Schrijf je notities over deze sessie..."
          className="w-full resize-none border rounded-lg p-3 min-h-[120px] focus:ring-2 focus:ring-primary focus:border-transparent"
        />

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="shareWithClient"
            checked={shareWithClient}
            onChange={(e) => setShareWithClient(e.target.checked)}
            className="h-4 w-4"
          />
          <label htmlFor="shareWithClient" className="text-sm text-muted-foreground">
            Delen met klant
          </label>
        </div>

        <Button type="submit" disabled={!newNote.trim() || isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Send className="h-4 w-4 mr-2" />
          )}
          Notitie opslaan
        </Button>
      </form>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Nog geen notities voor deze sessie.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {notes.map((note) => (
        <Card key={note.id}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <time className="text-xs text-muted-foreground">
                  {formatDateTime(note.createdAt)}
                </time>
              </div>
              {note.isSharedWithClient && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                  Gedeeld met klant
                </span>
              )}
            </div>
            <p className="whitespace-pre-wrap">{note.content}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
