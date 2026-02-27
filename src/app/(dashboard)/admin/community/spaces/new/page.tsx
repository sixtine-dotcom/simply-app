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

const EMOJI_OPTIONS = ["💬", "📢", "🎉", "🍽️", "💪", "❤️", "🌿", "⭐", "🔥", "💡"];

export default function NewSpacePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    iconEmoji: "💬",
    isPublic: true,
    isHostOnly: false,
  });

  const handleNameChange = (name: string) => {
    const slug = name
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
    
    setFormData({ ...formData, name, slug });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/admin/community/spaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Kon space niet aanmaken");
      }

      toast({
        title: "Space aangemaakt",
        description: "De nieuwe space is beschikbaar.",
      });

      router.push("/admin/community");
    } catch (error) {
      toast({
        title: "Fout",
        description: error instanceof Error ? error.message : "Kon space niet aanmaken",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-8 lg:p-12 max-w-2xl">
      <Link 
        href="/admin/community"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Terug naar community
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-2xl tracking-wider">
            NIEUWE SPACE
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Emoji */}
            <div className="space-y-2">
              <Label>Icoon</Label>
              <div className="flex gap-2 flex-wrap">
                {EMOJI_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setFormData({ ...formData, iconEmoji: emoji })}
                    className={`text-2xl p-2 rounded-lg border transition-colors ${
                      formData.iconEmoji === emoji
                        ? "border-primary bg-primary/10"
                        : "border-transparent hover:bg-muted"
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Naam *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="bijv. Algemeen"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug (URL) *</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="algemeen"
                required
              />
              <p className="text-xs text-muted-foreground">
                /community/{formData.slug || "..."}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Beschrijving</Label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="flex w-full rounded-lg border border-border bg-background px-3 py-2 text-sm min-h-[80px]"
                placeholder="Waar is deze space voor?"
              />
            </div>

            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Openbaar</Label>
                  <p className="text-sm text-muted-foreground">
                    Zichtbaar voor alle klanten
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.isPublic}
                  onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                  className="h-4 w-4"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Alleen host kan posten</Label>
                  <p className="text-sm text-muted-foreground">
                    Voor aankondigingen (klanten kunnen niet reageren)
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.isHostOnly}
                  onChange={(e) => setFormData({ ...formData, isHostOnly: e.target.checked })}
                  className="h-4 w-4"
                />
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Aanmaken...
                  </>
                ) : (
                  "Space aanmaken"
                )}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/admin/community">Annuleren</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
