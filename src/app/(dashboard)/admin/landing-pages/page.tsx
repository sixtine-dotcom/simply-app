import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, ExternalLink, Eye, EyeOff } from "lucide-react";

export default async function AdminLandingPagesPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/");

  const pages = await db.landingPage.findMany({
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="p-6 md:p-8 lg:p-12">
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl tracking-wider">
            LANDING PAGINA&apos;S
          </h1>
          <p className="mt-2 text-muted-foreground">
            Maak en bewerk landingspagina&apos;s met tekst, afbeeldingen, video&apos;s en meer
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/landing-pages/new">
            <Plus className="mr-2 h-4 w-4" />
            Nieuwe landing page
          </Link>
        </Button>
      </div>

      {pages.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground mb-4">
              Nog geen landingpagina&apos;s. Maak er een aan om te beginnen.
            </p>
            <Button asChild>
              <Link href="/admin/landing-pages/new">
                <Plus className="mr-2 h-4 w-4" />
                Eerste landing page maken
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {pages.map((page) => (
            <Card key={page.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  {page.title}
                  {page.isPublished ? (
                    <span className="inline-flex items-center gap-1 text-xs font-normal text-green-600">
                      <Eye className="h-3.5 w-3.5" /> Live
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-normal text-muted-foreground">
                      <EyeOff className="h-3.5 w-3.5" /> Concept
                    </span>
                  )}
                </CardTitle>
                <div className="flex gap-2">
                  {page.isPublished && (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/landing/${page.slug}`} target="_blank" rel="noopener">
                        <ExternalLink className="mr-1 h-4 w-4" />
                        Bekijken
                      </Link>
                    </Button>
                  )}
                  <Button size="sm" asChild>
                    <Link href={`/admin/landing-pages/${page.id}`}>
                      <Pencil className="mr-1 h-4 w-4" />
                      Bewerken
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  /landing/{page.slug}
                  {page.headline && (
                    <> · {page.headline.slice(0, 60)}{page.headline.length > 60 ? "…" : ""}</>
                  )}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
