import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { TestEmailForm } from "./test-email-form";

export default async function AdminTestEmailPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/");

  return (
    <div className="p-6 md:p-8 lg:p-12 max-w-xl">
      <h1 className="font-display text-2xl tracking-wider mb-2">Testmail versturen</h1>
      <p className="text-muted-foreground mb-6">
        Stuur jezelf de welkomstmail zoals klanten die na een cursusaankoop krijgen.
      </p>
      <TestEmailForm defaultEmail={user.email} />
    </div>
  );
}
