import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate, getInitials } from "@/lib/utils";
import { Users, Search, Plus, MoreVertical } from "lucide-react";
import { AddUserForm } from "./add-user-form";
import { ImportCSVForm } from "./import-csv-form";

export default async function AdminUsersPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser || currentUser.role !== "ADMIN") {
    redirect("/");
  }

  const [users, progressCounts] = await Promise.all([
    db.user.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { enrollments: true } },
      },
    }),
    db.progress.groupBy({
      by: ["userId"],
      _count: { id: true },
      where: { completedAt: { not: null } },
    }),
  ]);

  const progressByUser = Object.fromEntries(
    progressCounts.map((p) => [p.userId, p._count.id])
  );

  const stats = {
    total: users.length,
    admins: users.filter((u) => u.role === "ADMIN").length,
    coaches: users.filter((u) => u.role === "COACH").length,
    clients: users.filter((u) => u.role === "CLIENT").length,
  };

  return (
    <div className="p-6 md:p-8 lg:p-12">
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl tracking-wider">
            GEBRUIKERS
          </h1>
          <p className="mt-2 text-muted-foreground">
            Beheer gebruikers, maak klanten aan (ook via CSV) en bekijk progressie
          </p>
        </div>
        <Button asChild>
          <Link href="/admin">
            <Users className="mr-2 h-4 w-4" />
            Terug naar dashboard
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
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
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold">{stats.clients}</p>
              <p className="text-sm text-muted-foreground">Klanten</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold">{stats.coaches}</p>
              <p className="text-sm text-muted-foreground">Coaches</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold">{stats.admins}</p>
              <p className="text-sm text-muted-foreground">Admins</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add user + CSV import */}
      <div className="grid gap-6 md:grid-cols-2 mb-8">
        <AddUserForm />
        <ImportCSVForm />
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Zoek op naam of email..."
            className="pl-10"
            id="user-search"
          />
        </div>
      </div>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>Alle gebruikers</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Kolom &quot;Lessen bekeken&quot; = aantal video&apos;s/lessen dat de klant heeft afgerond
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-3 font-medium text-muted-foreground">Gebruiker</th>
                  <th className="pb-3 font-medium text-muted-foreground">WhatsApp / telefoon</th>
                  <th className="pb-3 font-medium text-muted-foreground">Rol</th>
                  <th className="pb-3 font-medium text-muted-foreground">Cursussen</th>
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
                          <p className="font-medium">
                            {user.firstName} {user.lastName}
                          </p>
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
                    </td>
                    <td className="py-4 text-muted-foreground">
                      {user._count.enrollments}
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
                        : "Nooit"}
                    </td>
                    <td className="py-4">
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
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
  );
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
