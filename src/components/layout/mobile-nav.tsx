"use client";

import Link from "next/link";
import { useDashboardBranding } from "@/hooks/use-branding";
import { useCurrentUserSummary } from "@/hooks/use-current-user";
import { isPathActive } from "@/components/layout/navigation";
import { Button } from "@/components/ui/button";
import { isAdminRole } from "@/lib/current-user";
import { useLocale } from "@/components/layout/locale-provider";
import { cn } from "@/lib/utils";
import {
  Home,
  BookOpen,
  Users,
  LineChart,
  Smartphone,
  LayoutDashboard,
  CreditCard,
  UserRound,
  LayoutTemplate,
  FileText,
  ArrowUpRight,
} from "lucide-react";
import { useEffect, useState } from "react";

const adminNavItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/landing-pages", label: "Website", icon: LayoutTemplate },
  { href: "/admin/offers", label: "Sales", icon: CreditCard },
  { href: "/admin/courses", label: "Products", icon: BookOpen },
  { href: "/admin/users", label: "People", icon: UserRound },
  { href: "/admin/forms", label: "Forms", icon: FileText },
];

export function MobileNav() {
  const branding = useDashboardBranding();
  const { user } = useCurrentUserSummary();
  const { t } = useLocale();
  const [pathname, setPathname] = useState("/");
  const clientNavItems = [
    { href: "/", label: t("sidebar_dashboard"), icon: Home },
    { href: "/courses", label: t("sidebar_my_courses"), icon: BookOpen },
    { href: "/community", label: t("sidebar_community"), icon: Users },
    { href: "/forms", label: t("sidebar_forms"), icon: FileText },
    { href: "/trackers", label: t("mobile_environment"), icon: LineChart },
    { href: "/app", label: "App", icon: Smartphone },
  ];

  useEffect(() => {
    setPathname(window.location.pathname || "/");
  }, []);

  if (!user) {
    return null;
  }

  const isAdmin = isAdminRole(user?.role);
  const navItems = isAdmin ? adminNavItems : clientNavItems;
  const memberViewHref = "/community";

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:hidden">
      {!branding.hidePoweredBy ? (
        <div className="mx-auto mb-2 max-w-md rounded-full border border-white/70 bg-white/80 px-4 py-2 text-center text-[10px] uppercase tracking-[0.18em] text-muted-foreground shadow-[0_18px_45px_-28px_rgba(33,24,18,0.4)] backdrop-blur">
          {branding.platformName}
        </div>
      ) : null}
      {isAdmin ? (
        <div className="mx-auto mb-2 max-w-md">
          <Button asChild className="w-full justify-between rounded-2xl shadow-[0_18px_45px_-28px_rgba(33,24,18,0.4)]">
            <Link href={memberViewHref}>
              {t("sidebar_open_client_view")}
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      ) : null}
      <div className="mx-auto flex max-w-md items-center justify-around rounded-[28px] border border-white/75 bg-[rgba(255,255,255,0.84)] px-2 py-2 shadow-[0_22px_50px_-28px_rgba(33,24,18,0.46)] backdrop-blur-xl">
        {navItems.map((item) => {
          const isActive = isPathActive(pathname, item.href);
          
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              aria-label={item.label}
              title={item.label}
              className={cn(
                "flex min-w-[44px] flex-col items-center gap-1 rounded-2xl px-1.5 py-3 text-[10px] font-medium transition-all",
                isActive
                  ? "bg-[linear-gradient(135deg,rgba(31,74,41,0.12),rgba(31,74,41,0.04))] text-primary"
                  : "text-muted-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="max-w-[54px] truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
