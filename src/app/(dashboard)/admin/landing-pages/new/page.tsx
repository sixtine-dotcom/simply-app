"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { ChevronLeft, LayoutTemplate, Loader2, Rocket } from "lucide-react";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export default function NewLandingPagePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [headline, setHeadline] = useState("");
  const [subheadline, setSubheadline] = useState("");

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!slug || slug === slugify(title)) {
      setSlug(slugify(value));
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/landing-pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title || "Nieuwe landing page",
          slug: slugify(slug || title || "nieuwe-landing-page"),
          headline: headline || null,
          subheadline: subheadline || null,
          blocks: [],
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Aanmaken mislukt");
      }
      toast({
        title: "Landing page aangemaakt",
        description: "Je kunt nu blokken toevoegen in de builder.",
      });
      router.push(`/admin/landing-pages/${result.id}`);
    } catch (error) {
      toast({
        title: "Fout",
        description: error instanceof Error ? error.message : "Kon niet aanmaken",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f6f1e7_0%,#fcfbf7_28%,#ffffff_100%)]">
      <div className="mx-auto max-w-5xl p-6 md:p-8 lg:p-12">
        <Link
          href="/admin/landing-pages"
          className="inline-flex items-center text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Terug naar landing pages
        </Link>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="rounded-[2rem] border-stone-200 bg-white shadow-[0_24px_80px_-55px_rgba(0,0,0,0.35)]">
            <CardHeader>
              <CardTitle className="font-display text-3xl tracking-[0.08em] text-stone-900">
                NIEUWE LANDING PAGE
              </CardTitle>
              <CardDescription>
                Maak eerst de basis aan. De echte opbouw en preview doe je daarna in de builder.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="title">Titel *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(event) => handleTitleChange(event.target.value)}
                    placeholder="Bijv. Masterclass Hormoonbalans"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug">Slug *</Label>
                  <Input
                    id="slug"
                    value={slug}
                    onChange={(event) => setSlug(event.target.value)}
                    placeholder="masterclass-hormoonbalans"
                    required
                  />
                </div>

                <div className="rounded-2xl bg-stone-50 px-4 py-3 text-sm text-stone-600">
                  Publieke URL: <span className="font-medium text-stone-900">/landing/{slug || "jouw-pagina"}</span>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="headline">Hero headline</Label>
                  <Input
                    id="headline"
                    value={headline}
                    onChange={(event) => setHeadline(event.target.value)}
                    placeholder="De belofte of het resultaat van deze pagina"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subheadline">Hero subheadline</Label>
                  <textarea
                    id="subheadline"
                    value={subheadline}
                    onChange={(event) => setSubheadline(event.target.value)}
                    className="min-h-[120px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    placeholder="Leg in 2 à 3 zinnen uit voor wie dit is en wat de volgende stap is."
                  />
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button type="submit" disabled={isLoading} className="rounded-full px-6">
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Aanmaken en openen
                  </Button>
                  <Button type="button" variant="outline" asChild className="rounded-full px-6">
                    <Link href="/admin/landing-pages">Annuleren</Link>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-5">
            <Card className="rounded-[2rem] border-stone-200 bg-stone-950 text-stone-100 shadow-[0_24px_80px_-55px_rgba(0,0,0,0.6)]">
              <CardHeader>
                <CardTitle className="text-white">Na het aanmaken</CardTitle>
                <CardDescription className="text-stone-400">
                  Je komt direct in de builder waar je blokken, preview en publicatie beheert.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-stone-300">
                <div className="rounded-2xl bg-white/5 p-4">
                  <div className="flex items-center gap-2 font-medium text-white">
                    <LayoutTemplate className="h-4 w-4" />
                    Builder
                  </div>
                  <p className="mt-2 leading-6">
                    Voeg hero-secties, tekst, afbeeldingen, video, productblokken of CTA&apos;s toe.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 p-4">
                  <div className="flex items-center gap-2 font-medium text-white">
                    <Rocket className="h-4 w-4" />
                    Publiceren
                  </div>
                  <p className="mt-2 leading-6">
                    Zodra de flow klopt, zet je de pagina live en kun je verkeer of leads gaan sturen.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
