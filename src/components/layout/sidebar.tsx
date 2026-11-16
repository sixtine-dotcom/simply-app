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
      { href: "/admin/content/video", label: "Video Studio" },
      { href: "/admin/content/carousels", label: "Carousel Studio" },
      { href: "/admin/content/scripts", label: "Reel Scripts" },
      { href: "/admin/email-campaigns", label: "E-mailcampagnes" },
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
      { href: "/messages", label: "Berichten" },
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
  const [communityOpen, setCommunityOpen] = useState(false);
  const [communitySpaces, setCommunitySpaces] = useState<Array<{
    id: string;
    name: string;
    slug: string;
    groupLabel: string | null;
    isHostOnly: boolean;
    postCount: number;
  }>>([]);

  useEffect(() => {
    const nextPathname = window.location.pathname || "/";
    setPathname(nextPathname);

    if (nextPathname.startsWith("/trackers")) {
      setTrackersOpen(true);
    }
    if (nextPathname.startsWith("/community")) {
      setCommunityOpen(true);
    }

  }, []);

  useEffect(() => {
    if (pathname.startsWith("/trackers")) {
      setTrackersOpen(true);
    }

  }, [pathname]);

  useEffect(() => {
    if (!user || isAdminRole(user.role)) return;
    fetch("/api/community/spaces")
      .then((response) => (response.ok ? response.json() : []))
      .then((spaces) => setCommunitySpaces(Array.isArray(spaces) ? spaces : []))
      .catch(() => setCommunitySpaces([]));
  }, [user]);

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
    <aside className="fixed left-0 top-0 z-40 h-screen w-72 border-r border-black/10 bg-white">
      <div className="flex h-full flex-col">
        <div className="flex h-full flex-col overflow-hidden bg-white">
          <div className="border-b border-black/10 px-6 py-5">
            <div className="flex items-center justify-between gap-3">
              <Link
                href={logoHref}
                className="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Logo
                  variant="sidebar"
                  standalone
                  logoUrl={branding.logoUrl}
                  platformName={branding.platformName}
                />
              </Link>
              <span className="inline-flex items-center gap-1.5 border-l border-black/15 pl-3 text-[9px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
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
          <nav className="flex-1 space-y-1 overflow-y-auto px-5 py-5">
            {/* Admin ziet alleen backend; klanten/coaches zien de klantomgeving */}
            {!isAdmin && (
              <>
                <div className="mb-3 text-[9px] font-semibold uppercase tracking-[0.26em] text-[#7d847f]">
                  {t("sidebar_core")}
                </div>
                <div className="space-y-0.5">
                  {mainNavItems.map((item) => item.href === "/community" ? (
                    <div key={item.href}>
                      <button
                        type="button"
                        onClick={() => setCommunityOpen((open) => !open)}
                        aria-expanded={communityOpen}
                        className={cn(
                          "flex w-full items-center gap-3 border-l-2 px-3 py-2.5 text-sm font-medium transition",
                          pathname.startsWith("/community")
                            ? "border-[#173622] bg-[#f7f8f5] text-[#173622]"
                            : "border-transparent text-muted-foreground hover:border-black/15 hover:bg-[#fafaf8] hover:text-foreground"
                        )}
                      >
                        <MessageSquare className="h-4 w-4" />
                        <span className="flex-1 text-left">{item.label}</span>
                        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", communityOpen && "rotate-180")} />
                      </button>
                      {communityOpen ? (
                        <div className="ml-5 mt-1 border-l border-black/10 pl-3">
                          <Link
                            href="/community"
                            className={cn(
                              "block border-b border-transparent px-1 py-2 text-xs transition hover:border-black/10 hover:text-foreground",
                              pathname === "/community" ? "font-semibold text-primary" : "text-muted-foreground"
                            )}
                          >
                            Alle activiteit
                          </Link>
                          {communitySpaces.map((space, index) => {
                            const previousLabel = index > 0 ? communitySpaces[index - 1]?.groupLabel : null;
                            const showLabel = Boolean(space.groupLabel && space.groupLabel !== previousLabel);
                            return (
                              <div key={space.id}>
                                {showLabel ? (
                                  <p className="mb-1 mt-3 px-2.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                                    {space.groupLabel}
                                  </p>
                                ) : null}
                                <Link
                                  href={`/community/${space.slug}`}
                                  className={cn(
                                    "flex items-center gap-2 border-b border-transparent px-1 py-2 text-xs transition hover:border-black/10 hover:text-foreground",
                                    pathname === `/community/${space.slug}` ? "font-semibold text-[#173622]" : "text-muted-foreground"
                                  )}
                                >
                                  <MessageSquare className="h-3 w-3 shrink-0" />
                                  <span className="min-w-0 flex-1 truncate">{space.name}</span>
                                  {space.postCount > 0 ? <span className="text-[9px] text-slate-400">{space.postCount}</span> : null}
                                </Link>
                              </div>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  ) : (
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

                <div className="my-6 h-px bg-black/10" />

                <div>
                  <button
                    type="button"
                    onClick={() => setTrackersOpen(!trackersOpen)}
                    aria-expanded={trackersOpen}
                    aria-controls="sidebar-trackers-nav"
                    className={cn(
                      "flex w-full items-center justify-between border-l-2 px-3 py-2.5 text-sm font-medium transition",
                      pathname.startsWith("/trackers")
                        ? "border-[#173622] bg-[#f7f8f5] text-[#173622]"
                        : "border-transparent text-muted-foreground hover:border-black/15 hover:bg-[#fafaf8] hover:text-foreground"
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
                      className="ml-5 mt-1 space-y-0.5 border-l border-black/10 pl-3"
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
                  <div className="mb-3 text-[9px] font-semibold uppercase tracking-[0.26em] text-[#7d847f]">
                    {t("sidebar_tools")}
                  </div>
                  <div className="space-y-0.5">
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
              <div className="space-y-5">
                {adminNavItems.map((group) => (
                  <div key={group.title}>
                    <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.24em] text-[#7d847f]">
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
          <div className="border-t border-black/10 p-4">
            <div className="mb-3 grid grid-cols-2 divide-x divide-black/10 border-b border-black/10 pb-3">
              <Link
                href={settingsHref}
                className={cn(
                  "flex items-center justify-center gap-1.5 px-2 py-2 text-[11px] font-medium transition hover:text-[#173622]",
                  isPathActive(pathname, settingsHref) ? "text-[#173622]" : "text-muted-foreground"
                )}
              >
                <Settings className="h-3.5 w-3.5" />
                Instellingen
              </Link>
              <Link
                href="mailto:support@simplyinbalance.com"
                className="flex items-center justify-center gap-1.5 px-2 py-2 text-[11px] font-medium text-muted-foreground transition hover:text-[#173622]"
              >
                <Bell className="h-3.5 w-3.5" />
                Hulp
              </Link>
            </div>
            <div className="flex items-center gap-2 py-1">
                <Avatar className="h-8 w-8 border border-black/10">
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
                <Button variant="ghost" size="icon" asChild className="h-8 w-8 rounded-none">
                  <Link href={notificationsHref} title={t("sidebar_notifications")}>
                    <Bell className="h-3.5 w-3.5" />
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-none"
                  aria-label={t("sidebar_logout")}
                  onClick={handleLogout}
                >
                  <LogOut className="h-3.5 w-3.5" />
                </Button>
            </div>
            {!branding.hidePoweredBy ? (
              <p className="mt-3 flex items-center justify-center gap-1 text-[8px] uppercase tracking-[0.13em] text-muted-foreground/60">
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
        "flex items-center gap-3 border-l-2 transition duration-200",
        small ? "px-3 py-2 text-[13px]" : "px-3 py-2.5 text-sm font-medium",
        isActive
          ? "border-[#173622] bg-[#f7f8f5] text-[#173622]"
          : "border-transparent text-muted-foreground hover:border-black/15 hover:bg-[#fafaf8] hover:text-foreground"
      )}
    >
      {Icon && (
        <span className={cn(
          "flex h-6 w-6 items-center justify-center",
          isActive && "text-[#173622]"
        )}>
          <Icon className="h-4 w-4" />
        </span>
      )}
      {children}
    </Link>
  );
}
