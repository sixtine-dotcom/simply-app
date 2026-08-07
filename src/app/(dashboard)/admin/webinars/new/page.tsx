import { requireAdminOrCoachUser } from "@/lib/auth";
import { WebinarCreateForm } from "./webinar-create-form";

export default async function NewWebinarPage() {
  await requireAdminOrCoachUser("/admin/webinars/new");
  return (
    <div className="min-h-screen bg-white p-6 md:p-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight">Webinar maken</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Maak een publieke registratiepagina voor mensen zonder account.
        </p>
        <div className="mt-6 rounded-lg border p-5">
          <WebinarCreateForm />
        </div>
      </div>
    </div>
  );
}
