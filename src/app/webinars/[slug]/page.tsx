import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { WebinarRegistrationForm } from "./registration-form";

export default async function PublicWebinarPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const webinar = await db.webinar.findUnique({
    where: { registrationSlug: slug },
    select: {
      title: true,
      description: true,
      startsAt: true,
      duration: true,
      host: { select: { firstName: true, lastName: true } },
    },
  });

  if (!webinar) notFound();

  return (
    <main className="min-h-screen bg-[#f7f7ff] px-4 py-12">
      <div className="mx-auto max-w-3xl rounded-lg border bg-white p-8 shadow-sm">
        <p className="text-sm font-medium text-[#5b5fc7]">Webinar</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">{webinar.title}</h1>
        <p className="mt-4 text-muted-foreground">
          {webinar.startsAt.toLocaleString("nl-NL")} · {webinar.duration} minuten
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Host: {webinar.host.firstName} {webinar.host.lastName}
        </p>
        {webinar.description ? (
          <p className="mt-6 leading-7 text-muted-foreground">{webinar.description}</p>
        ) : null}
        <div className="mt-8 border-t pt-6">
          <WebinarRegistrationForm slug={slug} />
        </div>
      </div>
    </main>
  );
}
