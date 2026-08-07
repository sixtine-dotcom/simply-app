"use client";

import { ChangeEvent, DragEvent, useId, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import {
  ChevronLeft,
  ExternalLink,
  GripVertical,
  ImagePlus,
  Loader2,
  MonitorSmartphone,
  Plus,
  Rocket,
  Rows3,
  ShoppingBag,
  Sparkles,
  Trash2,
  Upload,
  Video,
} from "lucide-react";

type BlockType = "heading" | "text" | "image" | "video" | "product" | "calendly" | "cta" | "testimonials" | "faq" | "pricing";

type PagePreset = {
  id: string;
  title: string;
  description: string;
  blocks: Block[];
};

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
  items?: Array<{
    quote?: string;
    name?: string;
    role?: string;
    question?: string;
    answer?: string;
    text?: string;
  }>;
  title?: string;
  price?: string;
  priceSuffix?: string;
  buttonLabel?: string;
  buttonHref?: string;
}

const BLOCK_LABELS: Record<BlockType, string> = {
  heading: "Kop",
  text: "Tekst",
  image: "Afbeelding",
  video: "Video",
  product: "Product",
  calendly: "Calendly",
  cta: "CTA-knop",
  testimonials: "Testimonials",
  faq: "FAQ",
  pricing: "Pricing",
};

const BLOCK_DESCRIPTIONS: Record<BlockType, string> = {
  heading: "Voeg een tussenkop toe voor ritme en structuur.",
  text: "Beschrijf het aanbod, resultaat of verhaal achter de pagina.",
  image: "Toon sfeer, branding of een visual van het aanbod.",
  video: "Embed een Vimeo- of Loom-video in de pagina.",
  product: "Koppel een Shopify-product voor directe verkoop.",
  calendly: "Laat bezoekers direct een kennismakingscall boeken.",
  cta: "Voeg een duidelijke knop toe naar checkout of formulier.",
  testimonials: "Voeg social proof toe met quotes van klanten of deelnemers.",
  faq: "Beantwoord de laatste twijfels voor iemand converteert.",
  pricing: "Toon prijs, inbegrepen onderdelen en een heldere checkout CTA.",
};

function generateId() {
  return "b-" + Math.random().toString(36).slice(2, 11);
}

function normalizeSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function createBlock(type: BlockType): Block {
  const newBlock: Block = { type, id: generateId() };
  switch (type) {
    case "heading":
      return { ...newBlock, level: 2, text: "Nieuwe sectiekop" };
    case "text":
      return {
        ...newBlock,
        content:
          "Beschrijf hier kort het probleem, de transformatie en waarom dit aanbod het juiste volgende stapje is.",
      };
    case "image":
      return { ...newBlock, url: "", alt: "" };
    case "video":
      return { ...newBlock, provider: "vimeo", videoId: "" };
    case "product":
      return { ...newBlock, productHandle: "" };
    case "calendly":
      return { ...newBlock, embedUrl: "https://calendly.com/sixtine-ophoff/15min" };
    case "cta":
      return { ...newBlock, label: "Direct starten", href: "#", primary: true };
    case "testimonials":
      return {
        ...newBlock,
        items: [
          { quote: "Dit voelde eindelijk helder en haalbaar.", name: "Sanne", role: "Klant" },
          { quote: "Ik wist direct waarom ik moest instappen.", name: "Lotte", role: "Deelnemer" },
        ],
      };
    case "faq":
      return {
        ...newBlock,
        items: [
          { question: "Is dit ook geschikt als ik net begin?", answer: "Ja, deze flow is juist bedoeld om je eerste stap heel duidelijk te maken." },
          { question: "Hoe snel krijg ik toegang?", answer: "Na inschrijving of aankoop ontvang je direct de vervolgstappen." },
        ],
      };
    case "pricing":
      return {
        ...newBlock,
        title: "Investment",
        price: "€297",
        priceSuffix: "eenmalig",
        buttonLabel: "Ik wil starten",
        buttonHref: "#product",
        items: [
          { text: "Direct toegang tot de inhoud" },
          { text: "Community en begeleiding" },
          { text: "Een heldere volgende stap zonder losse tools" },
        ],
      };
  }
}

const PAGE_PRESETS: PagePreset[] = [
  {
    id: "lead-magnet",
    title: "Lead magnet",
    description: "Hero, uitleg, video en CTA voor een gratis download of kennismaking.",
    blocks: [
      { type: "heading", level: 2, text: "Voor wie deze volgende stap precies bedoeld is" },
      {
        type: "text",
        content:
          "Leg kort uit welk probleem je oplost, waarom juist nu relevant is en wat iemand concreet krijgt na inschrijving.",
      },
      { type: "video", provider: "loom", videoId: "" },
      { type: "cta", label: "Ik wil toegang", href: "#call", primary: true },
    ],
  },
  {
    id: "sales-page",
    title: "Sales page",
    description: "Volledige flow voor een betaalde offerpagina met bewijs, aanbod en checkout.",
    blocks: [
      { type: "heading", level: 2, text: "Waarom dit aanbod anders werkt" },
      {
        type: "text",
        content:
          "Gebruik dit blok om de transformatie, methode en belangrijkste bezwaren te ontkrachten. Denk in conversieflow, niet alleen in informatie.",
      },
      { type: "image", url: "", alt: "" },
      { type: "heading", level: 3, text: "Dit krijg je exact" },
      {
        type: "text",
        content:
          "Som modules, calls, community, templates of support op. Maak het tastbaar zodat de bezoeker voelt wat er inbegrepen is.",
      },
      { type: "product", productHandle: "" },
      {
        type: "testimonials",
        items: [
          { quote: "Deze pagina voelde meteen vertrouwenwekkend.", name: "Eva", role: "Lead" },
          { quote: "Ik wist direct wat de volgende stap was.", name: "Sophie", role: "Klant" },
        ],
      },
      {
        type: "faq",
        items: [
          { question: "Voor wie is dit bedoeld?", answer: "Voor mensen die helderheid en een concrete volgende stap zoeken." },
          { question: "Moet ik al ervaring hebben?", answer: "Nee, de flow mag juist ook voor starters duidelijk en veilig voelen." },
        ],
      },
      { type: "cta", label: "Start direct", href: "#product", primary: true },
    ],
  },
  {
    id: "booking-page",
    title: "Booking page",
    description: "Compacte high-conversion pagina om direct een call in te plannen.",
    blocks: [
      { type: "heading", level: 2, text: "Wat we samen helder krijgen in deze call" },
      {
        type: "text",
        content:
          "Beschrijf wat iemand mag verwachten, voor wie de call geschikt is en wat het beste vervolg daarna is.",
      },
      { type: "calendly", embedUrl: "https://calendly.com/sixtine-ophoff/15min" },
      { type: "cta", label: "Plan mijn gesprek", href: "#call", primary: true },
    ],
  },
];

function FieldShell({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
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
  embedded = false,
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
  embedded?: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const imageInputId = useId();
  const [saving, setSaving] = useState(false);
  const [uploadingBlockId, setUploadingBlockId] = useState<string | null>(null);
  const [title, setTitle] = useState(initialTitle);
  const [slug, setSlug] = useState(initialSlug);
  const [headline, setHeadline] = useState(initialHeadline);
  const [subheadline, setSubheadline] = useState(initialSubheadline);
  const [isPublished, setIsPublished] = useState(initialIsPublished);
  const [shopifyStoreDomain, setShopifyStoreDomain] = useState(initialShopifyStoreDomain);
  const [shopifyStorefrontToken, setShopifyStorefrontToken] = useState(initialShopifyStorefrontToken);
  const [blocks, setBlocks] = useState<Block[]>(
    initialBlocks.map((block) => {
      const current = block as unknown as Block;
      return { ...current, id: current.id || generateId() };
    })
  );
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [draggedLibraryType, setDraggedLibraryType] = useState<BlockType | null>(null);
  const [libraryDropIndex, setLibraryDropIndex] = useState<number | null>(null);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/landing-pages/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          slug: normalizeSlug(slug),
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
      setSlug(normalizeSlug(slug));
      toast({ title: "Opgeslagen", description: "Je pagina is bijgewerkt." });
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
    setBlocks((prev) => [...prev, createBlock(type)]);
  };

  const insertBlockAtIndex = (type: BlockType, targetIndex: number) => {
    setBlocks((prev) => {
      const next = [...prev];
      const boundedIndex = Math.max(0, Math.min(targetIndex, next.length));
      next.splice(boundedIndex, 0, createBlock(type));
      return next;
    });
  };

  const applyPreset = (preset: PagePreset) => {
    setBlocks(preset.blocks.map((block) => ({ ...block, id: generateId() })));
    toast({
      title: "Preset toegevoegd",
      description: `${preset.title} staat nu als basis in je builder.`,
    });
  };

  const updateBlock = (index: number, updates: Partial<Block>) => {
    setBlocks((prev) => prev.map((block, currentIndex) => (currentIndex === index ? { ...block, ...updates } : block)));
  };

  const removeBlock = (index: number) => {
    setBlocks((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
  };

  const moveBlock = (index: number, direction: "up" | "down") => {
    const next = [...blocks];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= next.length) return;
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    setBlocks(next);
  };

  const moveBlockToIndex = (blockId: string, targetIndex: number) => {
    setBlocks((current) => {
      const fromIndex = current.findIndex((block) => block.id === blockId);
      if (fromIndex === -1 || fromIndex === targetIndex) {
        return current;
      }

      const next = [...current];
      const [movedBlock] = next.splice(fromIndex, 1);
      next.splice(targetIndex, 0, movedBlock);
      return next;
    });
  };

  const handleBlockDragStart = (event: DragEvent<HTMLDivElement>, blockId: string) => {
    setDraggedBlockId(blockId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", blockId);
  };

  const handleBlockDragOver = (event: DragEvent<HTMLDivElement>, blockId: string) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (dropTargetId !== blockId) {
      setDropTargetId(blockId);
    }
  };

  const handleBlockDrop = (event: DragEvent<HTMLDivElement>, targetIndex: number) => {
    event.preventDefault();
    const blockId = event.dataTransfer.getData("text/plain") || draggedBlockId;
    if (blockId) {
      moveBlockToIndex(blockId, targetIndex);
    }
    setDraggedBlockId(null);
    setDropTargetId(null);
  };

  const handleBlockDragEnd = () => {
    setDraggedBlockId(null);
    setDropTargetId(null);
  };

  const handleLibraryDragStart = (event: DragEvent<HTMLButtonElement>, type: BlockType) => {
    setDraggedLibraryType(type);
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData("application/x-landing-library-type", type);
  };

  const handleLibraryDragEnd = () => {
    setDraggedLibraryType(null);
    setLibraryDropIndex(null);
  };

  const handleLibraryDragOver = (event: DragEvent<HTMLDivElement>, targetIndex: number) => {
    const libraryType = event.dataTransfer.getData("application/x-landing-library-type");
    if (!libraryType && !draggedLibraryType) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    if (libraryDropIndex !== targetIndex) {
      setLibraryDropIndex(targetIndex);
    }
  };

  const handleLibraryDrop = (event: DragEvent<HTMLDivElement>, targetIndex: number) => {
    const libraryType = (event.dataTransfer.getData("application/x-landing-library-type") || draggedLibraryType) as BlockType | null;
    if (!libraryType) return;
    event.preventDefault();
    insertBlockAtIndex(libraryType, targetIndex);
    setDraggedLibraryType(null);
    setLibraryDropIndex(null);
  };

  const clearLibraryDropState = () => {
    setLibraryDropIndex(null);
  };

  const uploadImageForBlock = async (event: ChangeEvent<HTMLInputElement>, blockId: string) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingBlockId(blockId);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Upload mislukt");
      }
      setBlocks((prev) =>
        prev.map((block) => (block.id === blockId ? { ...block, url: result.url, alt: block.alt || file.name } : block))
      );
      toast({
        title: "Afbeelding toegevoegd",
        description: "De afbeelding staat nu in je pagina-preview.",
      });
    } catch (error) {
      toast({
        title: "Upload mislukt",
        description: error instanceof Error ? error.message : "Kon afbeelding niet uploaden",
        variant: "destructive",
      });
    } finally {
      event.target.value = "";
      setUploadingBlockId(null);
    }
  };

  return (
    <div className={embedded ? "" : "min-h-screen bg-[linear-gradient(180deg,#f6f1e7_0%,#fbfaf6_28%,#ffffff_100%)]"}>
      <input
        id={imageInputId}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        onChange={(event) => {
          const blockId = event.currentTarget.dataset.blockId;
          if (!blockId) return;
          void uploadImageForBlock(event, blockId);
        }}
      />

      <div className={embedded ? "" : "mx-auto max-w-7xl p-4 md:p-6 lg:p-8"}>
        {embedded ? null : (
          <div className="app-panel app-halo overflow-hidden">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <Link
                  href="/admin/landing-pages"
                  className="inline-flex items-center text-sm text-muted-foreground transition hover:text-foreground"
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Terug naar landingpagina&apos;s
                </Link>
                <div className="mt-4">
                  <p className="app-kicker">Page builder</p>
                  <h1 className="mt-3 font-display text-3xl tracking-tight text-stone-900 md:text-5xl">
                    {headline || title || "Landing page"}
                  </h1>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-600 md:text-base">
                    Bouw je pagina in secties, bekijk rechts meteen hoe ze eruitziet en publiceer pas wanneer de flow overtuigend voelt.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {isPublished ? (
                  <Button variant="outline" asChild className="rounded-full">
                    <Link href={`/landing/${normalizeSlug(slug)}`} target="_blank" rel="noopener">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Live bekijken
                    </Link>
                  </Button>
                ) : null}
                <Button onClick={save} disabled={saving} className="rounded-full px-6">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Opslaan"}
                </Button>
              </div>
            </div>
          </div>
        )}

        <div
          className={
            embedded
              ? "grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)_420px]"
              : "mt-8 grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)_420px]"
          }
        >
          <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
            <Card className="hidden xl:block app-halo">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Rows3 className="h-5 w-5 text-primary" />
                  Section library
                </CardTitle>
                <CardDescription>
                  Add sections from the left while you build, so every building block stays visible.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                {(["heading", "text", "image", "video", "product", "calendly", "cta", "testimonials", "faq", "pricing"] as BlockType[]).map((type) => (
                  <button
                    key={`sidebar-${type}`}
                    type="button"
                    onClick={() => addBlock(type)}
                    draggable
                    onDragStart={(event) => handleLibraryDragStart(event, type)}
                    onDragEnd={handleLibraryDragEnd}
                    className="app-panel-muted p-4 text-left shadow-none transition hover:border-primary/30 hover:bg-white"
                  >
                    <div className="flex items-center gap-2 text-sm font-medium text-stone-900">
                      <Plus className="h-4 w-4 text-primary" />
                      {BLOCK_LABELS[type]}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-stone-600">{BLOCK_DESCRIPTIONS[type]}</p>
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card className="hidden xl:block app-halo">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Starter presets
                </CardTitle>
                <CardDescription>
                  Start from a ready-made conversion flow and refine it in the center column.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                {PAGE_PRESETS.map((preset) => (
                  <button
                    key={`sidebar-preset-${preset.id}`}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className="app-panel-muted p-4 text-left shadow-none transition hover:border-primary/30 hover:bg-white"
                  >
                    <div className="flex items-center gap-2 text-sm font-medium text-stone-900">
                      <Sparkles className="h-4 w-4 text-primary" />
                      {preset.title}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-stone-600">{preset.description}</p>
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {embedded ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.6rem] border border-border bg-background/90 p-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Editor status</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Werk de pagina hier uit en gebruik de andere tabs voor analytics, tracking en delivery.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {isPublished ? (
                    <Button variant="outline" asChild>
                      <Link href={`/landing/${normalizeSlug(slug)}`} target="_blank" rel="noopener">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Preview
                      </Link>
                    </Button>
                  ) : null}
                  <Button onClick={save} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Opslaan"}
                  </Button>
                </div>
              </div>
            ) : null}
            <Card className="app-halo">
              <CardHeader>
                <CardTitle>Pagina instellingen</CardTitle>
                <CardDescription>Bepaal titel, URL, hero en publicatiestatus.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <FieldShell label="Titel">
                    <Input value={title} onChange={(event) => setTitle(event.target.value)} />
                  </FieldShell>
                  <FieldShell label="Slug">
                    <Input value={slug} onChange={(event) => setSlug(normalizeSlug(event.target.value))} />
                  </FieldShell>
                </div>
                <div className="app-panel-muted px-4 py-3 text-sm text-stone-600 shadow-none">
                  Publieke URL: <span className="font-medium text-stone-900">/landing/{normalizeSlug(slug) || "jouw-pagina"}</span>
                </div>
                <FieldShell label="Hero headline">
                  <Input value={headline} onChange={(event) => setHeadline(event.target.value)} placeholder="Een duidelijke belofte of resultaat" />
                </FieldShell>
                <FieldShell label="Hero subheadline">
                  <textarea
                    className="min-h-[100px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    value={subheadline}
                    onChange={(event) => setSubheadline(event.target.value)}
                    placeholder="Leg in 2 à 3 zinnen uit voor wie de pagina is en wat de volgende stap is."
                  />
                </FieldShell>
                <div className="app-panel-muted flex items-center justify-between gap-4 px-4 py-4 shadow-none">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-stone-900">Pagina live zetten</p>
                    <p className="text-sm text-stone-600">
                      Publiceer alleen wanneer deze versie klaar is voor verkeer.
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-3">
                    <span className={`text-sm font-medium ${isPublished ? "text-emerald-700" : "text-stone-500"}`}>
                      {isPublished ? "Live" : "Concept"}
                    </span>
                    <Switch
                      checked={isPublished}
                      onCheckedChange={setIsPublished}
                      ariaLabel="Pagina live zetten"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="app-halo">
              <CardHeader>
                <CardTitle>Verkoop en embeds</CardTitle>
                <CardDescription>Gebruik dit alleen wanneer je productblokken met Shopify of een Calendly-call toevoegt.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <FieldShell label="Shopify store domain">
                  <Input
                    value={shopifyStoreDomain}
                    onChange={(event) => setShopifyStoreDomain(event.target.value)}
                    placeholder="jouw-winkel"
                  />
                </FieldShell>
                <FieldShell label="Shopify Storefront token">
                  <Input
                    type="password"
                    value={shopifyStorefrontToken}
                    onChange={(event) => setShopifyStorefrontToken(event.target.value)}
                    placeholder="shpat_..."
                  />
                </FieldShell>
              </CardContent>
            </Card>

            <Card className="app-halo">
              <CardHeader>
                <CardTitle>Snelle start layouts</CardTitle>
                <CardDescription>Begin niet blanco. Kies een conversieflow en vervang daarna de inhoud.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 lg:grid-cols-3">
                {PAGE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className="app-panel-muted p-4 text-left shadow-none transition hover:border-primary/30 hover:bg-white"
                  >
                    <div className="flex items-center gap-2 text-sm font-medium text-stone-900">
                      <Sparkles className="h-4 w-4 text-primary" />
                      {preset.title}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-stone-600">{preset.description}</p>
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card className="app-halo xl:hidden">
              <CardHeader>
                <CardTitle>Secties toevoegen</CardTitle>
                <CardDescription>Kies het soort blok dat je wil toevoegen. Je kunt de volgorde later nog aanpassen.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {(["heading", "text", "image", "video", "product", "calendly", "cta", "testimonials", "faq", "pricing"] as BlockType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => addBlock(type)}
                    className="app-panel-muted p-4 text-left shadow-none transition hover:border-primary/30 hover:bg-white"
                  >
                    <div className="flex items-center gap-2 text-sm font-medium text-stone-900">
                      <Plus className="h-4 w-4 text-primary" />
                      {BLOCK_LABELS[type]}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-stone-600">{BLOCK_DESCRIPTIONS[type]}</p>
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card className="app-halo">
              <CardHeader>
                <CardTitle>Blokken in je pagina</CardTitle>
                <CardDescription>Werk per sectie de inhoud uit en sleep blokken in de juiste volgorde zoals in een echte funnel-builder.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {blocks.length === 0 ? (
                  <div
                    onDragOver={(event) => handleLibraryDragOver(event, 0)}
                    onDrop={(event) => handleLibraryDrop(event, 0)}
                    onDragLeave={clearLibraryDropState}
                    className={`rounded-[1.5rem] border border-dashed p-8 text-center text-sm transition ${
                      libraryDropIndex === 0
                        ? "border-primary bg-white text-stone-900"
                        : "border-stone-300 bg-stone-50 text-stone-600"
                    }`}
                  >
                    {libraryDropIndex === 0
                      ? "Laat hier los om je eerste sectie toe te voegen."
                      : "Nog geen blokken toegevoegd. Start met een kop, tekst of video om de eerste versie van je pagina op te zetten."}
                  </div>
                ) : (
                  blocks.map((block, index) => (
                    <div key={block.id || index} className="space-y-3">
                      <div
                        onDragOver={(event) => handleLibraryDragOver(event, index)}
                        onDrop={(event) => handleLibraryDrop(event, index)}
                        onDragLeave={clearLibraryDropState}
                        className={`rounded-2xl border border-dashed px-4 py-3 text-xs font-medium uppercase tracking-[0.18em] transition ${
                          libraryDropIndex === index
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-transparent bg-transparent text-transparent"
                        }`}
                      >
                        Drop section here
                      </div>
                      <div
                        draggable
                        onDragStart={(event) => handleBlockDragStart(event, block.id || String(index))}
                        onDragOver={(event) => handleBlockDragOver(event, block.id || String(index))}
                        onDrop={(event) => handleBlockDrop(event, index)}
                        onDragEnd={handleBlockDragEnd}
                        className={`app-panel-muted p-5 shadow-none transition-all ${
                          draggedBlockId === (block.id || String(index)) ? "opacity-60" : ""
                        } ${
                          dropTargetId === (block.id || String(index))
                            ? "border-primary/40 bg-white"
                            : ""
                        }`}
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 cursor-grab items-center justify-center rounded-2xl bg-white text-stone-500 active:cursor-grabbing">
                            <GripVertical className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium text-stone-900">{BLOCK_LABELS[block.type]}</p>
                            <p className="text-sm text-stone-600">{BLOCK_DESCRIPTIONS[block.type]}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" variant="ghost" size="sm" onClick={() => moveBlock(index, "up")} disabled={index === 0}>
                            ↑
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => moveBlock(index, "down")}
                            disabled={index === blocks.length - 1}
                          >
                            ↓
                          </Button>
                          <Button type="button" variant="ghost" size="sm" onClick={() => removeBlock(index)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                        </div>

                        <div className="mt-5 space-y-4">
                        {block.type === "heading" ? (
                          <>
                            <FieldShell label="Niveau">
                              <select
                                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                                value={block.level ?? 2}
                                onChange={(event) => updateBlock(index, { level: Number(event.target.value) || 2 })}
                              >
                                <option value={1}>H1</option>
                                <option value={2}>H2</option>
                                <option value={3}>H3</option>
                              </select>
                            </FieldShell>
                            <FieldShell label="Tekst">
                              <Input value={block.text ?? ""} onChange={(event) => updateBlock(index, { text: event.target.value })} />
                            </FieldShell>
                          </>
                        ) : null}

                        {block.type === "text" ? (
                          <FieldShell label="Inhoud">
                            <textarea
                              className="min-h-[140px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                              value={block.content ?? ""}
                              onChange={(event) => updateBlock(index, { content: event.target.value })}
                            />
                          </FieldShell>
                        ) : null}

                        {block.type === "image" ? (
                          <>
                            <div className="flex flex-wrap gap-3">
                              <Button
                                type="button"
                                variant="outline"
                                className="rounded-full"
                                asChild
                                disabled={uploadingBlockId === block.id}
                              >
                                <label
                                  htmlFor={imageInputId}
                                  onClick={() => {
                                    const input = document.getElementById(imageInputId) as HTMLInputElement | null;
                                    if (input && block.id) {
                                      input.dataset.blockId = block.id;
                                    }
                                  }}
                                  className="cursor-pointer"
                                >
                                  {uploadingBlockId === block.id ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  ) : (
                                    <Upload className="mr-2 h-4 w-4" />
                                  )}
                                  Upload afbeelding
                                </label>
                              </Button>
                              <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm text-stone-600">
                                <ImagePlus className="h-4 w-4" />
                                Of plak hieronder een URL
                              </div>
                            </div>
                            <FieldShell label="Afbeelding URL">
                              <Input
                                value={block.url ?? ""}
                                onChange={(event) => updateBlock(index, { url: event.target.value })}
                                placeholder="https://... of /uploads/..."
                              />
                            </FieldShell>
                            <FieldShell label="Alt-tekst">
                              <Input value={block.alt ?? ""} onChange={(event) => updateBlock(index, { alt: event.target.value })} />
                            </FieldShell>
                          </>
                        ) : null}

                        {block.type === "video" ? (
                          <>
                            <FieldShell label="Provider">
                              <select
                                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                                value={block.provider ?? "vimeo"}
                                onChange={(event) => updateBlock(index, { provider: event.target.value as "vimeo" | "loom" })}
                              >
                                <option value="vimeo">Vimeo</option>
                                <option value="loom">Loom</option>
                              </select>
                            </FieldShell>
                            <FieldShell label="Video ID">
                              <Input
                                value={block.videoId ?? ""}
                                onChange={(event) => updateBlock(index, { videoId: event.target.value })}
                                placeholder="Bij Vimeo: 123456789"
                              />
                            </FieldShell>
                          </>
                        ) : null}

                        {block.type === "product" ? (
                          <FieldShell label="Shopify product handle">
                            <Input
                              value={block.productHandle ?? ""}
                              onChange={(event) => updateBlock(index, { productHandle: event.target.value })}
                              placeholder="bijvoorbeeld: detox-reset"
                            />
                          </FieldShell>
                        ) : null}

                        {block.type === "calendly" ? (
                          <FieldShell label="Calendly URL">
                            <Input
                              value={block.embedUrl ?? ""}
                              onChange={(event) => updateBlock(index, { embedUrl: event.target.value })}
                              placeholder="https://calendly.com/..."
                            />
                          </FieldShell>
                        ) : null}

                        {block.type === "cta" ? (
                          <>
                            <FieldShell label="Knoptekst">
                              <Input value={block.label ?? ""} onChange={(event) => updateBlock(index, { label: event.target.value })} />
                            </FieldShell>
                            <FieldShell label="Link">
                              <Input
                                value={block.href ?? ""}
                                onChange={(event) => updateBlock(index, { href: event.target.value })}
                                placeholder="https://... of #product"
                              />
                            </FieldShell>
                            <label className="inline-flex items-center gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3">
                              <input
                                type="checkbox"
                                checked={block.primary ?? true}
                                onChange={(event) => updateBlock(index, { primary: event.target.checked })}
                                className="h-4 w-4 rounded border-input"
                              />
                              <span className="text-sm text-stone-700">Primaire knopstijl gebruiken</span>
                            </label>
                          </>
                        ) : null}

                        {block.type === "testimonials" ? (
                          <div className="space-y-3">
                            {(block.items ?? []).map((item, itemIndex) => (
                              <div key={`testimonial-${itemIndex}`} className="rounded-2xl border border-stone-200 bg-white p-4">
                                <FieldShell label="Quote">
                                  <textarea
                                    className="min-h-[100px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                                    value={item.quote ?? ""}
                                    onChange={(event) =>
                                      updateBlock(index, {
                                        items: (block.items ?? []).map((currentItem, currentIndex) =>
                                          currentIndex === itemIndex ? { ...currentItem, quote: event.target.value } : currentItem
                                        ),
                                      })
                                    }
                                  />
                                </FieldShell>
                                <div className="mt-4 grid gap-4 md:grid-cols-2">
                                  <FieldShell label="Naam">
                                    <Input
                                      value={item.name ?? ""}
                                      onChange={(event) =>
                                        updateBlock(index, {
                                          items: (block.items ?? []).map((currentItem, currentIndex) =>
                                            currentIndex === itemIndex ? { ...currentItem, name: event.target.value } : currentItem
                                          ),
                                        })
                                      }
                                    />
                                  </FieldShell>
                                  <FieldShell label="Rol / context">
                                    <Input
                                      value={item.role ?? ""}
                                      onChange={(event) =>
                                        updateBlock(index, {
                                          items: (block.items ?? []).map((currentItem, currentIndex) =>
                                            currentIndex === itemIndex ? { ...currentItem, role: event.target.value } : currentItem
                                          ),
                                        })
                                      }
                                    />
                                  </FieldShell>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : null}

                        {block.type === "faq" ? (
                          <div className="space-y-3">
                            {(block.items ?? []).map((item, itemIndex) => (
                              <div key={`faq-${itemIndex}`} className="rounded-2xl border border-stone-200 bg-white p-4">
                                <FieldShell label="Vraag">
                                  <Input
                                    value={item.question ?? ""}
                                    onChange={(event) =>
                                      updateBlock(index, {
                                        items: (block.items ?? []).map((currentItem, currentIndex) =>
                                          currentIndex === itemIndex ? { ...currentItem, question: event.target.value } : currentItem
                                        ),
                                      })
                                    }
                                  />
                                </FieldShell>
                                <FieldShell label="Antwoord">
                                  <textarea
                                    className="min-h-[100px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                                    value={item.answer ?? ""}
                                    onChange={(event) =>
                                      updateBlock(index, {
                                        items: (block.items ?? []).map((currentItem, currentIndex) =>
                                          currentIndex === itemIndex ? { ...currentItem, answer: event.target.value } : currentItem
                                        ),
                                      })
                                    }
                                  />
                                </FieldShell>
                              </div>
                            ))}
                          </div>
                        ) : null}

                        {block.type === "pricing" ? (
                          <>
                            <div className="grid gap-4 md:grid-cols-3">
                              <FieldShell label="Titel">
                                <Input value={block.title ?? ""} onChange={(event) => updateBlock(index, { title: event.target.value })} />
                              </FieldShell>
                              <FieldShell label="Prijs">
                                <Input value={block.price ?? ""} onChange={(event) => updateBlock(index, { price: event.target.value })} />
                              </FieldShell>
                              <FieldShell label="Prijs suffix">
                                <Input
                                  value={block.priceSuffix ?? ""}
                                  onChange={(event) => updateBlock(index, { priceSuffix: event.target.value })}
                                  placeholder="eenmalig / per maand"
                                />
                              </FieldShell>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                              <FieldShell label="Knoptekst">
                                <Input
                                  value={block.buttonLabel ?? ""}
                                  onChange={(event) => updateBlock(index, { buttonLabel: event.target.value })}
                                />
                              </FieldShell>
                              <FieldShell label="Knoplink">
                                <Input
                                  value={block.buttonHref ?? ""}
                                  onChange={(event) => updateBlock(index, { buttonHref: event.target.value })}
                                />
                              </FieldShell>
                            </div>
                            <div className="space-y-3">
                              {(block.items ?? []).map((item, itemIndex) => (
                                <FieldShell key={`pricing-${itemIndex}`} label={`Feature ${itemIndex + 1}`}>
                                  <Input
                                    value={item.text ?? ""}
                                    onChange={(event) =>
                                      updateBlock(index, {
                                        items: (block.items ?? []).map((currentItem, currentIndex) =>
                                          currentIndex === itemIndex ? { ...currentItem, text: event.target.value } : currentItem
                                        ),
                                      })
                                    }
                                  />
                                </FieldShell>
                              ))}
                            </div>
                          </>
                        ) : null}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                {blocks.length > 0 ? (
                  <div
                    onDragOver={(event) => handleLibraryDragOver(event, blocks.length)}
                    onDrop={(event) => handleLibraryDrop(event, blocks.length)}
                    onDragLeave={clearLibraryDropState}
                    className={`rounded-2xl border border-dashed px-4 py-3 text-xs font-medium uppercase tracking-[0.18em] transition ${
                      libraryDropIndex === blocks.length
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-transparent bg-transparent text-transparent"
                    }`}
                  >
                    Drop section here
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
            <Card className="overflow-hidden rounded-[2rem] border border-stone-900/80 bg-stone-950 text-stone-100 shadow-[0_30px_90px_-50px_rgba(0,0,0,0.7)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <MonitorSmartphone className="h-5 w-5" />
                  Live preview
                </CardTitle>
                <CardDescription className="text-stone-400">
                  Dit is hoe de pagina nu ongeveer aanvoelt voor een bezoeker.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-[1.75rem] bg-white p-4 text-stone-900">
                  <div className="rounded-[1.5rem] bg-[linear-gradient(135deg,#f7f2e7_0%,#fffdf8_55%,#efe3c5_100%)] px-5 py-7">
                    <p className="text-xs uppercase tracking-[0.18em] text-stone-500">Landing page</p>
                    <h2 className="mt-3 text-2xl font-semibold">{headline || "Je hero headline"}</h2>
                    <p className="mt-3 text-sm leading-6 text-stone-600">
                      {subheadline || "Je subheadline verschijnt hier en helpt de bezoeker meteen begrijpen wat de belofte van deze pagina is."}
                    </p>
                    <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-stone-950 px-4 py-2 text-sm font-medium text-white">
                      <Rocket className="h-4 w-4" />
                      Voorbeeld CTA
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    {blocks.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-stone-300 px-4 py-6 text-center text-sm text-stone-500">
                        Voeg links blokken toe om je preview op te bouwen.
                      </div>
                    ) : (
                      blocks.map((block, index) => (
                        <PreviewBlock key={block.id || index} block={block} />
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-2xl bg-white/5 p-4 text-sm text-stone-300">
                  <div className="flex items-center gap-2 font-medium text-white">
                    <Rows3 className="h-4 w-4" />
                    Builder tip
                  </div>
                  <p className="mt-2 leading-6">
                    Een sterke flow is meestal: hero, probleem/resultaat, bewijs of video, aanbod en dan pas je CTA of boekingsblok. Sleep de blokken links om die volgorde snel te testen.
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

function PreviewBlock({ block }: { block: Block }) {
  if (block.type === "heading") {
    const level = block.level ?? 2;
    const className =
      level === 1
        ? "text-2xl font-semibold"
        : level === 3
          ? "text-lg font-semibold"
          : "text-xl font-semibold";
    return <div className={className}>{block.text || "Nieuwe sectiekop"}</div>;
  }

  if (block.type === "text") {
    return <div className="rounded-2xl bg-stone-50 px-4 py-4 text-sm leading-6 text-stone-600">{block.content || "Tekstblok"}</div>;
  }

  if (block.type === "image") {
    return block.url ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={block.url} alt={block.alt || ""} className="w-full rounded-2xl border border-stone-200 object-cover" />
    ) : (
      <div className="flex min-h-[160px] items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-stone-50 text-sm text-stone-500">
        Afbeelding placeholder
      </div>
    );
  }

  if (block.type === "video") {
    return (
      <div className="flex min-h-[180px] items-center justify-center rounded-2xl bg-stone-950 text-center text-stone-200">
        <div>
          <Video className="mx-auto h-8 w-8" />
          <p className="mt-3 text-sm">{block.provider === "loom" ? "Loom-video" : "Vimeo-video"}</p>
        </div>
      </div>
    );
  }

  if (block.type === "product") {
    return (
      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-stone-900">
          <ShoppingBag className="h-4 w-4" />
          Productblok
        </div>
        <p className="mt-2 text-sm text-stone-600">{block.productHandle || "Voeg een Shopify product handle toe."}</p>
      </div>
    );
  }

  if (block.type === "calendly") {
    return (
      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-600">
        Calendly embed: {block.embedUrl || "Nog geen URL ingesteld"}
      </div>
    );
  }

  if (block.type === "cta") {
    return (
      <div
        className={`inline-flex rounded-full px-5 py-3 text-sm font-medium ${
          block.primary === false ? "border border-stone-300 text-stone-700" : "bg-stone-950 text-white"
        }`}
      >
        {block.label || "CTA knop"}
      </div>
    );
  }

  if (block.type === "testimonials") {
    return (
      <div className="grid gap-3">
        {(block.items ?? []).map((item, itemIndex) => (
          <div key={`preview-testimonial-${itemIndex}`} className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
            <p className="text-sm leading-6 text-stone-700">“{item.quote || "Voeg testimonial quote toe."}”</p>
            <p className="mt-3 text-xs text-stone-500">
              <span className="font-medium text-stone-900">{item.name || "Naam klant"}</span>
              {item.role ? ` · ${item.role}` : ""}
            </p>
          </div>
        ))}
      </div>
    );
  }

  if (block.type === "faq") {
    return (
      <div className="space-y-3">
        {(block.items ?? []).map((item, itemIndex) => (
          <div key={`preview-faq-${itemIndex}`} className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
            <p className="text-sm font-semibold text-stone-900">{item.question || "Veelgestelde vraag"}</p>
            <p className="mt-2 text-sm leading-6 text-stone-600">{item.answer || "Antwoord komt hier."}</p>
          </div>
        ))}
      </div>
    );
  }

  if (block.type === "pricing") {
    return (
      <div className="rounded-2xl bg-stone-950 px-5 py-5 text-white">
        <p className="text-xs uppercase tracking-[0.18em] text-white/60">{block.title || "Investment"}</p>
        <div className="mt-3 flex items-end gap-2">
          <p className="text-3xl font-semibold">{block.price || "€297"}</p>
          <p className="pb-1 text-xs text-white/60">{block.priceSuffix || "eenmalig"}</p>
        </div>
        <div className="mt-4 space-y-2 text-sm text-white/80">
          {(block.items ?? []).map((item, itemIndex) => (
            <p key={`preview-price-${itemIndex}`}>• {item.text || "Feature"}</p>
          ))}
        </div>
        <div className="mt-5 inline-flex rounded-full bg-white px-4 py-2 text-sm font-medium text-stone-950">
          {block.buttonLabel || "Start nu"}
        </div>
      </div>
    );
  }

  return null;
}
