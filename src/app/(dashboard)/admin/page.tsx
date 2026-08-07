import Link from "next/link";
import { BookOpen, LayoutTemplate, MessageSquare, ShieldCheck, ShoppingBag, Users } from "lucide-react";
import { requireAdminUser } from "@/lib/auth";
import { db } from "@/lib/db";

const hubs = [
  {
    title: "Website",
    label: "Open website hub",
    href: "/admin/landing-pages",
    icon: LayoutTemplate,
  },
  {
    title: "Sales",
    label: "Open sales hub",
    href: "/admin/offers",
    icon: ShoppingBag,
  },
  {
    title: "Products",
    label: "Open products",
    href: "/admin/courses",
    icon: BookOpen,
  },
  {
    title: "People",
    label: "Open people",
    href: "/admin/users",
    icon: Users,
  },
] as const;

export default async function AdminDashboardPage() {
  await requireAdminUser("/admin");

  const [customers, communities, products, admins] = await Promise.all([
    db.user.count({ where: { role: { in: ["CLIENT", "STUDENT"] }, deletedAt: null } }),
    db.space.count(),
    db.course.count(),
    db.user.count({ where: { role: { in: ["ADMIN", "SUPERADMIN"] }, deletedAt: null } }),
  ]);

  const stats = [
    { label: "Klanten", value: customers, href: "/admin/users", icon: Users },
    { label: "Communities", value: communities, href: "/admin/community", icon: MessageSquare },
    { label: "Producten", value: products, href: "/admin/courses", icon: BookOpen },
    { label: "Admins", value: admins, href: "/admin/users", icon: ShieldCheck },
  ] as const;

  return (
    <div className="p-4 md:p-5 lg:p-6">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-xl font-semibold text-slate-950">Dashboard</h1>

        <div className="mt-4 grid grid-cols-2 overflow-hidden rounded-xl border border-border bg-white shadow-sm md:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Link
                key={stat.label}
                href={stat.href}
                className="flex items-center gap-3 border-b border-r border-border px-4 py-3 transition-colors hover:bg-primary/[0.03] [&:nth-child(2n)]:border-r-0 [&:nth-last-child(-n+2)]:border-b-0 md:border-b-0 md:[&:nth-child(2n)]:border-r md:[&:last-child]:border-r-0"
              >
                <Icon className="h-4 w-4 shrink-0 text-primary" />
                <span>
                  <span className="block text-lg font-semibold leading-none text-slate-950">{stat.value}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">{stat.label}</span>
                </span>
              </Link>
            );
          })}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {hubs.map((hub) => {
            const Icon = hub.icon;
            return (
              <Link
                key={hub.href}
                href={hub.href}
                className="group flex items-center gap-3 rounded-xl border border-border bg-white p-4 shadow-sm transition-colors hover:border-primary/30 hover:bg-primary/[0.03]"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-slate-900">{hub.title}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground group-hover:text-primary">{hub.label}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
