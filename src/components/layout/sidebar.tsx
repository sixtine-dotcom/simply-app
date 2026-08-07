"use client";

import Link from "next/link";
import { useDashboardBranding } from "@/hooks/use-branding";
import { useCurrentUserSummary } from "@/hooks/use-current-user";
import { isPathActive } from "@/components/layout/navigation";
import { getDashboardHomeHref, isAdminRole } from "@/lib/current-user";
import { useLocale } from "@/components/layout/locale-provider";
import { cn } from "@/lib/utils";
import {
  Home,
  BookOpen,
  Users,
  MessageSquare,
  Calendar,
  LineChart,
  Package,
  FileText,
  UtensilsCrossed,
  Bot,
  Settings,
  LogOut,
  ChevronDown,
  Shield,
  Bell,
  Crown,
  Sparkles,
  Smartphone,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getInitials } from "@/lib/utils";
import { Logo } from "@/components/layout/logo";
import { useEffect, useState } from "react";

const adminNavItems = [
  {
    title: "Home",
    items: [
      { href: "/admin", label: "Dashboard" },
      { href: "/admin/onboarding", label: "Setup" },
    ],
  },
  {
    title: "Websites",
    items: [
      { href: "/admin/landing-pages", label: "Landing Pages" },
      { href: "/admin/branding", label: "Branding" },
    ],
  },
  {
    title: "Sales",
    items: [
      { href: "/admin/content", label: "Contentplanner" },
      { href: "/admin/events", label: "Events" },
      { href: "/admin/trajecten", label: "Trajecten & omzet" },
      { href: "/admin/offers", label: "Offers" },
      { href: "/admin/billing", label: "Billing" },
    ],
  },
  {
    title: "Products",
    items: [
      { href: "/admin/courses", label: "Courses" },
      { href: "/admin/community", label: "Community" },
      { href: "/admin/producten", label: "Library" },
      { href: "/admin/recipes", label: "Recipes" },
    ],
  },
  {
    title: "People",
    items: [
      { href: "/admin/users", label: "People" },
      { href: "/admin/forms", label: "Forms" },
      { href: "/admin/sessions", label: "Coaching" },
    ],
  },
  {
    title: "Insights",
    items: [
      { href: "/admin/analytics", label: "Analytics" },
      { href: "/admin/ai", label: "AI Knowledge" },
    ],
  },
];

export function Sidebar() {
  const branding = useDashboardBranding();
  const { user } = useCurrentUserSummary();
  const { t } = useLocale();
  const [pathname, setPathname] = useState("/");
  const [trackersOpen, setTrackersOpen] = useState(false);

  useEffect(() => {
    const nextPathname = window.location.pathname || "/";
    setPathname(nextPathname);

    if (nextPathname.startsWith("/trackers")) {
      setTrackersOpen(true);
    }

  }, []);

  useEffect(() => {
    if (pathname.startsWith("/trackers")) {
      setTrackersOpen(true);
    }

  }, [pathname]);

  if (!user) {
    return null;
  }

  const mainNavItems = [
    { href: "/", label: t("sidebar_dashboard"), icon: Home },
    { href: "/courses", label: t("sidebar_my_courses"), icon: BookOpen },
    { href: "/community", label: t("sidebar_community"), icon: Users },
    { href: "/forms", label: t("sidebar_forms"), icon: FileText },
    { href: "/messages", label: t("sidebar_messages"), icon: MessageSquare },
    { href: "/coaching", label: t("sidebar_coaching"), icon: Calendar },
  ];

  const trackerNavItems = [
    { href: "/trackers", label: t("sidebar_overview"), icon: LineChart },
    { href: "/trackers/weekly-overview", label: t("sidebar_weekly_overview") },
    { href: "/trackers/nutrition", label: t("sidebar_nutrition") },
    { href: "/trackers/checkins", label: t("sidebar_checkins") },
    { href: "/trackers/progress", label: t("sidebar_progress") },
    { href: "/trackers/progress-photos", label: t("sidebar_progress_photos") },
    { href: "/trackers/habits", label: t("sidebar_habits") },
    { href: "/trackers/cycle", label: t("sidebar_cycle") },
    { href: "/trackers/symptoms", label: t("sidebar_symptoms") },
  ];

  const toolsNavItems = [
    { href: "/producten", label: t("sidebar_products_library"), icon: Package },
    { href: "/recipes", label: t("sidebar_recipes"), icon: UtensilsCrossed },
    { href: "/six", label: "SIX AI", icon: Bot },
    { href: "/app", label: "App installeren", icon: Smartphone },
  ];

  const isAdmin = isAdminRole(user.role);
  const workspaceBadgeLabel = isAdmin ? "Admin" : "Member";
  const logoHref = getDashboardHomeHref(user.role);
  const notificationsHref = "/notifications";
  const settingsHref = isAdmin ? "/admin/settings" : "/settings";

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-72 px-4 py-4">
      <div className="flex h-full flex-col">
        <div className="app-panel flex h-full flex-col overflow-hidden">
          <div className="border-b border-[rgba(131,104,79,0.12)] px-5 py-5">
            <div className="flex items-center justify-between gap-3">
              <Link
                href={logoHref}
                className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Logo
                  variant="sidebar"
                  standalone
                  logoUrl={branding.logoUrl}
                  platformName={branding.platformName}
                />
              </Link>
              <span className="inline-flex items-center gap-1 rounded-full border border-[rgba(131,104,79,0.12)] bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                {isAdmin ? (
                  <Shield className="h-3.5 w-3.5 text-primary" />
                ) : (
                  <Crown className="h-3.5 w-3.5 text-primary" />
                )}
                {workspaceBadgeLabel}
              </span>
            </div>

          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-3">
            {/* Admin ziet alleen backend; klanten/coaches zien de klantomgeving */}
            {!isAdmin && (
              <>
                <div className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.26em] text-muted-foreground">
                  {t("sidebar_core")}
                </div>
                <div className="space-y-1.5">
                  {mainNavItems.map((item) => (
                    <NavLink
                      key={item.href}
                      href={item.href}
                      icon={item.icon}
                      isActive={isPathActive(pathname, item.href)}
                    >
                      {item.label}
                    </NavLink>
                  ))}
                </div>

                <div className="mx-3 my-5 h-px bg-[linear-gradient(90deg,transparent,rgba(131,104,79,0.18),transparent)]" />

                <div>
                  <button
                    type="button"
                    onClick={() => setTrackersOpen(!trackersOpen)}
                    aria-expanded={trackersOpen}
                    aria-controls="sidebar-trackers-nav"
                    className={cn(
                      "flex w-full items-center justify-between rounded-2xl px-3.5 py-3 text-sm font-medium transition-all",
                      pathname.startsWith("/trackers")
                        ? "bg-[linear-gradient(135deg,rgba(31,74,41,0.12),rgba(31,74,41,0.04))] text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]"
                        : "text-muted-foreground hover:bg-white/70 hover:text-foreground"
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <LineChart className="h-4 w-4" />
                      {t("sidebar_member_area")}
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform",
                        trackersOpen && "rotate-180"
                      )}
                    />
                  </button>
                  {trackersOpen && (
                    <div
                      id="sidebar-trackers-nav"
                      className="ml-4 mt-2 space-y-1 rounded-[22px] border border-white/60 bg-white/50 p-2"
                    >
                      {trackerNavItems.map((item) => (
                        <NavLink
                          key={item.href}
                          href={item.href}
                          isActive={isPathActive(pathname, item.href)}
                          small
                        >
                          {item.label}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-5">
                  <div className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.26em] text-muted-foreground">
                    {t("sidebar_tools")}
                  </div>
                  <div className="space-y-1.5">
                    {toolsNavItems.map((item) => (
                      <NavLink
                        key={item.href}
                        href={item.href}
                        icon={item.icon}
                        isActive={isPathActive(pathname, item.href)}
                      >
                        {item.label}
                      </NavLink>
                    ))}
                  </div>
                </div>
              </>
            )}

            {isAdmin && (
              <div className="space-y-4">
                {adminNavItems.map((group) => (
                  <div key={group.title}>
                    <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                      {group.title}
                    </p>
                    <div className="space-y-0.5">
                      {group.items.map((item) => (
                        <NavLink
                          key={item.href}
                          href={item.href}
                          isActive={isPathActive(pathname, item.href)}
                          small
                        >
                          {item.label}
                        </NavLink>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </nav>

          {/* User Section */}
          <div className="border-t border-[rgba(131,104,79,0.12)] p-2.5">
            <div className="mb-2 grid grid-cols-2 gap-1.5">
              <Link
                href={settingsHref}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-medium transition hover:bg-white/70",
                  isPathActive(pathname, settingsHref) ? "bg-primary/10 text-primary" : "text-muted-foreground"
                )}
              >
                <Settings className="h-3.5 w-3.5" />
                Instellingen
              </Link>
              <Link
                href="mailto:support@simplyinbalance.com"
                className="flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-medium text-muted-foreground transition hover:bg-white/70 hover:text-foreground"
              >
                <Bell className="h-3.5 w-3.5" />
                Hulp
              </Link>
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-white/65 bg-white/70 p-2 shadow-[0_14px_28px_-26px_rgba(33,24,18,0.45)]">
                <Avatar className="h-8 w-8 border border-white/70 shadow-sm">
                  <AvatarImage src={user.avatarUrl || undefined} />
                  <AvatarFallback>
                    {getInitials(user.firstName, user.lastName)}
                  </AvatarFallback>
                </Avatar>
                <Link href={settingsHref} className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-slate-950">
                    {user.firstName} {user.lastName}
                  </p>
                </Link>
                <Button variant="ghost" size="icon" asChild className="h-8 w-8 bg-white/60">
                  <Link href={notificationsHref} title={t("sidebar_notifications")}>
                    <Bell className="h-3.5 w-3.5" />
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 bg-white/60"
                  aria-label={t("sidebar_logout")}
                  onClick={handleLogout}
                >
                  <LogOut className="h-3.5 w-3.5" />
                </Button>
            </div>
            {!branding.hidePoweredBy ? (
              <p className="mt-2 flex items-center justify-center gap-1 text-[8px] uppercase tracking-[0.13em] text-muted-foreground/70">
                <Sparkles className="h-3 w-3 text-primary/70" />
                Powered by Simply in Balance
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </aside>
  );
}

interface NavLinkProps {
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  isActive: boolean;
  small?: boolean;
  children: React.ReactNode;
}

function NavLink({ href, icon: Icon, isActive, small, children }: NavLinkProps) {
  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 transition-all duration-200",
        small ? "rounded-xl px-3 py-2 text-sm" : "rounded-2xl px-3.5 py-3 text-sm font-medium",
        isActive
          ? "bg-[linear-gradient(135deg,rgba(31,74,41,0.13),rgba(31,74,41,0.04))] text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]"
          : "text-muted-foreground hover:bg-white/70 hover:text-foreground"
      )}
    >
      {Icon && (
        <span className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full border border-white/60 bg-white/70",
          isActive && "border-primary/15 bg-white"
        )}>
          <Icon className="h-4 w-4" />
        </span>
      )}
      {children}
    </Link>
  );
}
