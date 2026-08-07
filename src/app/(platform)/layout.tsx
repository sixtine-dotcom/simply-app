import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { EnvironmentSwitcher } from "@/components/layout/environment-switcher";

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }
  if (user.role !== "SUPERADMIN") {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <EnvironmentSwitcher canAccessPlatform canAccessTenant={Boolean(user.tenantId)} />
      <div className="pt-20 md:pt-6">{children}</div>
    </div>
  );
}
