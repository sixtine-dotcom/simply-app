import { notFound } from "next/navigation";
import { requireAdminUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { CarouselEditor, EditorCarousel } from "./carousel-editor";

export const dynamic = "force-dynamic";

export default async function CarouselPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireAdminUser(`/admin/content/carousels/${id}`);
  const carousel = await db.carousel.findFirst({ where: { id, tenantId: user.tenantId ?? null } });
  if (!carousel) notFound();
  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <CarouselEditor initial={JSON.parse(JSON.stringify(carousel)) as EditorCarousel} />
      </div>
    </div>
  );
}
