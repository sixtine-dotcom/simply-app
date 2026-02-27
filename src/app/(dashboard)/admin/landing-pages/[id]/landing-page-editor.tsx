"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import {
  ChevronLeft,
  Loader2,
  Plus,
  Trash2,
  GripVertical,
  ExternalLink,
} from "lucide-react";

type BlockType = "heading" | "text" | "image" | "video" | "product" | "calendly" | "cta";

interface Block {
  id?: string;
  type: BlockType;
  level?: number;
  text?: string;
  content?: string;
  url?: string;
  alt?: string;
  provider?: "vimeo" | "loom";
  videoId?: string;
  productHandle?: string;
  embedUrl?: string;
  label?: string;
  href?: string;
  primary?: boolean;
}

const BLOCK_LABELS: Record<BlockType, string> = {
  heading: "Kop",
  text: "Tekst",
  image: "Afbeelding",
  video: "Video",
  product: "Shopify-product",
  calendly: "Calendly",
  cta: "Knop (CTA)",
};

function generateId() {
  return "b-" + Math.random().toString(36).slice(2, 11);
}

export function LandingPageEditor({
  id,
  initialTitle,
  initialSlug,
  initialHeadline,
  initialSubheadline,
  initialIsPublished,
  initialShopifyStoreDomain,
  initialShopifyStorefrontToken,
  initialBlocks,
}: {
  id: string;
  initialTitle: string;
  initialSlug: string;
  initialHeadline: string;
  initialSubheadline: string;
  initialIsPublished: boolean;
  initialShopifyStoreDomain: string;
  initialShopifyStorefrontToken: string;
  initialBlocks: Record<string, unknown>[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [slug, setSlug] = useState(initialSlug);
  const [headline, setHeadline] = useState(initialHeadline);
  const [subheadline, setSubheadline] = useState(initialSubheadline);
  const [isPublished, setIsPublished] = useState(initialIsPublished);
  const [shopifyStoreDomain, setShopifyStoreDomain] = useState(initialShopifyStoreDomain);
  const [shopifyStorefrontToken, setShopifyStorefrontToken] = useState(
    initialShopifyStorefrontToken
  );
  const [blocks, setBlocks] = useState<Block[]>(
    initialBlocks.map((b) => {
      const block = b as unknown as Block;
      return { ...block, id: block.id || generateId() };
    })
  );

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/landing-pages/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          slug,
          headline: headline || null,
          subheadline: subheadline || null,
          isPublished,
          shopifyStoreDomain: shopifyStoreDomain || null,
          shopifyStorefrontToken: shopifyStorefrontToken || null,
          blocks,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Opslaan mislukt");
      }
      toast({ title: "Opgeslagen" });
      router.refresh();
    } catch (err) {
      toast({
        title: "Fout",
        description: err instanceof Error ? err.message : "Kon niet opslaan",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const addBlock = (type: BlockType) => {
    const newBlock: Block = { type, id: generateId() };
    switch (type) {
      case "heading":
        newBlock.level = 2;
        newBlock.text = "Nieuwe kop";
        break;
      case "text":
        newBlock.content = "Tekst hier…";
        break;
      case "image":
        newBlock.url = "";
        newBlock.alt = "";
        break;
      case "video":
        newBlock.provider = "vimeo";
        newBlock.videoId = "";
        break;
      case "product":
        newBlock.productHandle = "";
        break;
      case "calendly":
        newBlock.embedUrl = "https://calendly.com/sixtine-ophoff/15min";
        break;
      case "cta":
        newBlock.label = "Direct starten";
        newBlock.href = "#";
        newBlock.primary = true;
        break;
    }
    setBlocks((prev) => [...prev, newBlock]);
  };

  const updateBlock = (index: number, updates: Partial<Block>) => {
    setBlocks((prev) =>
      prev.map((b, i) => (i === index ? { ...b, ...updates } : b))
    );
  };

  const removeBlock = (index: number) => {
    setBlocks((prev) => prev.filter((_, i) => i !== index));
  };

  const moveBlock = (index: number, dir: "up" | "down") => {
    const next = [...blocks];
    const j = dir === "up" ? index - 1 : index + 1;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    setBlocks(next);
  };

  return (
    <div className="p-6 md:p-8 lg:p-12 max-w-4xl">
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <Link
          href="/admin/landing-pages"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Terug
        </Link>
        {isPublished && (
          <Button variant="outline" size="sm" asChild>
            <Link href={`/landing/${slug}`} target="_blank" rel="noopener">
              <ExternalLink className="mr-1 h-4 w-4" />
              Pagina bekijken
            </Link>
          </Button>
        )}
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Algemeen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Titel (browsertab)</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div>
                <Label>Slug (URL: /landing/…)</Label>
                <Input value={slug} onChange={(e) => setSlug(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Hero-kop</Label>
              <Input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Grote titel bovenaan" />
            </div>
            <div>
              <Label>Hero-subtekst</Label>
              <Input value={subheadline} onChange={(e) => setSubheadline(e.target.value)} placeholder="Korte intro" />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="publish"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="rounded border-input"
              />
              <Label htmlFor="publish">Pagina live zetten (zichtbaar op /landing/{slug})</Label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Shopify (voor product-blokken)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Store domain</Label>
              <Input
                value={shopifyStoreDomain}
                onChange={(e) => setShopifyStoreDomain(e.target.value)}
                placeholder="jouw-winkel"
              />
            </div>
            <div>
              <Label>Storefront API-token</Label>
              <Input
                type="password"
                value={shopifyStorefrontToken}
                onChange={(e) => setShopifyStorefrontToken(e.target.value)}
                placeholder="shpat_…"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Blokken</CardTitle>
            <div className="flex flex-wrap gap-1">
              {(["heading", "text", "image", "video", "product", "calendly", "cta"] as BlockType[]).map((type) => (
                <Button key={type} type="button" variant="outline" size="sm" onClick={() => addBlock(type)}>
                  <Plus className="h-4 w-4 mr-1" />
                  {BLOCK_LABELS[type]}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {blocks.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nog geen blokken. Klik op een knop hierboven om er een toe te voegen.</p>
            ) : (
              blocks.map((block, index) => (
                <div key={block.id || index} className="border rounded-lg p-4 space-y-3 bg-muted/30">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      {BLOCK_LABELS[block.type]}
                    </span>
                    <div className="flex gap-1">
                      <Button type="button" variant="ghost" size="sm" onClick={() => moveBlock(index, "up")} disabled={index === 0}>
                        ↑
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => moveBlock(index, "down")} disabled={index === blocks.length - 1}>
                        ↓
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeBlock(index)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  {block.type === "heading" && (
                    <>
                      <div>
                        <Label>Niveau (1–3)</Label>
                        <Input
                          type="number"
                          min={1}
                          max={3}
                          value={block.level ?? 2}
                          onChange={(e) => updateBlock(index, { level: parseInt(e.target.value, 10) || 2 })}
                        />
                      </div>
                      <div>
                        <Label>Tekst</Label>
                        <Input
                          value={block.text ?? ""}
                          onChange={(e) => updateBlock(index, { text: e.target.value })}
                        />
                      </div>
                    </>
                  )}
                  {block.type === "text" && (
                    <div>
                      <Label>Inhoud</Label>
                      <textarea
                        className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={block.content ?? ""}
                        onChange={(e) => updateBlock(index, { content: e.target.value })}
                      />
                    </div>
                  )}
                  {block.type === "image" && (
                    <>
                      <div>
                        <Label>Afbeelding-URL</Label>
                        <Input
                          value={block.url ?? ""}
                          onChange={(e) => updateBlock(index, { url: e.target.value })}
                          placeholder="https://… of /uploads/…"
                        />
                      </div>
                      <div>
                        <Label>Alt-tekst</Label>
                        <Input
                          value={block.alt ?? ""}
                          onChange={(e) => updateBlock(index, { alt: e.target.value })}
                        />
                      </div>
                    </>
                  )}
                  {block.type === "video" && (
                    <>
                      <div>
                        <Label>Type</Label>
                        <select
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={block.provider ?? "vimeo"}
                          onChange={(e) => updateBlock(index, { provider: e.target.value as "vimeo" | "loom" })}
                        >
                          <option value="vimeo">Vimeo</option>
                          <option value="loom">Loom</option>
                        </select>
                      </div>
                      <div>
                        <Label>Video-ID</Label>
                        <Input
                          value={block.videoId ?? ""}
                          onChange={(e) => updateBlock(index, { videoId: e.target.value })}
                          placeholder="123456789 (Vimeo) of share-code (Loom)"
                        />
                      </div>
                    </>
                  )}
                  {block.type === "product" && (
                    <div>
                      <Label>Product-handle (Shopify)</Label>
                      <Input
                        value={block.productHandle ?? ""}
                        onChange={(e) => updateBlock(index, { productHandle: e.target.value })}
                        placeholder="mijn-cursus"
                      />
                    </div>
                  )}
                  {block.type === "calendly" && (
                    <div>
                      <Label>Calendly-URL</Label>
                      <Input
                        value={block.embedUrl ?? ""}
                        onChange={(e) => updateBlock(index, { embedUrl: e.target.value })}
                        placeholder="https://calendly.com/..."
                      />
                    </div>
                  )}
                  {block.type === "cta" && (
                    <>
                      <div>
                        <Label>Knoptekst</Label>
                        <Input
                          value={block.label ?? ""}
                          onChange={(e) => updateBlock(index, { label: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Link</Label>
                        <Input
                          value={block.href ?? ""}
                          onChange={(e) => updateBlock(index, { href: e.target.value })}
                          placeholder="#product of https://..."
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={block.primary ?? true}
                          onChange={(e) => updateBlock(index, { primary: e.target.checked })}
                          className="rounded border-input"
                        />
                        <Label>Primaire knop (groen)</Label>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Opslaan"}
        </Button>
      </div>
    </div>
  );
}
