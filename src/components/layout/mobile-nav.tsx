"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, BookOpen, Users, LineChart, Bot, Shield } from "lucide-react";

const clientNavItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/courses", label: "Cursussen", icon: BookOpen },
  { href: "/community", label: "Community", icon: Users },
  { href: "/trackers", label: "Trackers", icon: LineChart },
  { href: "/six", label: "SIX", icon: Bot },
];

const adminNavItem = { href: "/admin", label: "Admin", icon: Shield };

export function MobileNav({ user }: { user?: { role: string } | null }) {
  const pathname = usePathname();
  const isAdmin = user?.role === "ADMIN";
  const navItems = isAdmin ? [adminNavItem, ...clientNavItems.slice(1)] : clientNavItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-white md:hidden">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== "/" && pathname.startsWith(item.href));
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-3 text-xs transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
