import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, Camera } from "lucide-react";

interface ProgressPhotosPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminProgressPhotosPage({
  params,
}: ProgressPhotosPageProps) {
  const { id: courseId } = await params;
  const user = await getCurrentUser();

  if (!user || user.role !== "ADMIN") {
    redirect("/");
  }

  const course = await db.course.findUnique({
    where: { id: courseId },
  });

  if (!course) {
    notFound();
  }

  const count = course.photoMomentsCount ?? 0;
  const intervalWeeks = course.photoMomentsIntervalWeeks ?? 0;
  const hasPhotoMoments = count > 0 && intervalWeeks > 0;

  if (!hasPhotoMoments) {
    return (
      <div className="p-6 md:p-8 lg:p-12">
        <Link
          href={`/admin/courses/${courseId}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Terug naar {course.title}
        </Link>
        <Card>
          <CardContent className="py-12 text-center">
            <Camera className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h2 className="font-display text-xl tracking-wider mb-2">
              GEEN FOTOMOMENTEN
            </h2>
            <p className="text-muted-foreground">
              Voor deze cursus zijn nog geen progressiefoto-momenten ingesteld.
              Stel bij cursusinstellingen &quot;Progressiefoto&apos;s – aantal momenten&quot; en
              &quot;Interval (weken)&quot; in.
            </p>
            <Link
              href={`/admin/courses/${courseId}`}
              className="inline-block mt-4 text-primary hover:underline"
            >
              Naar cursusinstellingen
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const enrollments = await db.enrollment.findMany({
    where: { courseId },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const progressPhotos = await db.progressPhoto.findMany({
    where: { courseId },
    orderBy: [{ userId: "asc" }, { periodIndex: "asc" }],
  });

  const byUser = new Map<
    string,
    { user: { id: string; firstName: string; lastName: string; email: string; phone: string | null }; photos: typeof progressPhotos }
  >();
  for (const e of enrollments) {
    byUser.set(e.userId, {
      user: e.user,
      photos: progressPhotos.filter((p) => p.userId === e.userId),
    });
  }

  const periodLabels = Array.from(
    { length: count },
    (_, i) => `Week ${i * intervalWeeks}`
  );

  return (
    <div className="p-6 md:p-8 lg:p-12">
      <Link
        href={`/admin/courses/${courseId}`}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Terug naar {course.title}
      </Link>
      <div className="mb-8">
        <h1 className="font-display text-2xl md:text-3xl tracking-wider flex items-center gap-2">
          <Camera className="h-6 w-6" />
          PROGRESSIEFOTO&apos;S
        </h1>
        <p className="mt-2 text-muted-foreground">
          Ingestuurde voor/na-foto&apos;s per deelnemer – {course.title}
        </p>
      </div>

      <div className="space-y-8">
        {Array.from(byUser.entries()).map(([userId, { user: u, photos }]) => {
          const byPeriod = Object.fromEntries(
            photos.map((p) => [p.periodIndex, p])
          );
          return (
            <Card key={userId}>
              <CardHeader>
                <CardTitle className="text-lg">
                  {u.firstName} {u.lastName}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {u.email}
                  {u.phone && (
                    <>
                      {" · "}
                      <a
                        href={`https://wa.me/${u.phone.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {u.phone}
                      </a>
                    </>
                  )}
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {periodLabels.map((label, i) => {
                    const p = byPeriod[i];
                    return (
                      <div
                        key={i}
                        className="border rounded-lg p-3 space-y-2"
                      >
                        <p className="text-sm font-medium text-muted-foreground">
                          {label}
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="aspect-[3/4] rounded overflow-hidden bg-muted">
                            {p?.beforePhotoUrl ? (
                              <Image
                                src={p.beforePhotoUrl}
                                alt={`Voor ${label}`}
                                width={120}
                                height={160}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                                Voor —
                              </div>
                            )}
                          </div>
                          <div className="aspect-[3/4] rounded overflow-hidden bg-muted">
                            {p?.afterPhotoUrl ? (
                              <Image
                                src={p.afterPhotoUrl}
                                alt={`Na ${label}`}
                                width={120}
                                height={160}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                                Na —
                              </div>
                            )}
                          </div>
                        </div>
                        {p?.submittedAt && (
                          <p className="text-xs text-muted-foreground">
                            Ingestuurd{" "}
                            {new Date(p.submittedAt).toLocaleDateString("nl-NL")}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {enrollments.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nog geen deelnemers ingeschreven voor deze cursus.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
