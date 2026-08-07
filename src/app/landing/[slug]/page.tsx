import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { DEFAULT_BRANDING } from "@/lib/branding";
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(228,186,124,0.24),_transparent_32%),linear-gradient(180deg,#f7f3ea_0%,#fffdf9_30%,#ffffff_100%)] text-stone-900">
      <header className="sticky top-0 z-50 border-b border-stone-200/80 bg-white/88 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 md:px-8">
          <Link href="/" className="font-display text-lg font-semibold tracking-[0.04em] text-stone-900">
            {DEFAULT_BRANDING.platformName}
          </Link>
          <nav className="hidden items-center gap-5 text-sm text-stone-600 md:flex">
            {blocks.some((block) => block.type === "video") ? <a href="#video">Video</a> : null}
            {blocks.some((block) => block.type === "product") ? <a href="#product">Aanbod</a> : null}
            {blocks.some((block) => block.type === "calendly") ? <a href="#call">Kennismaking</a> : null}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-10 md:px-8 md:py-14">
        {(page.headline || page.subheadline) ? (
          <section className="overflow-hidden rounded-[2.5rem] border border-white/70 bg-[linear-gradient(135deg,rgba(245,239,227,0.96)_0%,rgba(255,253,250,0.98)_56%,rgba(234,223,202,0.92)_100%)] px-6 py-12 shadow-[0_30px_100px_-55px_rgba(0,0,0,0.38)] md:px-10 md:py-16">
            <div className="max-w-3xl">
              <p className="app-kicker">Simply leeromgeving</p>
              {page.headline ? (
                <h1 className="mt-4 font-display text-4xl tracking-tight text-stone-900 md:text-6xl">
                  {page.headline}
                </h1>
              ) : null}
              {page.subheadline ? (
                <p className="mt-5 max-w-2xl text-lg leading-8 text-stone-600 md:text-xl">
                  {page.subheadline}
                </p>
              ) : null}
            </div>
          </section>
        ) : null}

        <div className="mt-10 space-y-8">
          {blocks.map((block, index) => (
            <BlockRenderer
              key={`${block.type}-${index}`}
              block={block}
              index={index}
              shopifyStoreDomain={page.shopifyStoreDomain}
              shopifyStorefrontToken={page.shopifyStorefrontToken}
            />
          ))}
        </div>
      </main>

      <footer className="border-t border-stone-200/80 py-8 text-center text-sm text-stone-500">
        <div className="mx-auto max-w-6xl px-5 md:px-8">
          © {DEFAULT_BRANDING.platformName}. Alle rechten voorbehouden.
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
    const className =
      level === 1
        ? "font-display text-4xl tracking-[0.04em] text-stone-900"
        : level === 3
          ? "font-display text-xl tracking-[0.04em] text-stone-900"
          : "font-display text-3xl tracking-[0.04em] text-stone-900";

    return (
      <section className="px-1">
        <Tag className={className}>{text}</Tag>
      </section>
    );
  }

  if (block.type === "text") {
    return (
      <section className="rounded-[2rem] border border-white/70 bg-white/92 px-6 py-6 shadow-[0_20px_70px_-55px_rgba(0,0,0,0.32)] backdrop-blur md:px-8">
        <div
          className="whitespace-pre-wrap text-base leading-8 text-stone-700"
          dangerouslySetInnerHTML={{
            __html: (block.content || "").replace(/\n/g, "<br />"),
          }}
        />
      </section>
    );
  }

  if (block.type === "image" && block.url) {
    return (
      <section>
        <figure className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/92 shadow-[0_20px_70px_-55px_rgba(0,0,0,0.32)] backdrop-blur">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={block.url} alt={block.alt || ""} className="h-auto w-full object-cover" />
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
      <section id={index === 0 ? "video" : undefined} className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/92 p-3 shadow-[0_20px_70px_-55px_rgba(0,0,0,0.32)] backdrop-blur md:p-5">
        <div className="relative w-full overflow-hidden rounded-[1.5rem] bg-black" style={{ paddingBottom: "56.25%" }}>
          <iframe src={src} className="absolute inset-0 h-full w-full" allowFullScreen title="Video" />
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
        <section id="product" className="rounded-[2rem] border border-stone-200 bg-white p-6 text-sm text-stone-500 shadow-[0_20px_70px_-55px_rgba(0,0,0,0.32)]">
          Product kon niet worden geladen. Controleer de product-handle en Shopify-instellingen.
        </section>
      );
    }

    const checkoutUrl = `https://${shopifyStoreDomain}.myshopify.com/cart/${productData.variantId}:1`;

    return (
        <section id="product" className="rounded-[2rem] border border-white/70 bg-white/92 p-6 shadow-[0_20px_70px_-55px_rgba(0,0,0,0.32)] backdrop-blur md:p-8">
        <div className="max-w-2xl">
          <p className="text-xs uppercase tracking-[0.18em] text-stone-500">Aanbod</p>
          <h3 className="mt-3 font-display text-3xl tracking-[0.04em] text-stone-900">{productData.title}</h3>
          {productData.descriptionHtml ? (
            <div
              className="prose prose-stone mt-4 max-w-none text-sm"
              dangerouslySetInnerHTML={{ __html: productData.descriptionHtml }}
            />
          ) : null}
          <p className="mt-5 text-3xl font-semibold text-stone-900">{productData.price}</p>
          <a
            href={checkoutUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-stone-950 px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Direct kopen
          </a>
        </div>
      </section>
    );
  }

  if (block.type === "calendly" && block.embedUrl) {
    const url = block.embedUrl.trim();
    const embedSrc = url + (url.includes("?") ? "&" : "?") + "hide_landing_page_details=1";
    return (
      <section id="call" className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/92 shadow-[0_20px_70px_-55px_rgba(0,0,0,0.32)] backdrop-blur">
        <iframe src={embedSrc} width="100%" height="680" className="border-0" title="Calendly" />
      </section>
    );
  }

  if (block.type === "cta" && block.label) {
    return (
      <section className="text-center">
        <a
          href={block.href || "#"}
          className={
            block.primary !== false
              ? "inline-flex items-center justify-center rounded-full bg-stone-950 px-7 py-3 text-sm font-semibold text-white transition hover:opacity-90"
              : "inline-flex items-center justify-center rounded-full border border-stone-300 bg-white px-7 py-3 text-sm font-semibold text-stone-800 transition hover:bg-stone-50"
          }
        >
          {block.label}
        </a>
      </section>
    );
  }

  if (block.type === "testimonials" && block.items?.length) {
    return (
      <section className="rounded-[2rem] border border-white/70 bg-white/92 p-6 shadow-[0_20px_70px_-55px_rgba(0,0,0,0.32)] backdrop-blur md:p-8">
        <div className="grid gap-4 md:grid-cols-2">
          {block.items.map((item, itemIndex) => (
            <blockquote key={`${item.name || "testimonial"}-${itemIndex}`} className="rounded-[1.5rem] bg-stone-50 px-5 py-5">
              <p className="text-base leading-7 text-stone-700">“{item.quote || "Voeg testimonial copy toe."}”</p>
              <footer className="mt-4 text-sm text-stone-500">
                <span className="font-medium text-stone-900">{item.name || "Naam klant"}</span>
                {item.role ? ` · ${item.role}` : ""}
              </footer>
            </blockquote>
          ))}
        </div>
      </section>
    );
  }

  if (block.type === "faq" && block.items?.length) {
    return (
      <section className="rounded-[2rem] border border-white/70 bg-white/92 p-6 shadow-[0_20px_70px_-55px_rgba(0,0,0,0.32)] backdrop-blur md:p-8">
        <div className="space-y-4">
          {block.items.map((item, itemIndex) => (
            <div key={`${item.question || "faq"}-${itemIndex}`} className="rounded-[1.5rem] border border-stone-200 bg-white px-5 py-5">
              <h3 className="text-lg font-semibold text-stone-900">{item.question || "Veelgestelde vraag"}</h3>
              <p className="mt-3 text-sm leading-7 text-stone-600">{item.answer || "Beantwoord hier kort en duidelijk de vraag."}</p>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (block.type === "pricing") {
    const featureItems = block.items?.map((item) => item.text).filter(Boolean) ?? [];
    return (
      <section className="rounded-[2rem] border border-stone-900 bg-stone-950 p-6 text-white shadow-[0_20px_70px_-55px_rgba(0,0,0,0.45)] md:p-8">
        <div className="max-w-2xl">
          <p className="text-xs uppercase tracking-[0.18em] text-white/60">{block.title || "Investment"}</p>
          <div className="mt-4 flex items-end gap-2">
            <p className="font-display text-5xl tracking-tight">{block.price || "€297"}</p>
            <p className="pb-2 text-sm text-white/60">{block.priceSuffix || "eenmalig"}</p>
          </div>
          {featureItems.length > 0 ? (
            <ul className="mt-6 space-y-3 text-sm text-white/80">
              {featureItems.map((feature, featureIndex) => (
                <li key={`${feature}-${featureIndex}`}>• {feature}</li>
              ))}
            </ul>
          ) : null}
          {block.buttonLabel ? (
            <a
              href={block.buttonHref || "#"}
              className="mt-8 inline-flex items-center justify-center rounded-full bg-white px-7 py-3 text-sm font-semibold text-stone-950 transition hover:opacity-90"
            >
              {block.buttonLabel}
            </a>
          ) : null}
        </div>
      </section>
    );
  }

  return null;
}
