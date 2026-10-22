"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bot, Database, Inbox, MessageSquare, Plus, RefreshCw, Trash2, ToggleLeft, ToggleRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

type Source = {
  id: string;
  title: string;
  content: string;
  type: string;
  tags: string[];
  isActive: boolean;
  createdAt: string;
};

const SOURCE_TYPES = [
  { value: "guideline", label: "Richtlijn / Protocol" },
  { value: "qa", label: "Vraag & Antwoord" },
  { value: "community_qa", label: "Communityantwoord" },
  { value: "custom", label: "Overige kennisbron" },
  { value: "recipe", label: "Recept informatie" },
  { value: "course", label: "Cursusinhoud" },
];

export default function AdminAiPage() {
  const { toast } = useToast();
  const [sources, setSources] = useState<Source[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    content: "",
    type: "guideline",
    tags: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncingCourses, setIsSyncingCourses] = useState(false);

  async function loadSources() {
    try {
      const res = await fetch("/api/admin/ai/sources");
      if (res.ok) setSources(await res.json());
    } catch {
      toast({ title: "Fout bij laden", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadSources();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) {
      toast({ title: "Vul titel en inhoud in", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const tags = form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const res = await fetch("/api/admin/ai/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, tags }),
      });
      if (!res.ok) throw new Error();
      const created = await res.json();
      setSources((prev) => [created, ...prev]);
      setForm({ title: "", content: "", type: "guideline", tags: "" });
      setShowForm(false);
      toast({ title: "Kennisbron toegevoegd ✓" });
    } catch {
      toast({ title: "Fout bij opslaan", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleActive(source: Source) {
    try {
      const res = await fetch(`/api/admin/ai/sources/${source.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !source.isActive }),
      });
      if (!res.ok) throw new Error();
      setSources((prev) =>
        prev.map((s) => (s.id === source.id ? { ...s, isActive: !s.isActive } : s))
      );
    } catch {
      toast({ title: "Fout bij bijwerken", variant: "destructive" });
    }
  }

  async function deleteSource(id: string) {
    if (!confirm("Weet je zeker dat je deze bron wilt verwijderen?")) return;
    try {
      const res = await fetch(`/api/admin/ai/sources/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setSources((prev) => prev.filter((s) => s.id !== id));
      toast({ title: "Kennisbron verwijderd" });
    } catch {
      toast({ title: "Fout bij verwijderen", variant: "destructive" });
    }
  }

  async function syncCourses() {
    setIsSyncingCourses(true);
    try {
      const res = await fetch("/api/admin/ai/sync-courses", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Fout bij synchroniseren");

      await loadSources();
      toast({
        title: "Cursusinhoud gesynchroniseerd",
        description: `${data.upserted ?? 0} lessen toegevoegd of bijgewerkt.`,
      });
    } catch {
      toast({ title: "Fout bij synchroniseren", variant: "destructive" });
    } finally {
      setIsSyncingCourses(false);
    }
  }

  const activeSources = sources.filter((s) => s.isActive).length;

  return (
    <div className="p-6 md:p-8 lg:p-12">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <section className="relative overflow-hidden rounded-[2rem] border border-border bg-[linear-gradient(135deg,rgba(247,244,237,0.98),rgba(255,255,255,0.95))] px-6 py-7 shadow-card md:px-8 md:py-8">
          <div className="relative">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-3 py-1 text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground">
              <Bot className="h-3.5 w-3.5" />
              AI Hub
            </div>
            <h1 className="font-display text-3xl tracking-[0.16em] text-foreground md:text-4xl">
              SIX AI BEHEER
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
              Beheer de kennisbronnen waarop SIX AI zijn antwoorden baseert. Hoe meer bronnen,
              hoe beter de antwoorden.
            </p>
          </div>
        </section>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Database className="h-8 w-8 text-primary/60" />
                <div>
                  <p className="text-2xl font-bold">{sources.length}</p>
                  <p className="text-xs text-muted-foreground">Totaal bronnen</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Sparkles className="h-8 w-8 text-green-500/60" />
                <div>
                  <p className="text-2xl font-bold text-green-600">{activeSources}</p>
                  <p className="text-xs text-muted-foreground">Actieve bronnen</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-8 w-8 text-blue-500/60" />
                <div>
                  <p className="text-2xl font-bold">{sources.length - activeSources}</p>
                  <p className="text-xs text-muted-foreground">Inactieve bronnen</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Source actions */}
        <div className="flex flex-col justify-end gap-2 sm:flex-row">
          <Button asChild type="button" variant="outline" className="gap-2">
            <Link href="/admin/ai/inbox">
              <Inbox className="h-4 w-4" />
              Open AI Inbox
            </Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={syncCourses}
            disabled={isSyncingCourses}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isSyncingCourses ? "animate-spin" : ""}`} />
            {isSyncingCourses ? "Synchroniseren..." : "Cursusinhoud synchroniseren"}
          </Button>
          <Button onClick={() => setShowForm(!showForm)} className="gap-2">
            <Plus className="h-4 w-4" />
            Kennisbron toevoegen
          </Button>
        </div>

        {/* Add form */}
        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>Nieuwe kennisbron</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Titel *</Label>
                    <Input
                      value={form.title}
                      onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                      placeholder="bijv. Eiwitbehoefte richtlijnen"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Type *</Label>
                    <select
                      value={form.type}
                      onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      {SOURCE_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Inhoud *</Label>
                  <Textarea
                    value={form.content}
                    onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                    placeholder="Voer de kennisinhoud in die SIX AI moet gebruiken..."
                    rows={6}
                  />
                  <p className="text-xs text-muted-foreground">
                    {form.content.length} tekens
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Tags (komma-gescheiden)</Label>
                  <Input
                    value={form.tags}
                    onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                    placeholder="voeding, eiwit, richtlijn"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    Annuleren
                  </Button>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? "Opslaan..." : "Opslaan"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Sources list */}
        <div className="space-y-3">
          <h2 className="font-medium text-foreground">Kennisbronnen</h2>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Laden...</p>
          ) : sources.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Database className="mx-auto h-10 w-10 text-muted-foreground/40" />
                <p className="mt-3 text-sm text-muted-foreground">
                  Nog geen kennisbronnen. Voeg je eerste bron toe zodat SIX AI betere antwoorden
                  kan geven.
                </p>
              </CardContent>
            </Card>
          ) : (
            sources.map((source) => (
              <Card
                key={source.id}
                className={!source.isActive ? "opacity-60" : ""}
              >
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{source.title}</span>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          {SOURCE_TYPES.find((t) => t.value === source.type)?.label || source.type}
                        </span>
                        {!source.isActive && (
                          <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-600">
                            Inactief
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                        {source.content}
                      </p>
                      {source.tags.length > 0 && (
                        <div className="mt-2 flex gap-1 flex-wrap">
                          {source.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => toggleActive(source)}
                        className="rounded p-1.5 text-muted-foreground hover:text-foreground transition"
                        title={source.isActive ? "Deactiveren" : "Activeren"}
                      >
                        {source.isActive ? (
                          <ToggleRight className="h-5 w-5 text-green-600" />
                        ) : (
                          <ToggleLeft className="h-5 w-5" />
                        )}
                      </button>
                      <button
                        onClick={() => deleteSource(source.id)}
                        className="rounded p-1.5 text-muted-foreground hover:text-red-500 transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
