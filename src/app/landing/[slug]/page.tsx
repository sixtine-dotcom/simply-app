import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { getShopifyProductByHandle } from "./shopify-product";

interface Block {
  type: string;
  level?: number;
  text?: string;
  content?: string;
  url?: string;
  alt?: string;
  provider?: string;
  videoId?: string;
  productHandle?: string;
  embedUrl?: string;
  label?: string;
  href?: string;
  primary?: boolean;
}

export default async function PublicLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await db.landingPage.findFirst({
    where: { slug, isPublished: true },
  });

  if (!page) notFound();

  const blocks = (Array.isArray(page.blocks) ? page.blocks : []) as unknown as Block[];

  return (
    <div className="min-h-screen bg-background font-sans">
      <header className="sticky top-0 z-50 border-b bg-background/95">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Link href="/" className="font-semibold text-foreground">
            Simply in Balance
          </Link>
          <nav className="flex gap-4 text-sm text-muted-foreground">
            {blocks.some((b) => b.type === "video") && (
              <a href="#video">Video</a>
            )}
            {blocks.some((b) => b.type === "product") && (
              <a href="#product">Cursus</a>
            )}
            {blocks.some((b) => b.type === "calendly") && (
              <a href="#calendly">Call boeken</a>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 md:py-12">
        {(page.headline || page.subheadline) && (
          <section className="mb-10 text-center">
            {page.headline && (
              <h1 className="font-display text-2xl md:text-3xl font-bold tracking-wide text-foreground">
                {page.headline}
              </h1>
            )}
            {page.subheadline && (
              <p className="mt-2 text-lg text-muted-foreground">
                {page.subheadline}
              </p>
            )}
          </section>
        )}

        <div className="space-y-8">
          {blocks.map((block, index) => (
            <BlockRenderer
              key={index}
              block={block}
              index={index}
              shopifyStoreDomain={page.shopifyStoreDomain}
              shopifyStorefrontToken={page.shopifyStorefrontToken}
            />
          ))}
        </div>
      </main>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        <div className="mx-auto max-w-3xl px-4">
          © Simply in Balance. Alle rechten voorbehouden.
        </div>
      </footer>
    </div>
  );
}

async function BlockRenderer({
  block,
  index,
  shopifyStoreDomain,
  shopifyStorefrontToken,
}: {
  block: Block;
  index: number;
  shopifyStoreDomain: string | null;
  shopifyStorefrontToken: string | null;
}) {
  if (block.type === "heading") {
    const level = Math.min(3, Math.max(1, block.level ?? 2));
    const text = block.text || "";
    const Tag = `h${level}` as keyof JSX.IntrinsicElements;
    return (
      <section>
        <Tag className="font-display text-xl md:text-2xl font-bold text-foreground">
          {text}
        </Tag>
      </section>
    );
  }

  if (block.type === "text") {
    return (
      <section className="prose prose-neutral dark:prose-invert max-w-none">
        <div
          className="whitespace-pre-wrap text-foreground"
          dangerouslySetInnerHTML={{
            __html: (block.content || "")
              .replace(/\n/g, "<br />"),
          }}
        />
      </section>
    );
  }

  if (block.type === "image" && block.url) {
    return (
      <section>
        <figure className="overflow-hidden rounded-lg border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={block.url}
            alt={block.alt || ""}
            className="w-full h-auto object-cover"
          />
        </figure>
      </section>
    );
  }

  if (block.type === "video" && block.videoId) {
    const isLoom = block.provider === "loom";
    const src = isLoom
      ? `https://www.loom.com/embed/${block.videoId}`
      : `https://player.vimeo.com/video/${block.videoId}`;
    return (
      <section id={index === 0 ? "video" : undefined} className="space-y-2">
        <div className="relative w-full rounded-lg overflow-hidden bg-black" style={{ paddingBottom: "56.25%" }}>
          <iframe
            src={src}
            className="absolute inset-0 w-full h-full"
            allowFullScreen
            title="Video"
          />
        </div>
      </section>
    );
  }

  if (block.type === "product" && block.productHandle && shopifyStoreDomain && shopifyStorefrontToken) {
    const productData = await getShopifyProductByHandle(
      shopifyStoreDomain,
      shopifyStorefrontToken,
      block.productHandle
    );
    if (!productData) {
      return (
        <section id="product" className="rounded-lg border p-4 text-muted-foreground text-sm">
          Product kon niet worden geladen. Controleer de product-handle en Shopify-instellingen.
        </section>
      );
    }
    const checkoutUrl = `https://${shopifyStoreDomain}.myshopify.com/cart/${productData.variantId}:1`;
    return (
      <section id="product" className="rounded-lg border bg-card p-6 shadow-sm">
        <h3 className="font-display text-xl font-bold text-foreground">
          {productData.title}
        </h3>
        {productData.descriptionHtml && (
          <div
            className="mt-2 text-muted-foreground text-sm prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: productData.descriptionHtml }}
          />
        )}
        <p className="mt-3 text-xl font-bold text-primary">
          {productData.price}
        </p>
        <a
          href={checkoutUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Direct kopen
        </a>
      </section>
    );
  }

  if (block.type === "calendly" && block.embedUrl) {
    const url = block.embedUrl.trim();
    const embedSrc = url + (url.includes("?") ? "&" : "?") + "hide_landing_page_details=1";
    return (
      <section id="calendly" className="rounded-lg border overflow-hidden bg-muted/30">
        <iframe
          src={embedSrc}
          width="100%"
          height="600"
          className="border-0"
          title="Calendly"
        />
      </section>
    );
  }

  if (block.type === "cta" && block.label) {
    return (
      <section>
        <a
          href={block.href || "#"}
          className={
            block.primary !== false
              ? "inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              : "inline-flex items-center justify-center rounded-md border bg-background px-6 py-3 text-sm font-semibold hover:bg-muted"
          }
        >
          {block.label}
        </a>
      </section>
    );
  }

  return null;
}
