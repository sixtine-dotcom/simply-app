import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  ClipboardList,
  MessageSquare,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { requireAdminUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAssignedFormsForUser } from "@/lib/forms";
import { formatDate, formatDateTime, formatRelativeTime, getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserAccountPanel } from "@/components/admin/user-account-panel";
import { UserEnrollmentPanel } from "@/components/admin/user-enrollment-panel";
import { UserFormAssignmentPanel } from "@/components/admin/user-form-assignment-panel";
import { UserInvitePanel } from "@/components/admin/user-invite-panel";
import { UserOfferAssignmentPanel } from "@/components/admin/user-offer-assignment-panel";
import { UserSpaceMembershipPanel } from "@/components/admin/user-space-membership-panel";
import { ImpersonateUserButton } from "@/components/admin/impersonate-user-button";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const currentUser = await requireAdminUser("/admin/users");
  const { id } = await params;

  const user = await db.user.findFirst({
    where: {
      id,
      ...(currentUser.tenantId ? { tenantId: currentUser.tenantId } : {}),
    },
    include: {
      enrollments: {
        include: {
          course: {
            select: {
              id: true,
              title: true,
              slug: true,
              isPublished: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      offerAssignments: {
        where: { revokedAt: null },
        include: {
          offer: {
            select: {
              id: true,
              title: true,
              slug: true,
              isPublished: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      spaceMemberships: {
        include: {
          space: {
            select: {
              id: true,
              name: true,
              slug: true,
              isActive: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      assignedForms: {
        where: {
          audienceType: "USER",
        },
        include: {
          form: {
            select: {
              id: true,
              title: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      sessionsAsClient: {
        include: {
          coach: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { scheduledAt: "desc" },
        take: 6,
      },
      _count: {
        select: {
          enrollments: true,
          offerAssignments: true,
          spaceMemberships: true,
          sessionsAsClient: true,
        },
      },
    },
  });

  if (!user) {
    notFound();
  }

  const [
    completedLessonsCount,
    availableCourses,
    availableOffers,
    availableForms,
    availableSpaces,
    assignedForms,
  ] =
    await Promise.all([
    db.progress.count({
      where: {
        userId: user.id,
        completedAt: { not: null },
      },
    }),
    db.course.findMany({
      select: {
        id: true,
        title: true,
        isPublished: true,
      },
      orderBy: [{ isPublished: "desc" }, { createdAt: "desc" }],
      take: 50,
    }),
    db.offer.findMany({
      select: {
        id: true,
        title: true,
        isPublished: true,
      },
      orderBy: [{ isPublished: "desc" }, { createdAt: "desc" }],
      take: 50,
    }),
    db.form.findMany({
      where: {
        tenantId: currentUser.tenantId!,
      },
      select: {
        id: true,
        title: true,
        status: true,
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 50,
    }),
    db.space.findMany({
      select: {
        id: true,
        name: true,
        isActive: true,
      },
      orderBy: [{ isActive: "desc" }, { position: "asc" }, { createdAt: "asc" }],
      take: 50,
    }),
    getAssignedFormsForUser({
      userId: user.id,
      role: user.role,
      tenantId: user.tenantId,
    }),
  ]);
  const pendingRequiredForms = assignedForms.filter(
    (entry) => entry.assignment.isRequired && !entry.isSubmitted
  );
  const submittedForms = assignedForms.filter((entry) => entry.isSubmitted);

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <Card className="overflow-hidden app-halo">
          <CardContent className="p-0">
            <div className="grid gap-8 bg-[linear-gradient(135deg,rgba(255,255,255,0.92),rgba(248,242,233,0.82))] p-8 lg:grid-cols-[1.2fr_0.8fr]">
              <div>
                <Link
                  href="/admin/users"
                  className="inline-flex items-center text-sm text-muted-foreground transition hover:text-foreground"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Terug naar gebruikers
                </Link>
                <div className="mt-5 flex items-center gap-4">
                  <Avatar className="h-20 w-20 border border-white/70 shadow-sm">
                    <AvatarImage src={user.avatarUrl || undefined} />
                    <AvatarFallback>{getInitials(user.firstName, user.lastName)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="app-kicker">Member profile</p>
                    <h1 className="mt-2 font-display text-4xl tracking-tight text-slate-950">
                      {user.firstName} {user.lastName}
                    </h1>
                    <p className="mt-2 text-sm text-muted-foreground">{user.email}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge>{user.role}</Badge>
                      {user.deletedAt ? <Badge>Gearchiveerd</Badge> : null}
                      {user.phone ? <Badge>{user.phone}</Badge> : null}
                      {user.lastLoginAt ? <Badge>Laatst actief {formatRelativeTime(user.lastLoginAt)}</Badge> : null}
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid gap-3">
                <div className="app-panel-muted p-5">
                  <p className="text-sm text-muted-foreground">Accountstatus</p>
                  <p className="mt-2 text-2xl font-semibold">
                    {user.deletedAt ? "Gearchiveerd" : user.lastLoginAt ? "Actief" : "Activatie open"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {pendingRequiredForms.length} verplichte formulieren open
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <ImpersonateUserButton userId={user.id} disabled={Boolean(user.deletedAt) || user.role !== "CLIENT"} />
                  <Button variant="outline" asChild>
                    <Link href={`/admin/sessions/new?clientId=${user.id}`}>Sessie plannen</Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/admin/forms">Formulieren beheren</Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/admin/sessions">Coaching beheren</Link>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {user.deletedAt ? (
          <Card className="border-amber-300 bg-amber-50">
            <CardContent className="p-4 text-sm text-amber-900">
              Deze gebruiker is gearchiveerd sinds {formatDateTime(user.deletedAt)} en staat niet
              meer in de actieve peopleflow. Je kunt het account hieronder herstellen.
            </CardContent>
          </Card>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard label="Cursussen" value={String(user._count.enrollments)} />
          <MetricCard label="Lessen afgerond" value={String(completedLessonsCount)} />
          <MetricCard label="Formulieren" value={String(assignedForms.length)} />
          <MetricCard label="Open verplicht" value={String(pendingRequiredForms.length)} />
          <MetricCard label="Community's" value={String(user._count.spaceMemberships)} />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserRound className="h-5 w-5" />
                Profiel
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <InfoRow label="Naam" value={`${user.firstName} ${user.lastName}`} />
              <InfoRow label="E-mail" value={user.email} />
              <InfoRow label="Telefoon" value={user.phone || "—"} />
              <InfoRow label="Aangemaakt" value={formatDate(user.createdAt)} />
              <InfoRow
                label="Laatste login"
                value={user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "Nooit"}
              />
              <InfoRow label="Rol" value={user.role} />
            </CardContent>
            <CardContent className="pt-0">
              <UserAccountPanel
                userId={user.id}
                currentUserId={currentUser.id}
                role={user.role}
                phone={user.phone}
                archivedAt={user.deletedAt}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Intake & formulieren
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {assignedForms.length > 0 ? (
                assignedForms.slice(0, 5).map((entry) => (
                  <div key={entry.assignment.id} className="rounded-2xl border bg-muted/20 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{entry.assignment.form.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {entry.questionCount} vragen
                          {entry.assignment.isRequired ? " · verplicht" : ""}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          entry.isSubmitted
                            ? "bg-emerald-100 text-emerald-700"
                            : entry.isOverdue
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {entry.isSubmitted ? "Ingeleverd" : entry.isOverdue ? "Verlopen" : "Open"}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Nog geen formulieren toegewezen.</p>
              )}
              <UserInvitePanel userId={user.id} email={user.email} lastLoginAt={user.lastLoginAt} />
              <UserFormAssignmentPanel
                userId={user.id}
                forms={availableForms}
                assignments={user.assignedForms.map((assignment) => ({
                  assignmentId: assignment.id,
                  title: assignment.form.title,
                  status: assignment.form.status,
                  isRequired: assignment.isRequired,
                }))}
              />
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Toegang tot cursussen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {user.enrollments.length > 0 ? (
                user.enrollments.map((enrollment) => (
                  <div key={enrollment.id} className="rounded-2xl border bg-muted/20 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{enrollment.course.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Start {formatDate(enrollment.startDate)}
                          {enrollment.endDate ? ` · tot ${formatDate(enrollment.endDate)}` : ""}
                        </p>
                      </div>
                      <span className="rounded-full bg-background px-2.5 py-1 text-xs">
                        {enrollment.course.isPublished ? "Live" : "Draft"}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Nog geen cursusinschrijvingen.</p>
              )}
              <UserEnrollmentPanel
                userId={user.id}
                courses={availableCourses}
                enrollments={user.enrollments.map((enrollment) => ({
                  id: enrollment.id,
                  title: enrollment.course.title,
                  isPublished: enrollment.course.isPublished,
                }))}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                Offers & memberships
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {user.offerAssignments.length > 0 ? (
                user.offerAssignments.map((assignment) => (
                  <div key={assignment.id} className="rounded-2xl border bg-muted/20 p-4">
                    <p className="font-medium">{assignment.offer.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Toegekend op {formatDate(assignment.createdAt)}
                      {assignment.endDate ? ` · eindigt ${formatDate(assignment.endDate)}` : ""}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Nog geen actieve offer-toegang.</p>
              )}
              <UserOfferAssignmentPanel
                userId={user.id}
                offers={availableOffers}
                assignments={user.offerAssignments.map((assignment) => ({
                  assignmentId: assignment.id,
                  offerId: assignment.offer.id,
                  title: assignment.offer.title,
                  isPublished: assignment.offer.isPublished,
                }))}
              />
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Communities
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {user.spaceMemberships.length > 0 ? (
                user.spaceMemberships.map((membership) => (
                  <div key={membership.id} className="rounded-2xl border bg-muted/20 p-4">
                    <p className="font-medium">{membership.space.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Lid sinds {formatDate(membership.createdAt)}
                      {membership.space.isActive ? "" : " · non-actief"}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Nog geen communitytoegang.</p>
              )}
              <UserSpaceMembershipPanel
                userId={user.id}
                spaces={availableSpaces}
                memberships={user.spaceMemberships.map((membership) => ({
                  id: membership.id,
                  name: membership.space.name,
                  isActive: membership.space.isActive,
                }))}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Recente coaching
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {user.sessionsAsClient.length > 0 ? (
                user.sessionsAsClient.map((session) => (
                  <div key={session.id} className="rounded-2xl border bg-muted/20 p-4">
                    <p className="font-medium">{session.title || "Coachingsessie"}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatDateTime(session.scheduledAt)} · met {session.coach.firstName} {session.coach.lastName}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">Status: {session.status}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Nog geen coachingsessies.</p>
              )}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Openstaand</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingRequiredForms.length > 0 ? (
                pendingRequiredForms.map((entry) => (
                  <div key={entry.assignment.id} className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <p className="font-medium text-amber-950">{entry.assignment.form.title}</p>
                    <p className="mt-1 text-sm text-amber-900/80">
                      Verplicht formulier dat nog niet is ingevuld.
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Geen verplichte openstaande formulieren.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Afgerond</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {submittedForms.length > 0 ? (
                submittedForms.slice(0, 5).map((entry) => (
                  <div key={entry.assignment.id} className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <p className="font-medium text-emerald-950">{entry.assignment.form.title}</p>
                    <p className="mt-1 text-sm text-emerald-900/80">Formulier is ingeleverd.</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Nog geen afgeronde formulieren.</p>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-2 text-3xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-muted/20 p-4">
      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
      <p className="mt-2 font-medium">{value}</p>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
      {children}
    </span>
  );
}
