import Link from "next/link";
import { requireAdminUser } from "@/lib/auth";
import {
  BadgeEuro,
  BarChart3,
  Bell,
  Bot,
  Globe2,
  KeyRound,
  LayoutTemplate,
  Mail,
  Palette,
  Plug,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Users,
} from "lucide-react";

const settingsItems = [
  {
    title: "Algemene info",
    description: "Naam, basisgegevens, onboarding en platformstatus.",
    href: "/admin/onboarding",
    icon: SlidersHorizontal,
  },
  {
    title: "Branding",
    description: "Logo, kleuren, loginbeeld en white-label instellingen.",
    href: "/admin/branding",
    icon: Palette,
  },
  {
    title: "Facturatie",
    description: "Abonnement, bedrijfsgegevens, facturen en exports.",
    href: "/admin/billing",
    icon: BadgeEuro,
  },
  {
    title: "Website",
    description: "Landing pages en publieke pagina's beheren.",
    href: "/admin/landing-pages",
    icon: LayoutTemplate,
  },
  {
    title: "Domeinnaam",
    description: "Bekijk gekoppelde domeinen en DNS-verificatie.",
    href: "/admin/settings/domains",
    icon: Globe2,
  },
  {
    title: "Gebruikers",
    description: "Beheer klanten, coaches, admins en uitnodigingen.",
    href: "/admin/users",
    icon: Users,
  },
  {
    title: "Toegangsniveaus",
    description: "Rollen, toegang, aanbiedingen en memberships.",
    href: "/admin/offers",
    icon: KeyRound,
  },
  {
    title: "E-mail",
    description: "Afzendergegevens, reply-to en mailflows.",
    href: "/admin/branding",
    icon: Mail,
  },
  {
    title: "Notificaties",
    description: "Bekijk meldingen en volg belangrijke acties op.",
    href: "/notifications",
    icon: Bell,
  },
  {
    title: "Analytics",
    description: "Statistieken, groei, activiteit en performance.",
    href: "/admin/analytics",
    icon: BarChart3,
  },
  {
    title: "Integraties",
    description: "Koppelingen met Shopify, mail en andere tools.",
    href: "/admin/settings/integrations",
    icon: Plug,
  },
  {
    title: "AI kennisbank",
    description: "Beheer AI-context, inzichten en assistentinstellingen.",
    href: "/admin/ai",
    icon: Bot,
  },
  {
    title: "Privacy",
    description: "Accountveiligheid, privacy en toegangscontrole.",
    href: "/settings",
    icon: Shield,
  },
];

export default async function AdminSettingsPage() {
  await requireAdminUser("/admin/settings");

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 border-b border-[rgba(131,104,79,0.12)] pb-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-3xl tracking-tight text-slate-950 md:text-4xl">
                Instellingen
              </h1>
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/70 bg-white/75 text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5" />
              </span>
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Een overzicht voor de belangrijkste instellingen van je platform.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {settingsItems.map((item) => (
            <Link
              key={`${item.title}-${item.href}`}
              href={item.href}
              className="group flex min-h-[116px] items-center gap-5 rounded-[18px] border border-white/70 bg-white/80 p-6 shadow-[0_16px_44px_-34px_rgba(33,24,18,0.42)] transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:bg-white"
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[rgba(31,74,41,0.12)] bg-[rgba(247,242,233,0.78)] text-slate-700 transition-all group-hover:border-primary/25 group-hover:text-primary">
                <item.icon className="h-7 w-7" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-slate-950">{item.title}</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {item.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
