"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Home,
  BookOpen,
  Users,
  MessageSquare,
  Calendar,
  LineChart,
  Package,
  UtensilsCrossed,
  Bot,
  Settings,
  LogOut,
  ChevronDown,
  Shield,
  Bell,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getInitials } from "@/lib/utils";
import { Logo } from "@/components/layout/logo";
import { useState } from "react";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl?: string | null;
  role: string;
}

interface SidebarProps {
  user: User;
}

const mainNavItems = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/courses", label: "Mijn Cursussen", icon: BookOpen },
  { href: "/community", label: "Community", icon: Users },
  { href: "/messages", label: "Berichten", icon: MessageSquare },
  { href: "/coaching", label: "Coaching", icon: Calendar },
];

const trackerNavItems = [
  { href: "/trackers", label: "Overzicht", icon: LineChart },
  { href: "/trackers/weekly-overview", label: "Weekoverzicht" },
  { href: "/trackers/nutrition", label: "Voeding" },
  { href: "/trackers/checkins", label: "Check-ins" },
  { href: "/trackers/progress-photos", label: "Progressiefoto's" },
  { href: "/trackers/habits", label: "Habits" },
  { href: "/trackers/cycle", label: "Cyclus" },
  { href: "/trackers/symptoms", label: "Symptomen" },
];

const toolsNavItems = [
  { href: "/producten", label: "Producten & kennisbank", icon: Package },
  { href: "/recipes", label: "Recepten", icon: UtensilsCrossed },
  { href: "/six", label: "SIX AI", icon: Bot },
];

const adminNavItems = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/users", label: "Gebruikers" },
  { href: "/admin/courses", label: "Cursussen" },
  { href: "/admin/landing-pages", label: "Landingpagina's" },
  { href: "/admin/producten", label: "Producten" },
  { href: "/admin/community", label: "Community" },
  { href: "/admin/sessions", label: "Sessies" },
  { href: "/admin/recipes", label: "Recepten" },
  { href: "/admin/ai", label: "SIX AI KB" },
];

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const [trackersOpen, setTrackersOpen] = useState(pathname.startsWith("/trackers"));
  const [adminOpen, setAdminOpen] = useState(pathname.startsWith("/admin"));

  const isAdmin = user.role === "ADMIN";
  const isCoach = user.role === "COACH" || isAdmin;

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-white">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center justify-center border-b border-border px-4">
          <Logo variant="sidebar" />
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {/* Admin ziet alleen backend; klanten/coaches zien de klantomgeving */}
          {!isAdmin && (
            <>
              {/* Main Navigation */}
              <div className="space-y-1">
                {mainNavItems.map((item) => (
                  <NavLink
                    key={item.href}
                    href={item.href}
                    icon={item.icon}
                    isActive={pathname === item.href}
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>

              {/* Divider */}
              <div className="my-4 border-t border-border" />

              {/* Trackers Section */}
              <div>
            <button
              onClick={() => setTrackersOpen(!trackersOpen)}
              className={cn(
                "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                pathname.startsWith("/trackers")
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <span className="flex items-center gap-3">
                <LineChart className="h-4 w-4" />
                Mijn Omgeving
              </span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform",
                  trackersOpen && "rotate-180"
                )}
              />
            </button>
            {trackersOpen && (
              <div className="ml-6 mt-1 space-y-1">
                {trackerNavItems.map((item) => (
                  <NavLink
                    key={item.href}
                    href={item.href}
                    isActive={pathname === item.href}
                    small
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>
            )}
              </div>

              {/* Tools */}
              <div className="space-y-1">
                {toolsNavItems.map((item) => (
                  <NavLink
                    key={item.href}
                    href={item.href}
                    icon={item.icon}
                    isActive={pathname === item.href}
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </>
          )}

          {/* Admin Section - alleen zichtbaar voor admin (backend) */}
          {isAdmin && (
            <>
              <div>
                <button
                  onClick={() => setAdminOpen(!adminOpen)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    pathname.startsWith("/admin")
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <span className="flex items-center gap-3">
                    <Shield className="h-4 w-4" />
                    Admin
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform",
                      adminOpen && "rotate-180"
                    )}
                  />
                </button>
                {adminOpen && (
                  <div className="ml-6 mt-1 space-y-1">
                    {adminNavItems.map((item) => (
                      <NavLink
                        key={item.href}
                        href={item.href}
                        isActive={pathname === item.href}
                        small
                      >
                        {item.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </nav>

        {/* User Section */}
        <div className="border-t border-border p-4">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={user.avatarUrl || undefined} />
              <AvatarFallback>
                {getInitials(user.firstName, user.lastName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user.email}
              </p>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/notifications" title="Meldingen">
                <Bell className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex-1"
              asChild
            >
              <Link href="/settings">
                <Settings className="h-4 w-4 mr-1" />
                Instellingen
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
            </Button>
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
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors",
        small ? "text-sm" : "text-sm font-medium",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {Icon && <Icon className="h-4 w-4" />}
      {children}
    </Link>
  );
}
