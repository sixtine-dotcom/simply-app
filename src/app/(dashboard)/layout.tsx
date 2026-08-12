import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { getBrandingCssVariables, getTenantBrandingById } from "@/lib/branding";
import { BrandingProvider } from "@/components/layout/branding-provider";
import { ImpersonationBanner } from "@/components/layout/impersonation-banner";
import { FormCompletionGate } from "@/components/layout/form-completion-gate";
import { HealthProfileGate } from "@/components/layout/health-profile-gate";
import { CurrentUserProvider } from "@/components/layout/current-user-provider";
import { EnvironmentSwitcher } from "@/components/layout/environment-switcher";
import { LocaleProvider } from "@/components/layout/locale-provider";
import { getAssignedFormsForUser } from "@/lib/forms";
import { getHealthProfileStatus } from "@/lib/health-profile";
import { Button } from "@/components/ui/button";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }
  if (user.role === "SUPERADMIN" && !user.tenantId) {
    redirect("/platform");
  }

  const branding = await getTenantBrandingById(user.tenantId);
  const assignedForms =
    user.role === "CLIENT" || user.role === "COACH" || user.role === "SUPPORT" || user.role === "STAFF"
      ? await getAssignedFormsForUser({
          userId: user.id,
          role: user.role,
          tenantId: user.tenantId,
        })
      : [];
  const pendingRequiredOnboardingForm =
    assignedForms.find(
      (entry) =>
        entry.assignment.isRequired &&
        entry.assignment.form.isOnboardingForm &&
        !entry.isSubmitted
    ) || null;
  const healthProfileStatus =
    user.role === "CLIENT" ? await getHealthProfileStatus(user.id) : { isComplete: true };

  return (
    <CurrentUserProvider
      initialUser={{
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        phone: user.phone,
        role: user.role,
        preferredLanguage: user.preferredLanguage === "en" ? "en" : "nl",
        healthProfileCompleted: healthProfileStatus.isComplete,
        impersonation: user.impersonation ?? null,
      }}
    >
      <LocaleProvider language={user.preferredLanguage === "en" ? "en" : "nl"}>
        <BrandingProvider branding={branding}>
          <div className="app-shell min-h-screen" style={getBrandingCssVariables(branding)}>
          {user.role === "SUPERADMIN" ? (
            <EnvironmentSwitcher canAccessPlatform canAccessTenant={Boolean(user.tenantId)} />
          ) : null}
          {user.impersonation?.isActive ? (
            <ImpersonationBanner
              adminName={user.impersonation.adminName}
              adminEmail={user.impersonation.adminEmail}
              targetEmail={user.impersonation.targetEmail}
            />
          ) : null}
          <HealthProfileGate
            isRequired={user.role === "CLIENT" && !healthProfileStatus.isComplete}
            isBlockedByRequiredForm={Boolean(pendingRequiredOnboardingForm)}
          />
          <FormCompletionGate
            pendingFormHref={
              pendingRequiredOnboardingForm
                ? `/forms/${pendingRequiredOnboardingForm.assignment.form.slug}`
                : null
            }
            pendingFormTitle={pendingRequiredOnboardingForm?.assignment.form.title ?? null}
          />
          <div className="hidden md:block">
            <Sidebar />
          </div>

          {user.role === "ADMIN" ? (
            <Button
              asChild
              className="fixed right-6 top-5 z-30 rounded-2xl shadow-[0_16px_36px_-22px_rgba(31,74,41,0.65)]"
            >
              <Link href="/community">
                Open klantenomgeving
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          ) : null}

          <main className="relative pt-20 md:ml-72 md:pt-6">
            <div className="min-h-screen pb-24 md:pb-6">
              {children}
            </div>
          </main>

          <MobileNav />
          </div>
        </BrandingProvider>
      </LocaleProvider>
    </CurrentUserProvider>
  );
}
