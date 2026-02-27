import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { LandingPageEditor } from "./landing-page-editor";

export default async function AdminLandingPageEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/");

  const { id } = await params;
  const page = await db.landingPage.findUnique({ where: { id } });
  if (!page) notFound();

  const blocks = Array.isArray(page.blocks) ? page.blocks : [];

  return (
    <LandingPageEditor
      id={page.id}
      initialTitle={page.title}
      initialSlug={page.slug}
      initialHeadline={page.headline ?? ""}
      initialSubheadline={page.subheadline ?? ""}
      initialIsPublished={page.isPublished}
      initialShopifyStoreDomain={page.shopifyStoreDomain ?? ""}
      initialShopifyStorefrontToken={page.shopifyStorefrontToken ?? ""}
      initialBlocks={blocks as Record<string, unknown>[]}
    />
  );
}
