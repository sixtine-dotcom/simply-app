"use client";

import Link from "next/link";
import { Layers3, Monitor, Shield, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface EnvironmentSwitcherProps {
  canAccessPlatform: boolean;
  canAccessTenant: boolean;
}

export function EnvironmentSwitcher({
  canAccessPlatform,
  canAccessTenant,
}: EnvironmentSwitcherProps) {
  const [pathname, setPathname] = useState("/");

  useEffect(() => {
    setPathname(window.location.pathname || "/");
  }, []);

  const links = [
    canAccessPlatform
      ? {
          href: "/platform",
          label: "Platform",
          icon: Monitor,
          isActive: pathname.startsWith("/platform"),
        }
      : null,
    canAccessTenant
      ? {
          href: "/admin",
          label: "Tenant admin",
          icon: Shield,
          isActive: pathname.startsWith("/admin"),
        }
      : null,
    canAccessTenant
      ? {
          href: "/",
          label: "Tenant member",
          icon: UserRound,
          isActive: !pathname.startsWith("/platform") && !pathname.startsWith("/admin"),
        }
      : null,
  ].filter(Boolean) as Array<{
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    isActive: boolean;
  }>;

  if (links.length <= 1) {
    return null;
  }

  return (
    <div className="fixed inset-x-3 top-3 z-[70] md:inset-x-auto md:right-4">
      <div className="app-panel flex items-center gap-2 px-2 py-2">
        <div className="hidden items-center gap-2 pl-2 pr-1 md:flex">
          <Layers3 className="h-4 w-4 text-primary" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            Omgevingen
          </span>
        </div>
        <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-3 md:flex md:flex-none">
          {links.map((link) => (
            <Button
              key={link.href}
              variant={link.isActive ? "default" : "outline"}
              size="sm"
              className={cn("w-full justify-center md:w-auto", !link.isActive && "bg-white/72")}
              asChild
            >
              <Link href={link.href}>
                <link.icon className="mr-1.5 h-4 w-4" />
                {link.label}
              </Link>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
