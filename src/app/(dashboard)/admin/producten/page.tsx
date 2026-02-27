"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { ChevronLeft, Package, Heart, Loader2, Plus, Trash2 } from "lucide-react";

interface KnowledgeItem {
  id: string;
  title: string;
  videoUrl: string | null;
  videoProvider: string | null;
  description: string | null;
  position: number;
}

interface KnowledgeCategory {
  id: string;
  slug: string;
  title: string;
  position: number;
  items: KnowledgeItem[];
}

interface FavoriteProduct {
  id: string;
  brand: string;
  name: string;
  description: string | null;
  discountCode: string | null;
  productUrl: string | null;
  position: number;
}

export default function AdminProductenPage() {
  const { toast } = useToast();
  const [categories, setCategories] = useState<KnowledgeCategory[]>([]);
  const [favorites, setFavorites] = useState<FavoriteProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const [newCatSlug, setNewCatSlug] = useState("");
  const [newCatTitle, setNewCatTitle] = useState("");
  const [addingCat, setAddingCat] = useState(false);

  const [newItemTitle, setNewItemTitle] = useState("");
  const [newItemVideo, setNewItemVideo] = useState("");
  const [newItemDesc, setNewItemDesc] = useState("");
  const [addingItemFor, setAddingItemFor] = useState<string | null>(null);

  const [newFavBrand, setNewFavBrand] = useState("");
  const [newFavName, setNewFavName] = useState("");
  const [newFavDesc, setNewFavDesc] = useState("");
  const [newFavCode, setNewFavCode] = useState("");
  const [newFavUrl, setNewFavUrl] = useState("");
  const [addingFav, setAddingFav] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [catRes, favRes] = await Promise.all([
        fetch("/api/admin/producten/categories"),
        fetch("/api/admin/producten/favorites"),
      ]);
      if (catRes.ok) {
        const data = await catRes.json();
        setCategories(data);
      }
      if (favRes.ok) {
        const data = await favRes.json();
        setFavorites(data);
      }
    } catch (e) {
      toast({ title: "Fout", description: "Laden mislukt", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const addCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatTitle.trim()) return;
    setAddingCat(true);
    try {
      const slug = newCatSlug.trim() || newCatTitle.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      const res = await fetch("/api/admin/producten/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, title: newCatTitle.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Mislukt");
      toast({ title: "Categorie toegevoegd" });
      setNewCatSlug("");
      setNewCatTitle("");
      load();
    } catch (err) {
      toast({ title: "Fout", description: err instanceof Error ? err.message : "Mislukt", variant: "destructive" });
    } finally {
      setAddingCat(false);
    }
  };

  const deleteCategory = async (id: string) => {
    if (!confirm("Categorie en alle video’s verwijderen?")) return;
    try {
      const res = await fetch(`/api/admin/producten/categories/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Mislukt");
      toast({ title: "Categorie verwijderd" });
      load();
    } catch (err) {
      toast({ title: "Fout", description: "Verwijderen mislukt", variant: "destructive" });
    }
  };

  const addItem = async (e: React.FormEvent, categoryId: string) => {
    e.preventDefault();
    if (!newItemTitle.trim()) return;
    setAddingItemFor(categoryId);
    try {
      const res = await fetch(`/api/admin/producten/categories/${categoryId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newItemTitle.trim(),
          videoUrl: newItemVideo.trim() || null,
          videoProvider: newItemVideo.includes("loom") ? "loom" : newItemVideo.includes("youtube") ? "youtube" : null,
          description: newItemDesc.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Mislukt");
      toast({ title: "Video toegevoegd" });
      setNewItemTitle("");
      setNewItemVideo("");
      setNewItemDesc("");
      setAddingItemFor(null);
      load();
    } catch (err) {
      toast({ title: "Fout", description: err instanceof Error ? err.message : "Mislukt", variant: "destructive" });
    } finally {
      setAddingItemFor(null);
    }
  };

  const deleteItem = async (categoryId: string, itemId: string) => {
    if (!confirm("Video verwijderen?")) return;
    try {
      const res = await fetch(`/api/admin/producten/categories/${categoryId}/items/${itemId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Mislukt");
      toast({ title: "Video verwijderd" });
      load();
    } catch (err) {
      toast({ title: "Fout", description: "Verwijderen mislukt", variant: "destructive" });
    }
  };

  const addFavorite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFavBrand.trim() || !newFavName.trim()) return;
    setAddingFav(true);
    try {
      const res = await fetch("/api/admin/producten/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand: newFavBrand.trim(),
          name: newFavName.trim(),
          description: newFavDesc.trim() || null,
          discountCode: newFavCode.trim() || null,
          productUrl: newFavUrl.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Mislukt");
      toast({ title: "Favoriet toegevoegd" });
      setNewFavBrand("");
      setNewFavName("");
      setNewFavDesc("");
      setNewFavCode("");
      setNewFavUrl("");
      load();
    } catch (err) {
      toast({ title: "Fout", description: err instanceof Error ? err.message : "Mislukt", variant: "destructive" });
    } finally {
      setAddingFav(false);
    }
  };

  const deleteFavorite = async (id: string) => {
    if (!confirm("Product uit favorieten halen?")) return;
    try {
      const res = await fetch(`/api/admin/producten/favorites/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Mislukt");
      toast({ title: "Favoriet verwijderd" });
      load();
    } catch (err) {
      toast({ title: "Fout", description: "Verwijderen mislukt", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 lg:p-12">
      <Link href="/admin" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
        <ChevronLeft className="h-4 w-4 mr-1" />
        Terug naar admin
      </Link>
      <h1 className="font-display text-2xl md:text-3xl tracking-wider mb-2">PRODUCTEN & KENNISBANK</h1>
      <p className="text-muted-foreground mb-8">
        Categorieën (bv. Supplementen) met video’s · en favoriete producten met kortingscodes. Voor iedereen zichtbaar op /producten.
      </p>

      {/* Categorieën */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Categorieën
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Bijv. Supplementen, Bloedtesten. Per categorie kun je video’s toevoegen (Loom, YouTube).
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={addCategory} className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[140px]">
              <Label className="sr-only">Slug</Label>
              <Input
                placeholder="slug (optioneel)"
                value={newCatSlug}
                onChange={(e) => setNewCatSlug(e.target.value)}
              />
            </div>
            <div className="flex-1 min-w-[140px]">
              <Label className="sr-only">Titel</Label>
              <Input
                placeholder="Titel *"
                value={newCatTitle}
                onChange={(e) => setNewCatTitle(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={addingCat}>
              {addingCat ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
              Categorie toevoegen
            </Button>
          </form>
          <div className="space-y-4">
            {categories.map((c) => (
              <div key={c.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{c.title}</span>
                  <span className="text-sm text-muted-foreground">/{c.slug}</span>
                  <Button variant="ghost" size="sm" onClick={() => deleteCategory(c.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  {c.items.map((i) => (
                    <li key={i.id} className="flex items-center justify-between gap-2">
                      <span>{i.title}</span>
                      <Button variant="ghost" size="sm" onClick={() => deleteItem(c.id, i.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </li>
                  ))}
                </ul>
                {addingItemFor === c.id ? (
                  <form onSubmit={(e) => addItem(e, c.id)} className="flex flex-wrap gap-2 space-y-2">
                    <Input
                      placeholder="Titel video *"
                      value={newItemTitle}
                      onChange={(e) => setNewItemTitle(e.target.value)}
                      className="max-w-[200px]"
                    />
                    <Input
                      placeholder="Video-URL (Loom, YouTube)"
                      value={newItemVideo}
                      onChange={(e) => setNewItemVideo(e.target.value)}
                      className="max-w-[280px]"
                    />
                    <Input
                      placeholder="Korte beschrijving"
                      value={newItemDesc}
                      onChange={(e) => setNewItemDesc(e.target.value)}
                      className="max-w-[200px]"
                    />
                    <Button type="submit" disabled={!!addingItemFor} size="sm">
                      {addingItemFor ? <Loader2 className="h-4 w-4 animate-spin" /> : "Toevoegen"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setAddingItemFor(null);
                        setNewItemTitle("");
                        setNewItemVideo("");
                        setNewItemDesc("");
                      }}
                    >
                      Annuleren
                    </Button>
                  </form>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setAddingItemFor(c.id)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Video toevoegen
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Favoriete producten */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Mijn favoriete producten
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Producten met uitleg en kortingscodes (bv. Pit &amp; Pit: mijn lijstje).
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={addFavorite} className="space-y-3">
            <div className="flex flex-wrap gap-3">
              <Input
                placeholder="Merk *"
                value={newFavBrand}
                onChange={(e) => setNewFavBrand(e.target.value)}
                className="max-w-[140px]"
              />
              <Input
                placeholder="Naam product *"
                value={newFavName}
                onChange={(e) => setNewFavName(e.target.value)}
                className="max-w-[180px]"
              />
              <Input
                placeholder="Kortingscode"
                value={newFavCode}
                onChange={(e) => setNewFavCode(e.target.value)}
                className="max-w-[120px]"
              />
              <Input
                placeholder="Product-URL"
                value={newFavUrl}
                onChange={(e) => setNewFavUrl(e.target.value)}
                className="max-w-[240px]"
              />
            </div>
            <div>
              <Label className="text-muted-foreground mb-1 block text-sm">Uitleg / mijn lijstje (optioneel)</Label>
              <textarea
                placeholder="Korte uitleg over het product..."
                value={newFavDesc}
                onChange={(e) => setNewFavDesc(e.target.value)}
                className="flex w-full max-w-md rounded-lg border border-border bg-background px-3 py-2 text-sm min-h-[60px]"
              />
            </div>
            <Button type="submit" disabled={addingFav}>
              {addingFav ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
              Toevoegen
            </Button>
          </form>
          <ul className="space-y-2">
            {favorites.map((f) => (
              <li key={f.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <span className="font-medium">{f.brand}: {f.name}</span>
                  {f.discountCode && (
                    <span className="ml-2 text-sm text-muted-foreground">Code: {f.discountCode}</span>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={() => deleteFavorite(f.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
