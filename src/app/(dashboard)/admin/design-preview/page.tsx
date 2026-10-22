import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  ChevronRight,
  CheckCircle2,
  Command,
  LayoutTemplate,
  MessageSquare,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Users,
} from "lucide-react";
import { requireAdminUser } from "@/lib/auth";
import { db } from "@/lib/db";

const areas = [
  {
    eyebrow: "Website",
    title: "Pages & branding",
    description: "Beheer je publieke merkervaring.",
    href: "/admin/landing-pages",
    icon: LayoutTemplate,
  },
  {
    eyebrow: "Sales",
    title: "Offers & revenue",
    description: "Van aanbod tot inschrijving.",
    href: "/admin/offers",
    icon: ShoppingBag,
  },
  {
    eyebrow: "Products",
    title: "Courses & community",
    description: "Bouw en publiceer je aanbod.",
    href: "/admin/courses",
    icon: BookOpen,
  },
  {
    eyebrow: "People",
    title: "Customers & access",
    description: "Volg activatie en toegang op.",
    href: "/admin/users",
    icon: Users,
  },
] as const;

export default async function DesignPreviewPage() {
  const user = await requireAdminUser("/admin/design-preview");

  const [customers, communities, products, admins] = await Promise.all([
    db.user.count({ where: { role: { in: ["CLIENT", "STUDENT"] }, deletedAt: null } }),
    db.space.count(),
    db.course.count(),
    db.user.count({ where: { role: { in: ["ADMIN", "SUPERADMIN"] }, deletedAt: null } }),
  ]);

  const firstName = user.firstName || "Sixtine";
  const metrics = [
    { label: "Klanten", value: customers, href: "/admin/users", icon: Users },
    { label: "Communities", value: communities, href: "/admin/community", icon: MessageSquare },
    { label: "Producten", value: products, href: "/admin/courses", icon: BookOpen },
    { label: "Beheerders", value: admins, href: "/admin/users", icon: ShieldCheck },
  ] as const;

  return (
    <div className="min-h-screen bg-[#f7f8f6] px-4 py-5 text-[#121713] md:px-7 md:py-7 xl:px-10">
      <div className="mx-auto max-w-[1480px]">
        <header className="flex flex-col gap-5 border-b border-black/[0.08] pb-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#637067]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#347048] shadow-[0_0_0_4px_rgba(52,112,72,0.10)]" />
              Simply intelligence
            </div>
            <h1 className="text-[28px] font-medium leading-tight tracking-[-0.04em] text-[#101411] md:text-[34px]">
              Goedemorgen, {firstName}.
            </h1>
            <p className="mt-1.5 text-sm text-[#69736c]">Alles wat vandaag aandacht vraagt, in één rustig overzicht.</p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              className="hidden h-10 min-w-[250px] items-center gap-2 rounded-xl border border-black/[0.08] bg-white px-3.5 text-left text-xs text-[#7b847e] shadow-[0_8px_30px_-24px_rgba(16,20,17,0.5)] md:flex"
            >
              <Search className="h-3.5 w-3.5" />
              Zoek in je workspace
              <span className="ml-auto flex items-center gap-1 rounded-md bg-[#f2f4f1] px-1.5 py-1 text-[10px] text-[#68716b]">
                <Command className="h-2.5 w-2.5" />K
              </span>
            </button>
            <Link
              href="/community"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#183d27] px-4 text-xs font-medium text-white shadow-[0_14px_30px_-18px_rgba(24,61,39,0.75)] transition hover:-translate-y-0.5 hover:bg-[#204d32]"
            >
              Klantenomgeving
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </header>

        <section className="mt-6 overflow-hidden rounded-[22px] border border-black/[0.08] bg-white shadow-[0_24px_70px_-55px_rgba(14,24,17,0.55)]">
          <div className="grid md:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric, index) => {
              const Icon = metric.icon;
              return (
                <Link
                  key={metric.label}
                  href={metric.href}
                  className={`group relative flex min-h-[116px] items-end justify-between p-5 transition hover:bg-[#f8faf7] ${
                    index < metrics.length - 1 ? "border-b border-black/[0.07] xl:border-b-0 xl:border-r" : ""
                  } ${index === 1 ? "md:border-b md:border-r-0 xl:border-r" : ""}`}
                >
                  <div>
                    <p className="text-[11px] font-medium text-[#737d76]">{metric.label}</p>
                    <p className="mt-2 text-[30px] font-medium leading-none tracking-[-0.05em] text-[#131814]">{metric.value}</p>
                  </div>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-black/[0.07] bg-[#f7f9f6] text-[#42614b] transition group-hover:border-[#347048]/20 group-hover:bg-[#eaf2ec]">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.75fr)]">
          <section className="overflow-hidden rounded-[22px] border border-black/[0.08] bg-[#111713] text-white shadow-[0_28px_80px_-48px_rgba(10,20,13,0.8)]">
            <div className="relative overflow-hidden px-6 py-6 md:px-8 md:py-7">
              <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-[#6bb27f]/15 blur-3xl" />
              <div className="pointer-events-none absolute inset-0 opacity-[0.055] [background-image:linear-gradient(rgba(255,255,255,.7)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.7)_1px,transparent_1px)] [background-size:34px_34px]" />
              <div className="relative flex items-start justify-between gap-5">
                <div>
                  <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#9db5a4]">
                    <Sparkles className="h-3 w-3" /> Workspace
                  </p>
                  <h2 className="mt-3 max-w-xl text-[23px] font-medium leading-[1.15] tracking-[-0.035em] md:text-[27px]">
                    Eén bedrijf. Vier duidelijke werkgebieden.
                  </h2>
                </div>
                <span className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[10px] text-[#c8d4cb] md:flex">
                  <CheckCircle2 className="h-3 w-3 text-[#79bd8b]" /> Systeem actief
                </span>
              </div>

              <div className="relative mt-8 divide-y divide-white/[0.09] border-y border-white/[0.09]">
                {areas.map((area) => {
                  const Icon = area.icon;
                  return (
                    <Link key={area.href} href={area.href} className="group grid gap-3 py-4 transition md:grid-cols-[46px_1fr_auto] md:items-center">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-[#a9c7b1] transition group-hover:bg-[#65a977]/15 group-hover:text-white">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span>
                        <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-[#789080]">{area.eyebrow}</span>
                        <span className="mt-0.5 block text-sm font-medium text-white">{area.title}</span>
                        <span className="mt-0.5 block text-xs text-[#87988c]">{area.description}</span>
                      </span>
                      <ChevronRight className="hidden h-4 w-4 text-[#607066] transition group-hover:translate-x-1 group-hover:text-white md:block" />
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>

          <div className="space-y-6">
            <section className="rounded-[22px] border border-black/[0.08] bg-white p-5 shadow-[0_24px_70px_-55px_rgba(14,24,17,0.55)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#738078]">Vandaag</p>
                  <h2 className="mt-1 text-base font-medium tracking-[-0.025em]">Snel verderwerken</h2>
                </div>
                <CalendarDays className="h-4 w-4 text-[#56725e]" />
              </div>
              <div className="mt-5 space-y-1.5">
                <QuickLink href="/admin/content" label="Content inplannen" meta="Contentplanner" />
                <QuickLink href="/admin/users" label="Klant toevoegen" meta="People" />
                <QuickLink href="/admin/events/new" label="Event aanmaken" meta="Events" />
                <QuickLink href="/admin/courses" label="Cursus bewerken" meta="Products" />
              </div>
            </section>

            <section className="rounded-[22px] border border-[#cad9ce] bg-[#edf4ef] p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#5a7562]">Design preview</p>
              <p className="mt-2 text-sm font-medium leading-5 text-[#183d27]">Dit is een veilige voorbeeldpagina.</p>
              <p className="mt-1 text-xs leading-5 text-[#607568]">
                De rest van het platform blijft ongewijzigd totdat deze richting is goedgekeurd.
              </p>
              <Link href="/admin" className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[#28583a] hover:underline">
                Terug naar huidig dashboard <ArrowUpRight className="h-3 w-3" />
              </Link>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickLink({ href, label, meta }: { href: string; label: string; meta: string }) {
  return (
    <Link href={href} className="group flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-[#f5f7f4]">
      <span className="h-1.5 w-1.5 rounded-full bg-[#3f7750]" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-medium text-[#212822]">{label}</span>
        <span className="mt-0.5 block text-[10px] text-[#89918c]">{meta}</span>
      </span>
      <ChevronRight className="h-3.5 w-3.5 text-[#a7ada9] transition group-hover:translate-x-0.5 group-hover:text-[#3f7750]" />
    </Link>
  );
}
