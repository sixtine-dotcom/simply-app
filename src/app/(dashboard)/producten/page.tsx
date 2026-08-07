"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VideoPlayer } from "@/components/courses/video-player";
import { useCurrentUserSummary } from "@/hooks/use-current-user";
import { getDashboardHomeHref, isAdminRole } from "@/lib/current-user";
import { ChevronLeft, Loader2, Package, Heart, PlayCircle } from "lucide-react";

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

type TabId = string; // category slug or "favorites"

export default function ProductenPage() {
  const [categories, setCategories] = useState<KnowledgeCategory[]>([]);
  const [favorites, setFavorites] = useState<FavoriteProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>("favorites");
  const { user } = useCurrentUserSummary();

  useEffect(() => {
    fetch("/api/producten")
      .then((r) => r.json())
      .then((productenData) => {
        if (productenData.categories) setCategories(productenData.categories);
        if (productenData.favorites) setFavorites(productenData.favorites);
        if (productenData.categories?.length) setActiveTab(productenData.categories[0].slug);
        else setActiveTab("favorites");
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const isAdmin = isAdminRole(user?.role);
  const backHref = getDashboardHomeHref(user?.role);
  const pageKicker = isAdmin ? "Admin library" : "Knowledge hub";
  const pageDescription = isAdmin
    ? "Bekijk dezelfde kennisbank en favoriete producten vanuit je admin-context."
    : "Video’s over supplementen, bloedtesten en meer · plus mijn favoriete producten met kortingscodes";

  const activeCategory = categories.find((c) => c.slug === activeTab);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl p-4 md:p-6 lg:p-8">
      <Link
        href={backHref}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Terug
      </Link>

      <div className="app-panel app-halo mb-8 overflow-hidden">
        <p className="app-kicker">{pageKicker}</p>
        <h1 className="mt-3 font-display text-3xl tracking-tight text-slate-950 md:text-5xl">
          Producten &amp; kennisbank
        </h1>
        <p className="mt-3 max-w-3xl text-muted-foreground">
          {pageDescription}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-border pb-4">
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveTab(c.slug)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === c.slug
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80 text-muted-foreground"
            }`}
          >
            {c.title}
          </button>
        ))}
        <button
          onClick={() => setActiveTab("favorites")}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "favorites"
              ? "bg-primary text-primary-foreground"
              : "bg-muted hover:bg-muted/80 text-muted-foreground"
          }`}
        >
          <Heart className="h-4 w-4" />
          Mijn favoriete producten
        </button>
      </div>

      {/* Category content */}
      {activeTab !== "favorites" && activeCategory && (
        <div className="space-y-6">
          {activeCategory.items.length === 0 ? (
            <Card className="app-halo">
              <CardContent className="py-12 text-center text-muted-foreground">
                <Package className="h-12 w-12 mx-auto opacity-50 mb-4" />
                Nog geen video’s in {activeCategory.title}.
              </CardContent>
            </Card>
          ) : (
            activeCategory.items.map((item) => (
              <Card key={item.id} className="app-halo">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    {item.videoUrl && <PlayCircle className="h-5 w-5 text-primary" />}
                    {item.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {item.videoUrl && (
                    <VideoPlayer
                      url={item.videoUrl}
                      provider={item.videoProvider}
                    />
                  )}
                  {item.description && (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {item.description}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Favorites content */}
      {activeTab === "favorites" && (
        <div className="space-y-4">
          {favorites.length === 0 ? (
            <Card className="app-halo">
              <CardContent className="py-12 text-center text-muted-foreground">
                <Heart className="h-12 w-12 mx-auto opacity-50 mb-4" />
                Nog geen favoriete producten.
              </CardContent>
            </Card>
          ) : (
            favorites.map((p) => (
              <Card key={p.id} className="app-halo">
                <CardHeader>
                  <CardTitle className="text-lg">{p.brand}: {p.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {p.description && (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {p.description}
                    </p>
                  )}
                  {p.discountCode && (
                    <p className="text-sm">
                      <span className="font-medium">Kortingscode:</span>{" "}
                      <code className="bg-muted px-2 py-0.5 rounded">{p.discountCode}</code>
                    </p>
                  )}
                  {p.productUrl && (
                    <a
                      href={p.productUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      Naar product →
                    </a>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
