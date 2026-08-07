import Link from "next/link";
import { requireAdminUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAssignedFormsForUser } from "@/lib/forms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, formatDate, getInitials } from "@/lib/utils";
import { ClipboardList, LayoutTemplate, Mail, MoreVertical, Search, Tag, Users, Workflow } from "lucide-react";
import { BulkInvitePendingButton } from "./bulk-invite-pending-button";
import { AdminHubCard } from "@/components/admin/hub-card";
import { UserManagementDialog } from "./user-management-dialog";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams?: Promise<{
    view?: string;
    q?: string;
    role?: string;
    activation?: string;
    forms?: string;
  }>;
}) {
  const currentUser = await requireAdminUser("/admin/users");
  const tenantScope = currentUser.tenantId ? { tenantId: currentUser.tenantId } : {};
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const view =
    resolvedSearchParams?.view === "archived" || resolvedSearchParams?.view === "all"
      ? resolvedSearchParams.view
      : "active";
  const query = resolvedSearchParams?.q?.trim() || "";
  const roleFilter =
    resolvedSearchParams?.role && ["ADMIN", "COACH", "CLIENT", "SUPPORT"].includes(resolvedSearchParams.role)
      ? resolvedSearchParams.role
      : "";
  const activationFilter =
    resolvedSearchParams?.activation === "pending" || resolvedSearchParams?.activation === "active"
      ? resolvedSearchParams.activation
      : "";
  const formsFilter =
    resolvedSearchParams?.forms === "pending_required" || resolvedSearchParams?.forms === "complete"
      ? resolvedSearchParams.forms
      : "";
  const deletedFilter =
    view === "archived" ? { deletedAt: { not: null as null | Date } } : view === "all" ? {} : { deletedAt: null };
  const searchFilter = query
    ? {
        OR: [
          { firstName: { contains: query, mode: "insensitive" as const } },
          { lastName: { contains: query, mode: "insensitive" as const } },
          { email: { contains: query, mode: "insensitive" as const } },
        ],
      }
    : {};
  const roleWhere = roleFilter ? { role: roleFilter as "ADMIN" | "COACH" | "CLIENT" | "SUPPORT" } : {};
  const activationWhere =
    activationFilter === "pending"
      ? { lastLoginAt: null, emailVerified: null }
      : activationFilter === "active"
        ? {
            OR: [
              { lastLoginAt: { not: null as null | Date } },
              { emailVerified: { not: null as null | Date } },
            ],
          }
        : {};

  const [baseUsers, archivedCount, progressCounts] = await Promise.all([
    db.user.findMany({
      where: { ...tenantScope, ...deletedFilter, ...searchFilter, ...roleWhere, ...activationWhere },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { enrollments: true } },
      },
    }),
    db.user.count({
      where: {
        ...tenantScope,
        deletedAt: { not: null },
      },
    }),
    db.progress.groupBy({
      by: ["userId"],
      _count: { id: true },
      where: {
        completedAt: { not: null },
        user: tenantScope,
      },
    }),
  ]);
  const formStatusByUser = Object.fromEntries(
    (
      await Promise.all(
        baseUsers.map(async (user) => {
          const assignedForms = await getAssignedFormsForUser({
            userId: user.id,
            role: user.role,
            tenantId: user.tenantId,
          });

          return [
            user.id,
            {
              assigned: assignedForms.length,
              submitted: assignedForms.filter((entry) => entry.isSubmitted).length,
              pendingRequired: assignedForms.filter(
                (entry) => entry.assignment.isRequired && !entry.isSubmitted
              ).length,
            },
          ] as const;
        })
      )
    ).map(([userId, status]) => [userId, status])
  );

  const users = baseUsers.filter((user) => {
    if (formsFilter === "pending_required") {
      return (formStatusByUser[user.id]?.pendingRequired ?? 0) > 0;
    }
    if (formsFilter === "complete") {
      return (
        (formStatusByUser[user.id]?.assigned ?? 0) > 0 &&
        (formStatusByUser[user.id]?.pendingRequired ?? 0) === 0
      );
    }
    return true;
  });

  const progressByUser = Object.fromEntries(
    progressCounts.map((p) => [p.userId, p._count.id])
  );

  const stats = {
    total: users.length,
    admins: users.filter((u) => u.role === "ADMIN").length,
    coaches: users.filter((u) => u.role === "COACH").length,
    clients: users.filter((u) => u.role === "CLIENT").length,
    archived: archivedCount,
    pendingActivation: users.filter((u) => !u.lastLoginAt && !u.emailVerified).length,
    pendingForms: Object.values(formStatusByUser).reduce(
      (count, entry) => count + entry.pendingRequired,
      0
    ),
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <Card className="overflow-hidden app-halo">
          <CardContent className="p-0">
            <div className="grid gap-8 bg-[linear-gradient(135deg,rgba(255,255,255,0.92),rgba(248,242,233,0.82))] p-8 lg:grid-cols-[1.2fr_0.8fr]">
              <div>
                <p className="app-kicker">Klanten</p>
                <h1 className="mt-4 font-display text-4xl tracking-tight text-slate-900 md:text-5xl">
                  Klantenbestand
                </h1>
                <div className="mt-6">
                  <UserManagementDialog />
                </div>
              </div>
              <div className="grid gap-3">
                <div className="app-panel-muted p-5">
                  <p className="text-sm text-muted-foreground">Actieve accounts</p>
                  <p className="mt-2 text-2xl font-semibold">{stats.total}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {stats.clients} klanten en {stats.coaches} coaches
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="app-halo">
          <CardHeader>
            <CardTitle>Snelle acties</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild className="w-full justify-between">
              <Link href="/admin">
                <span className="inline-flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Terug naar dashboard
                </span>
                <span>Open</span>
              </Link>
            </Button>
            <div className="app-panel-muted p-4 text-sm text-muted-foreground">
              Gebruik filters om open activaties, intakevertraging en gearchiveerde accounts
              sneller op te lossen zonder door aparte modules te klikken.
            </div>
          </CardContent>
        </Card>
      </section>

      <div className="flex flex-wrap gap-2">
        <UsersViewLink href={buildUsersHref({ view: "active", q: query, role: roleFilter, activation: activationFilter, forms: formsFilter })} active={view === "active"}>
          Actief
        </UsersViewLink>
        <UsersViewLink
          href={buildUsersHref({ view: "archived", q: query, role: roleFilter, activation: activationFilter, forms: formsFilter })}
          active={view === "archived"}
        >
          Gearchiveerd
        </UsersViewLink>
        <UsersViewLink href={buildUsersHref({ view: "all", q: query, role: roleFilter, activation: activationFilter, forms: formsFilter })} active={view === "all"}>
          Alles
        </UsersViewLink>
      </div>

      <section className="grid gap-4 lg:grid-cols-4">
        <AdminHubCard
          icon={<Users className="h-5 w-5" />}
          title="People"
          description="Deze hub bundelt activatie, intake, toegang en klantopvolging."
          href="/admin/users"
          cta="Open people"
          active
        />
        <AdminHubCard
          icon={<ClipboardList className="h-5 w-5" />}
          title="Forms"
          description="Stuur onboarding, check-ins en required forms vanuit een aparte form hub."
          href="/admin/forms"
          cta="Open forms"
        />
        <AdminHubCard
          icon={<Tag className="h-5 w-5" />}
          title="Offers"
          description="Gebruik offers voor pricing en fulfilment, en people voor toekenning en support."
          href="/admin/offers"
          cta="Open offers"
        />
        <AdminHubCard
          icon={<LayoutTemplate className="h-5 w-5" />}
          title="Website"
          description="Laat publieke pages logisch doorstromen naar intake, leads en klantactivatie."
          href="/admin/landing-pages"
          cta="Open website"
        />
      </section>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Link href="/admin/users" className="block">
          <Card className="app-halo hover:border-primary/30 transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Totaal</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/users?role=CLIENT" className="block">
          <Card className="app-halo hover:border-primary/30 transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-2xl font-bold">{stats.clients}</p>
                <p className="text-sm text-muted-foreground">Klanten</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/users?role=COACH" className="block">
          <Card className="app-halo hover:border-primary/30 transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-2xl font-bold">{stats.coaches}</p>
                <p className="text-sm text-muted-foreground">Coaches</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/forms" className="block">
          <Card className="app-halo hover:border-primary/30 transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-2xl font-bold">{stats.pendingForms}</p>
                <p className="text-sm text-muted-foreground">Open formulieren</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/users?activation=pending" className="block">
          <Card className="app-halo hover:border-primary/30 transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-2xl font-bold">{stats.pendingActivation}</p>
                <p className="text-sm text-muted-foreground">Activatie open</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/users?view=archived" className="block">
          <Card className="app-halo hover:border-primary/30 transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-2xl font-bold">{stats.archived}</p>
                <p className="text-sm text-muted-foreground">Gearchiveerd</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card className="app-halo">
          <CardHeader>
            <CardTitle>People operating model</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div className="rounded-2xl bg-muted/50 p-4">
              <p className="font-medium text-foreground">1. Activatie eerst</p>
              <p className="mt-1">
                Laat uitnodigingen, eerste login en intake niet los van elkaar bestaan.
              </p>
            </div>
            <div className="rounded-2xl bg-muted/50 p-4">
              <p className="font-medium text-foreground">2. Forms als opvolglaag</p>
              <p className="mt-1">
                Gebruik formulieren om nieuwe klanten snel naar de juiste flow te sturen.
              </p>
            </div>
            <div className="rounded-2xl bg-muted/50 p-4">
              <p className="font-medium text-foreground">3. Support vanuit dezelfde hub</p>
              <p className="mt-1">
                Los open activaties en ontbrekende intake direct op zonder naar meerdere modules te springen.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="app-halo">
          <CardHeader>
            <CardTitle>Snelle routes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-between" variant="outline" asChild>
              <Link href="/admin/forms" className="block">
                Open formulieren
                <ClipboardList className="h-4 w-4" />
              </Link>
            </Button>
            <Button className="w-full justify-between" variant="outline" asChild>
              <Link href="/admin/offers">
                Open offers
                <Tag className="h-4 w-4" />
              </Link>
            </Button>
            <Button className="w-full justify-between" variant="outline" asChild>
              <Link href="/admin/onboarding">
                Open setup
                <Workflow className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <div className="app-panel flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <p className="text-sm font-medium">Activatie-opvolging</p>
          <p className="text-sm text-muted-foreground">
            {stats.pendingActivation > 0
              ? `${stats.pendingActivation} gebruiker(s) hebben hun account nog niet geactiveerd.`
              : "Alle actieve gebruikers hebben hun account al geactiveerd."}
          </p>
        </div>
        <BulkInvitePendingButton pendingCount={stats.pendingActivation} />
      </div>

      <Card className="app-halo">
        <CardContent className="pt-7">
        <form className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Zoek op naam of email..."
              className="pl-10"
              id="user-search"
              name="q"
              defaultValue={query}
            />
          </div>
          <select
            name="role"
            defaultValue={roleFilter}
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
          >
            <option value="">Alle rollen</option>
            <option value="ADMIN">Admin</option>
            <option value="COACH">Coach</option>
            <option value="CLIENT">Client</option>
            <option value="SUPPORT">Support</option>
          </select>
          <select
            name="activation"
            defaultValue={activationFilter}
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
          >
            <option value="">Alle activaties</option>
            <option value="pending">Activatie open</option>
            <option value="active">Geactiveerd</option>
          </select>
          <select
            name="forms"
            defaultValue={formsFilter}
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
          >
            <option value="">Alle formulieren</option>
            <option value="pending_required">Open verplicht</option>
            <option value="complete">Formulieren rond</option>
          </select>
          <input type="hidden" name="view" value={view} />
          <Button type="submit">Filter</Button>
          {(query || roleFilter || activationFilter || formsFilter) ? (
            <Button variant="outline" asChild>
              <Link href={buildUsersHref({ view })}>Reset</Link>
            </Button>
          ) : null}
        </form>
        </CardContent>
      </Card>

      <Card className="app-halo">
        <CardHeader>
          <CardTitle>Alle gebruikers</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Kolom &quot;Lessen bekeken&quot; = aantal video&apos;s/lessen dat de klant heeft afgerond
          </p>
          {query || roleFilter ? (
            <p className="text-sm text-muted-foreground">
              {users.length} resultaat/resultaten
              {query ? ` voor "${query}"` : ""}
              {roleFilter ? ` · rol ${roleFilter}` : ""}
              {activationFilter ? ` · ${activationFilter === "pending" ? "activatie open" : "geactiveerd"}` : ""}
              {formsFilter ? ` · ${formsFilter === "pending_required" ? "open verplicht formulier" : "formulieren rond"}` : ""}
            </p>
          ) : null}
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-3 font-medium text-muted-foreground">Gebruiker</th>
                  <th className="pb-3 font-medium text-muted-foreground">WhatsApp / telefoon</th>
                  <th className="pb-3 font-medium text-muted-foreground">Rol</th>
                  <th className="pb-3 font-medium text-muted-foreground">Activatie</th>
                  <th className="pb-3 font-medium text-muted-foreground">Cursussen</th>
                  <th className="pb-3 font-medium text-muted-foreground">Formulieren</th>
                  <th className="pb-3 font-medium text-muted-foreground">Lessen bekeken</th>
                  <th className="pb-3 font-medium text-muted-foreground">Aangemaakt</th>
                  <th className="pb-3 font-medium text-muted-foreground">Laatst actief</th>
                  <th className="pb-3"></th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b last:border-0">
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={user.avatarUrl || undefined} />
                          <AvatarFallback>
                            {getInitials(user.firstName, user.lastName)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <Link
                            href={`/admin/users/${user.id}`}
                            className="font-medium transition hover:text-primary"
                          >
                            {user.firstName} {user.lastName}
                          </Link>
                          <p className="text-sm text-muted-foreground">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 text-muted-foreground text-sm">
                      {user.phone ? (
                        <a
                          href={`https://wa.me/${user.phone.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {user.phone}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-4">
                      <RoleBadge role={user.role} />
                      {user.deletedAt ? (
                        <span className="ml-2 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                          Gearchiveerd
                        </span>
                      ) : null}
                    </td>
                    <td className="py-4">
                      {user.lastLoginAt ? (
                        <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800">
                          Actief
                        </span>
                      ) : user.emailVerified ? (
                        <span className="inline-flex rounded-full bg-sky-100 px-2.5 py-1 text-xs font-medium text-sky-800">
                          Bevestigd
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
                          <Mail className="mr-1 h-3 w-3" />
                          Uitnodiging open
                        </span>
                      )}
                    </td>
                    <td className="py-4 text-muted-foreground">
                      {user._count.enrollments}
                    </td>
                    <td className="py-4">
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
                          <ClipboardList className="mr-1 h-3 w-3" />
                          {formStatusByUser[user.id]?.assigned ?? 0}
                        </span>
                        {(formStatusByUser[user.id]?.pendingRequired ?? 0) > 0 ? (
                          <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 font-medium text-amber-800">
                            {formStatusByUser[user.id]?.pendingRequired} open
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 font-medium text-emerald-700">
                            rond
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4">
                      <span className="font-medium text-primary">
                        {progressByUser[user.id] ?? 0}
                      </span>
                      <span className="text-muted-foreground text-sm ml-1">
                        video&apos;s
                      </span>
                    </td>
                    <td className="py-4 text-muted-foreground">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="py-4 text-muted-foreground">
                      {user.lastLoginAt
                        ? formatDate(user.lastLoginAt)
                        : user.emailVerified
                          ? "Nog niet ingelogd"
                          : "Activatie open"}
                    </td>
                    <td className="py-4">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/admin/users/${user.id}`}>
                        <MoreVertical className="h-4 w-4" />
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}

function UsersViewLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full border px-4 py-2 text-sm transition",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-background text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </Link>
  );
}

function buildUsersHref(input: { view?: string; q?: string; role?: string; activation?: string; forms?: string }) {
  const params = new URLSearchParams();
  if (input.view && input.view !== "active") params.set("view", input.view);
  if (input.q) params.set("q", input.q);
  if (input.role) params.set("role", input.role);
  if (input.activation) params.set("activation", input.activation);
  if (input.forms) params.set("forms", input.forms);
  const query = params.toString();
  return query ? `/admin/users?${query}` : "/admin/users";
}

function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, string> = {
    ADMIN: "bg-purple-100 text-purple-700",
    COACH: "bg-blue-100 text-blue-700",
    CLIENT: "bg-green-100 text-green-700",
    SUPPORT: "bg-orange-100 text-orange-700",
  };

  const labels: Record<string, string> = {
    ADMIN: "Admin",
    COACH: "Coach",
    CLIENT: "Klant",
    SUPPORT: "Support",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colors[role] || "bg-gray-100 text-gray-700"}`}
    >
      {labels[role] || role}
    </span>
  );
}
