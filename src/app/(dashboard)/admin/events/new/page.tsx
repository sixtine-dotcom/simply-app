import { requireAdminOrCoachUser } from "@/lib/auth";
import { WebinarCreateForm } from "../../webinars/new/webinar-create-form";

export default async function NewEventPage() {
  await requireAdminOrCoachUser("/admin/events/new");
  return (
    <div className="p-4 md:p-5 lg:p-6">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-xl font-semibold text-slate-950">Nieuw event</h1>
        <p className="mt-1 text-sm text-muted-foreground">Maak een publieke inschrijfpagina voor een online of fysiek event.</p>
        <div className="mt-4 rounded-xl border border-border bg-white p-5 shadow-sm"><WebinarCreateForm eventsMode /></div>
      </div>
    </div>
  );
}
