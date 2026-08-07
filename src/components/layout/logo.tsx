"use client";

import Link from "next/link";

interface LogoProps {
  /** Compacte weergave (sidebar); anders groter (auth-pagina's) */
  variant?: "sidebar" | "auth";
  /** Alleen logo, geen link */
  standalone?: boolean;
  href?: string;
  logoUrl?: string | null;
  platformName?: string;
}

const leafLogoUrl = "/simply-leaf-logo.jpg";

export function Logo({
  variant = "sidebar",
  standalone,
  href = "/",
  logoUrl,
  platformName = "Simply leeromgeving",
}: LogoProps) {
  const sizeClass =
    variant === "sidebar"
      ? "h-8 w-auto"
      : "h-10 w-auto md:h-11";
  const markSizeClass = variant === "sidebar" ? "h-9 w-9" : "h-11 w-11";
  const textSizeClass =
    variant === "sidebar"
      ? "text-[15px]"
      : "text-lg md:text-xl";
  const img = logoUrl ? (
    <img
      src={logoUrl}
      alt={platformName}
      className={sizeClass}
      width={variant === "sidebar" ? 132 : 176}
      height={variant === "sidebar" ? 31 : 44}
    />
  ) : (
    <div className="flex items-center gap-3">
      <img
        src={leafLogoUrl}
        alt={platformName}
        className={`${markSizeClass} shrink-0 rounded-full object-cover ring-1 ring-white/70`}
        width={variant === "sidebar" ? 36 : 44}
        height={variant === "sidebar" ? 36 : 44}
      />
      <span className={`${textSizeClass} font-display leading-none tracking-wide text-primary`}>
        {platformName}
      </span>
    </div>
  );

  if (standalone) return img;

  return (
    <Link
      href={href}
      className="inline-flex rounded-full px-1 py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      {img}
    </Link>
  );
}
