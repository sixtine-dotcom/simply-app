"use client";

import Link from "next/link";

interface LogoProps {
  /** Compacte weergave (sidebar); anders groter (auth-pagina's) */
  variant?: "sidebar" | "auth";
  /** Alleen logo, geen link */
  standalone?: boolean;
}

/** Logo uit public/logo.svg. Vervang dat bestand door je eigen logo uit de brand guidelines. */
export function Logo({ variant = "sidebar", standalone }: LogoProps) {
  const img = (
    <img
      src="/logo.svg"
      alt="Simply"
      className={variant === "sidebar" ? "h-7 w-auto" : "h-9 w-auto"}
      width={variant === "sidebar" ? 120 : 160}
      height={variant === "sidebar" ? 27 : 36}
    />
  );

  if (standalone) return img;

  return (
    <Link href="/" className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded">
      {img}
    </Link>
  );
}
