"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { ChevronLeft, Loader2 } from "lucide-react";

export default function NewLandingPagePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [headline, setHeadline] = useState("");
  const [subheadline, setSubheadline] = useState("");

  const handleTitleChange = (t: string) => {
    setTitle(t);
    if (!slug || slug === title.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "")) {
      setSlug(
        t
          .toLowerCase()
          .replace(/[^\w\s-]/g, "")
          .replace(/\s+/g, "-")
          .replace(/-+/g, "-")
          .trim()
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/landing-pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title || "Nieuwe landing page",
          slug: slug || "nieuwe-landing-page",
          headline: headline || null,
          subheadline: subheadline || null,
          blocks: [],
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Aanmaken mislukt");
      }
      const page = await res.json();
      toast({ title: "Landing page aangemaakt", description: "Je kunt nu blokken toevoegen." });
      router.push(`/admin/landing-pages/${page.id}`);
    } catch (err) {
      toast({
        title: "Fout",
        description: err instanceof Error ? err.message : "Kon niet aanmaken",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-8 lg:p-12 max-w-2xl">
      <Link
        href="/admin/landing-pages"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Terug naar landingpagina&apos;s
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Nieuwe landing page</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="title">Titel (browsertab)</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Bijv. Masterclass Maart"
              />
            </div>
            <div>
              <Label htmlFor="slug">Slug (in URL)</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="masterclass-maart"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Pagina wordt: /landing/{slug || "..."}
              </p>
            </div>
            <div>
              <Label htmlFor="headline">Koptekst (hero)</Label>
              <Input
                id="headline"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="Leer in 4 weken wat je verder helpt"
              />
            </div>
            <div>
              <Label htmlFor="subheadline">Subtekst (hero)</Label>
              <Input
                id="subheadline"
                value={subheadline}
                onChange={(e) => setSubheadline(e.target.value)}
                placeholder="Bekijk de video en start vandaag."
              />
            </div>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aanmaken en bewerken"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
