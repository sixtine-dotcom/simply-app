"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, Circle, Loader2, Rocket, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type OnboardingState = {
  tenant: {
    id: string;
    name: string;
    slug: string;
    plan: string;
    status: string;
    trialEndsAt: string | null;
  };
  onboardingCompleted: boolean;
  onboardingCompletedAt: string | null;
  completedSteps: number;
  totalSteps: number;
  requiredCompletedSteps: number;
  totalRequiredSteps: number;
  canCompleteOnboarding: boolean;
  progress: number;
  assetCounts: {
    products: number;
    offers: number;
    forms: number;
    spaces: number;
    landingPages: number;
    teamMembers: number;
    grantedAccess: number;
    pendingActivations: number;
    pendingRequiredForms: number;
  };
  latestAssets: {
    course: {
      id: string;
      title: string;
      slug: string;
      manageHref: string;
      viewHref: string;
      isPublished: boolean;
    } | null;
    offer: {
      id: string;
      title: string;
      slug: string;
      manageHref: string;
      viewHref: string;
      isPublished: boolean;
    } | null;
    space: {
      id: string;
      title: string;
      slug: string;
      manageHref: string;
      viewHref: string;
      isPublished: boolean;
    } | null;
    landingPage: {
      id: string;
      title: string;
      slug: string;
      manageHref: string;
      viewHref: string;
      isPublished: boolean;
    } | null;
    member: {
      id: string;
      title: string;
      subtitle: string;
      role: string;
      manageHref: string;
    } | null;
    grantedMember: {
      id: string;
      title: string;
      subtitle: string;
      role: string;
      manageHref: string;
    } | null;
  };
  readiness: {
    isReadyForSoftLaunch: boolean;
    hasPublicSurface: boolean;
    hasTestedAccess: boolean;
    hasPendingActivations: boolean;
    hasPendingRequiredForms: boolean;
    nextRecommendedAction: {
      key: string;
      title: string;
      description: string;
      href: string;
      isComplete: boolean;
      isRequired: boolean;
    } | null;
  };
  steps: Array<{
    key: string;
    title: string;
    description: string;
    href: string;
    isComplete: boolean;
    isRequired: boolean;
  }>;
};

export default function AdminOnboardingPage() {
  const [data, setData] = useState<OnboardingState | null>(null);
  const [error, setError] = useState("");
  const [actionNotice, setActionNotice] = useState<{
    message: string;
    devRegistrationLink?: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [origin, setOrigin] = useState("");
  const [courseForm, setCourseForm] = useState({
    title: "",
    slug: "",
    description: "",
  });
  const [memberForm, setMemberForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    role: "CLIENT",
  });
  const [spaceForm, setSpaceForm] = useState({
    name: "",
    slug: "",
    description: "",
    iconEmoji: "💬",
  });
  const [landingPageForm, setLandingPageForm] = useState({
    title: "",
    slug: "",
    headline: "",
    subheadline: "",
  });
  const [offerForm, setOfferForm] = useState({
    title: "",
    slug: "",
    description: "",
    priceEuros: "49",
    pricingType: "one_time",
    courseIds: [] as string[],
  });
  const [availableCourses, setAvailableCourses] = useState<Array<{ id: string; title: string; slug: string }>>([]);
  const [actionLoading, setActionLoading] = useState<
    | null
    | "starter-setup"
    | "course"
    | "member"
    | "space"
    | "landing"
    | "offer"
    | "publish-course"
    | "grant-access"
    | "publish-offer"
    | "publish-landing"
  >(null);

  const load = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/onboarding");
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "Onboarding kon niet worden geladen.");
        return;
      }
      setData(result.onboarding);
    } catch {
      setError("Onboarding kon niet worden geladen.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadCourses = async () => {
    try {
      const response = await fetch("/api/admin/courses");
      const result = await response.json();
      if (response.ok) {
        setAvailableCourses(
          (result || []).map((course: any) => ({
            id: course.id,
            title: course.title,
            slug: course.slug,
          }))
        );
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    void loadCourses();
  }, []);

  const updateStatus = async (action: "complete" | "reset") => {
    setIsSaving(true);
    setError("");
    try {
      const response = await fetch("/api/admin/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "Status kon niet worden bijgewerkt.");
        return;
      }
      setData(result.onboarding);
    } catch {
      setError("Status kon niet worden bijgewerkt.");
    } finally {
      setIsSaving(false);
    }
  };

  const autoSlug = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();

  const runAction = async (
    payload: Record<string, unknown>,
    type:
      | "course"
      | "member"
      | "space"
      | "landing"
      | "offer"
      | "publish-course"
      | "grant-access"
      | "publish-offer"
      | "publish-landing"
      | "starter-setup"
  ) => {
    setActionLoading(type);
    setError("");
    setActionNotice(null);
    try {
      const response = await fetch("/api/admin/onboarding/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "Actie kon niet worden uitgevoerd.");
        return;
      }
      setData(result.onboarding);
      if (result.message || result.devRegistrationLink) {
        setActionNotice({
          message: result.message || "Actie uitgevoerd.",
          devRegistrationLink: result.devRegistrationLink,
        });
      }
      if (type === "course") {
        setCourseForm({ title: "", slug: "", description: "" });
      } else if (type === "member") {
        setMemberForm({ email: "", firstName: "", lastName: "", role: "CLIENT" });
      } else if (type === "space") {
        setSpaceForm({ name: "", slug: "", description: "", iconEmoji: "💬" });
      } else if (type === "landing") {
        setLandingPageForm({ title: "", slug: "", headline: "", subheadline: "" });
      } else if (type === "offer") {
        setOfferForm({
          title: "",
          slug: "",
          description: "",
          priceEuros: "49",
          pricingType: "one_time",
          courseIds: [],
        });
      }
      if (type === "course" || type === "starter-setup") {
        await loadCourses();
      }
    } catch {
      setError("Actie kon niet worden uitgevoerd.");
    } finally {
      setActionLoading(null);
    }
  };

  const publishAsset = async (
    action: "publish_course" | "publish_offer" | "publish_landing_page"
  ) => {
    await runAction(
      { action },
      action === "publish_course"
        ? "publish-course"
        : action === "publish_offer"
          ? "publish-offer"
          : "publish-landing"
    );
  };

  const grantAccess = async () => {
    await runAction({ action: "grant_access" }, "grant-access");
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 lg:p-8">
        <Card className="app-halo max-w-4xl">
          <CardContent className="flex min-h-[240px] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-4 md:p-6 lg:p-8">
        <Card className="app-halo max-w-3xl">
          <CardHeader>
            <CardTitle>Onboarding niet beschikbaar</CardTitle>
            <CardDescription>{error || "Er is iets misgegaan."}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="app-panel app-halo mb-8 overflow-hidden">
        <div className="absolute inset-y-0 right-0 hidden w-80 bg-[radial-gradient(circle_at_center,rgba(208,169,110,0.2),transparent_68%)] lg:block" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="app-kicker">First setup</p>
            <h1 className="mt-3 font-display text-3xl tracking-tight text-slate-950 md:text-5xl">
              Platform onboarding
            </h1>
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-slate-700">
            Rond de eerste setup van {data.tenant.name} af. Je trial loopt
            {data.tenant.trialEndsAt
              ? ` tot ${new Date(data.tenant.trialEndsAt).toLocaleDateString("nl-BE", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}.`
              : "."}
          </p>
          </div>
          <div className="app-panel-muted min-w-[280px] border-white/80 px-5 py-4 text-sm shadow-none">
            <p className="text-sm font-medium text-slate-600">Platform URL</p>
            <p className="mt-1 font-medium text-foreground">
              {origin ? `${origin}/landing/${data.tenant.slug}` : `${data.tenant.slug}.simplyapp.nl`}
            </p>
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <SetupMetric label="Producten" value={String(data.assetCounts.products)} />
        <SetupMetric label="Offers" value={String(data.assetCounts.offers)} />
        <SetupMetric label="Formulieren" value={String(data.assetCounts.forms)} />
        <SetupMetric label="Community spaces" value={String(data.assetCounts.spaces)} />
        <SetupMetric label="Pagina's" value={String(data.assetCounts.landingPages)} />
        <SetupMetric label="Teamleden" value={String(data.assetCounts.teamMembers)} />
        <SetupMetric label="Toegangen getest" value={String(data.assetCounts.grantedAccess)} />
        <SetupMetric label="Activatie open" value={String(data.assetCounts.pendingActivations)} />
        <SetupMetric label="Open verplicht" value={String(data.assetCounts.pendingRequiredForms)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
        <Card className="app-halo">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Rocket className="h-5 w-5 text-primary" />
              Setup checklist
            </CardTitle>
            <CardDescription>
              {data.completedSteps} van {data.totalSteps} stappen voltooid
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Progress value={data.progress} className="h-2" />
            <div className="app-panel-muted px-4 py-3 text-sm text-muted-foreground shadow-none">
              Verplicht voor afronden: {data.requiredCompletedSteps} van {data.totalRequiredSteps} kernstappen.
            </div>

            <div className="app-panel-muted border-primary/20 bg-primary/5 p-4 shadow-none">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-medium text-foreground">Snelle basisopzet</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Laat de onboarding meteen een startprogramma, community, offer en welkomspagina klaarzetten.
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={() => void runAction({ action: "create_starter_setup" }, "starter-setup")}
                  disabled={actionLoading === "starter-setup"}
                >
                  {actionLoading === "starter-setup" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  Basis automatisch opzetten
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {data.steps.map((step) => (
                <div
                  key={step.key}
                  className="app-panel-muted flex flex-col gap-4 p-4 shadow-none md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex gap-3">
                    <div className="pt-0.5">
                      {step.isComplete ? (
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {step.title}
                        {step.isRequired ? (
                          <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                            Verplicht
                          </span>
                        ) : null}
                      </p>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                  <Button variant={step.isComplete ? "outline" : "default"} asChild>
                    <Link href={step.href}>
                      {step.isComplete ? "Bekijken" : "Openen"}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              ))}
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            {actionNotice ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-900">
                <p>{actionNotice.message}</p>
                {actionNotice.devRegistrationLink ? (
                  <a
                    href={actionNotice.devRegistrationLink}
                    className="mt-2 inline-flex text-xs font-medium underline underline-offset-4"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open activatielink
                  </a>
                ) : null}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => void updateStatus(data.onboardingCompleted ? "reset" : "complete")}
                disabled={isSaving || (!data.onboardingCompleted && !data.canCompleteOnboarding)}
              >
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {data.onboardingCompleted ? "Onboarding opnieuw openen" : "Onboarding afronden"}
              </Button>
              <Button variant="outline" asChild>
                <Link href="/admin">Naar admin dashboard</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="app-halo">
            <CardHeader>
              <CardTitle>Eerste product</CardTitle>
              <CardDescription>
                Maak meteen je eerste programma aan vanuit de onboarding.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  void runAction(
                    {
                      action: "create_course",
                      title: courseForm.title,
                      slug: courseForm.slug,
                      description: courseForm.description,
                    },
                    "course"
                  );
                }}
              >
                <div className="space-y-2">
                  <Label htmlFor="courseTitle">Titel</Label>
                  <Input
                    id="courseTitle"
                    value={courseForm.title}
                    onChange={(e) =>
                      setCourseForm((prev) => ({
                        ...prev,
                        title: e.target.value,
                        slug: !prev.slug || prev.slug === autoSlug(prev.title)
                          ? autoSlug(e.target.value)
                          : prev.slug,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="courseSlug">Slug</Label>
                  <Input
                    id="courseSlug"
                    value={courseForm.slug}
                    onChange={(e) => setCourseForm((prev) => ({ ...prev, slug: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="courseDescription">Beschrijving</Label>
                  <textarea
                    id="courseDescription"
                    value={courseForm.description}
                    onChange={(e) =>
                      setCourseForm((prev) => ({ ...prev, description: e.target.value }))
                    }
                    className="min-h-[90px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
                <Button type="submit" disabled={actionLoading === "course"} className="w-full">
                  {actionLoading === "course" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Eerste product maken
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="app-halo">
            <CardHeader>
              <CardTitle>Eerste offer</CardTitle>
              <CardDescription>
                Maak het aanbod verkoopbaar door je eerste offer of membership aan een programma te koppelen.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  void runAction(
                    {
                      action: "create_offer",
                      ...offerForm,
                    },
                    "offer"
                  );
                }}
              >
                <div className="space-y-2">
                  <Label htmlFor="offerTitle">Titel</Label>
                  <Input
                    id="offerTitle"
                    value={offerForm.title}
                    onChange={(e) =>
                      setOfferForm((prev) => ({
                        ...prev,
                        title: e.target.value,
                        slug: !prev.slug || prev.slug === autoSlug(prev.title)
                          ? autoSlug(e.target.value)
                          : prev.slug,
                      }))
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="offerSlug">Slug</Label>
                    <Input
                      id="offerSlug"
                      value={offerForm.slug}
                      onChange={(e) => setOfferForm((prev) => ({ ...prev, slug: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="offerPrice">Prijs (EUR)</Label>
                    <Input
                      id="offerPrice"
                      value={offerForm.priceEuros}
                      onChange={(e) => setOfferForm((prev) => ({ ...prev, priceEuros: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="offerPricingType">Type</Label>
                  <select
                    id="offerPricingType"
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                    value={offerForm.pricingType}
                    onChange={(e) => setOfferForm((prev) => ({ ...prev, pricingType: e.target.value }))}
                  >
                    <option value="one_time">Eenmalige aankoop</option>
                    <option value="subscription">Membership</option>
                    <option value="payment_plan">Payment plan</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="offerDescription">Beschrijving</Label>
                  <textarea
                    id="offerDescription"
                    value={offerForm.description}
                    onChange={(e) => setOfferForm((prev) => ({ ...prev, description: e.target.value }))}
                    className="min-h-[90px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
                {availableCourses.length > 0 ? (
                  <div className="space-y-2">
                    <Label>Koppel cursussen</Label>
                    <div className="space-y-2 rounded-lg border border-border/60 p-3">
                      {availableCourses.map((course) => (
                        <label key={course.id} className="flex items-center gap-3 text-sm">
                          <input
                            type="checkbox"
                            checked={offerForm.courseIds.includes(course.id)}
                            onChange={(e) =>
                              setOfferForm((prev) => ({
                                ...prev,
                                courseIds: e.target.checked
                                  ? [...prev.courseIds, course.id]
                                  : prev.courseIds.filter((id) => id !== course.id),
                              }))
                            }
                            className="h-4 w-4"
                          />
                          <span>{course.title}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ) : null}
                <Button type="submit" disabled={actionLoading === "offer"} className="w-full">
                  {actionLoading === "offer" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Offer maken
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Eerste lid uitnodigen</CardTitle>
              <CardDescription>
                Voeg een klant, coach of support-account toe om de flow meteen te testen.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  void runAction(
                    {
                      action: "invite_member",
                      ...memberForm,
                    },
                    "member"
                  );
                }}
              >
                <div className="space-y-2">
                  <Label htmlFor="memberEmail">Email</Label>
                  <Input
                    id="memberEmail"
                    type="email"
                    value={memberForm.email}
                    onChange={(e) => setMemberForm((prev) => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="memberFirstName">Voornaam</Label>
                    <Input
                      id="memberFirstName"
                      value={memberForm.firstName}
                      onChange={(e) =>
                        setMemberForm((prev) => ({ ...prev, firstName: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="memberLastName">Achternaam</Label>
                    <Input
                      id="memberLastName"
                      value={memberForm.lastName}
                      onChange={(e) =>
                        setMemberForm((prev) => ({ ...prev, lastName: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="memberRole">Rol</Label>
                  <select
                    id="memberRole"
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                    value={memberForm.role}
                    onChange={(e) => setMemberForm((prev) => ({ ...prev, role: e.target.value }))}
                  >
                    <option value="CLIENT">Klant</option>
                    <option value="COACH">Coach</option>
                    <option value="SUPPORT">Support</option>
                  </select>
                </div>
                <Button type="submit" disabled={actionLoading === "member"} className="w-full">
                  {actionLoading === "member" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Lid toevoegen
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Eerste community space</CardTitle>
              <CardDescription>
                Zet een eerste algemene ruimte klaar waar leden straks samenkomen.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  void runAction(
                    {
                      action: "create_space",
                      ...spaceForm,
                    },
                    "space"
                  );
                }}
              >
                <div className="grid grid-cols-[88px_1fr] gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="spaceEmoji">Emoji</Label>
                    <Input
                      id="spaceEmoji"
                      value={spaceForm.iconEmoji}
                      onChange={(e) => setSpaceForm((prev) => ({ ...prev, iconEmoji: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="spaceName">Naam</Label>
                    <Input
                      id="spaceName"
                      value={spaceForm.name}
                      onChange={(e) =>
                        setSpaceForm((prev) => ({
                          ...prev,
                          name: e.target.value,
                          slug: !prev.slug || prev.slug === autoSlug(prev.name)
                            ? autoSlug(e.target.value)
                            : prev.slug,
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="spaceSlug">Slug</Label>
                  <Input
                    id="spaceSlug"
                    value={spaceForm.slug}
                    onChange={(e) => setSpaceForm((prev) => ({ ...prev, slug: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="spaceDescription">Beschrijving</Label>
                  <textarea
                    id="spaceDescription"
                    value={spaceForm.description}
                    onChange={(e) =>
                      setSpaceForm((prev) => ({ ...prev, description: e.target.value }))
                    }
                    className="min-h-[90px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
                <Button type="submit" disabled={actionLoading === "space"} className="w-full">
                  {actionLoading === "space" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Community space maken
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Eerste landing page</CardTitle>
              <CardDescription>
                Maak meteen een eerste pagina aan voor je aanbod of kennismaking.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  void runAction(
                    {
                      action: "create_landing_page",
                      ...landingPageForm,
                    },
                    "landing"
                  );
                }}
              >
                <div className="space-y-2">
                  <Label htmlFor="landingTitle">Titel</Label>
                  <Input
                    id="landingTitle"
                    value={landingPageForm.title}
                    onChange={(e) =>
                      setLandingPageForm((prev) => ({
                        ...prev,
                        title: e.target.value,
                        slug: !prev.slug || prev.slug === autoSlug(prev.title)
                          ? autoSlug(e.target.value)
                          : prev.slug,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="landingSlug">Slug</Label>
                  <Input
                    id="landingSlug"
                    value={landingPageForm.slug}
                    onChange={(e) => setLandingPageForm((prev) => ({ ...prev, slug: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="landingHeadline">Headline</Label>
                  <Input
                    id="landingHeadline"
                    value={landingPageForm.headline}
                    onChange={(e) => setLandingPageForm((prev) => ({ ...prev, headline: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="landingSubheadline">Subheadline</Label>
                  <textarea
                    id="landingSubheadline"
                    value={landingPageForm.subheadline}
                    onChange={(e) =>
                      setLandingPageForm((prev) => ({ ...prev, subheadline: e.target.value }))
                    }
                    className="min-h-[90px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
                <Button type="submit" disabled={actionLoading === "landing"} className="w-full">
                  {actionLoading === "landing" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Landing page maken
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Launch status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="rounded-2xl border bg-muted/30 p-4">
                <p className="font-medium text-foreground">
                  {data.readiness.isReadyForSoftLaunch
                    ? "Je basis staat klaar voor een eerste soft launch."
                    : data.readiness.hasPendingActivations
                      ? "Je setup staat grotendeels, maar er zijn nog leden met open activatie."
                      : data.readiness.hasPendingRequiredForms
                        ? "Je setup staat grotendeels, maar er zijn nog open verplichte formulieren."
                      : "Je platform is nog in setup en nog niet klaar voor live verkeer."}
                </p>
                <p className="mt-1">
                  {data.readiness.isReadyForSoftLaunch
                    ? "Je branding, eerste product, offer en publieke pagina zijn aanwezig."
                    : data.readiness.hasPendingActivations
                      ? "Stuur open activaties opnieuw of laat je eerste leden hun account afronden voordat je live verkeer verwacht."
                      : data.readiness.hasPendingRequiredForms
                        ? "Werk eerst open verplichte intake- of onboardingformulieren af zodat je klantreis ook operationeel klopt."
                      : "Werk eerst alle verplichte setup-stappen af zodat je een consistente eerste klantreis hebt."}
                </p>
              </div>
              <p>Je tenant, admin-account en 14 dagen trial zijn automatisch aangemaakt.</p>
              {data.readiness.nextRecommendedAction ? (
                <div className="rounded-2xl border bg-white p-4">
                  <p className="font-medium text-foreground">Volgende beste stap</p>
                  <p className="mt-1">{data.readiness.nextRecommendedAction.title}</p>
                  <p className="mt-1 text-xs">{data.readiness.nextRecommendedAction.description}</p>
                  <Button className="mt-3 w-full" variant="outline" asChild>
                    <Link href={data.readiness.nextRecommendedAction.href}>
                      Open stap
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              ) : null}
              {data.latestAssets.offer && data.latestAssets.member && !data.readiness.hasTestedAccess ? (
                <div className="rounded-2xl border bg-white p-4">
                  <p className="font-medium text-foreground">Test klanttoegang</p>
                  <p className="mt-1">
                    Geef {data.latestAssets.member.title} meteen toegang tot je laatste offer om de klantomgeving te controleren.
                  </p>
                  <Button className="mt-3 w-full" onClick={() => void grantAccess()} disabled={actionLoading === "grant-access"}>
                    {actionLoading === "grant-access" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Toegang geven
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent aangemaakt</CardTitle>
              <CardDescription>
                Directe links naar de eerste assets van deze setup.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <RecentSetupItem
                label="Laatste cursus"
                title={data.latestAssets.course?.title}
                subtitle={data.latestAssets.course ? `/${data.latestAssets.course.slug}` : undefined}
                manageHref={data.latestAssets.course?.manageHref}
                viewHref={data.latestAssets.course?.viewHref}
                publishLabel={
                  data.latestAssets.course && !data.latestAssets.course.isPublished
                    ? "Publiceer"
                    : undefined
                }
                onPublish={
                  data.latestAssets.course && !data.latestAssets.course.isPublished
                    ? () => void publishAsset("publish_course")
                    : undefined
                }
                isPublishing={actionLoading === "publish-course"}
              />
              <RecentSetupItem
                label="Laatste offer"
                title={data.latestAssets.offer?.title}
                subtitle={data.latestAssets.offer ? `/${data.latestAssets.offer.slug}` : undefined}
                manageHref={data.latestAssets.offer?.manageHref}
                viewHref={data.latestAssets.offer?.viewHref}
                publishLabel={
                  data.latestAssets.offer && !data.latestAssets.offer.isPublished
                    ? "Publiceer"
                    : undefined
                }
                onPublish={
                  data.latestAssets.offer && !data.latestAssets.offer.isPublished
                    ? () => void publishAsset("publish_offer")
                    : undefined
                }
                isPublishing={actionLoading === "publish-offer"}
              />
              <RecentSetupItem
                label="Laatste space"
                title={data.latestAssets.space?.title}
                subtitle={data.latestAssets.space ? `/${data.latestAssets.space.slug}` : undefined}
                manageHref={data.latestAssets.space?.manageHref}
                viewHref={data.latestAssets.space?.viewHref}
              />
              <RecentSetupItem
                label="Laatste pagina"
                title={data.latestAssets.landingPage?.title}
                subtitle={
                  data.latestAssets.landingPage
                    ? `/${data.latestAssets.landingPage.slug}`
                    : undefined
                }
                manageHref={data.latestAssets.landingPage?.manageHref}
                viewHref={data.latestAssets.landingPage?.viewHref}
                publishLabel={
                  data.latestAssets.landingPage && !data.latestAssets.landingPage.isPublished
                    ? "Publiceer"
                    : undefined
                }
                onPublish={
                  data.latestAssets.landingPage && !data.latestAssets.landingPage.isPublished
                    ? () => void publishAsset("publish_landing_page")
                    : undefined
                }
                isPublishing={actionLoading === "publish-landing"}
              />
              <RecentSetupItem
                label="Laatste lid"
                title={data.latestAssets.member?.title}
                subtitle={
                  data.latestAssets.member
                    ? `${data.latestAssets.member.role.toLowerCase()} • ${data.latestAssets.member.subtitle}`
                    : undefined
                }
                manageHref={data.latestAssets.member?.manageHref}
              />
              <RecentSetupItem
                label="Laatst geactiveerd lid"
                title={data.latestAssets.grantedMember?.title}
                subtitle={
                  data.latestAssets.grantedMember
                    ? `${data.latestAssets.grantedMember.role.toLowerCase()} • ${data.latestAssets.grantedMember.subtitle}`
                    : undefined
                }
                manageHref={data.latestAssets.grantedMember?.manageHref}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
              <CardDescription>
                {data.onboardingCompleted
                  ? `Afgerond${data.onboardingCompletedAt ? ` op ${new Date(data.onboardingCompletedAt).toLocaleDateString("nl-BE")}` : ""}.`
                  : "Nog niet afgerond."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Plan: {data.tenant.plan}</p>
              <p>Tenant status: {data.tenant.status}</p>
              <p>
                Publieke surface: {data.readiness.hasPublicSurface ? "aanwezig" : "nog niet klaar"}
              </p>
              <p>
                Klanttoegang getest: {data.readiness.hasTestedAccess ? "ja" : "nog niet"}
              </p>
              <p>
                Open activaties: {data.readiness.hasPendingActivations ? "ja" : "nee"}
              </p>
              <p>
                Open verplichte formulieren: {data.readiness.hasPendingRequiredForms ? "ja" : "nee"}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SetupMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-white px-4 py-4 shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

function RecentSetupItem({
  label,
  title,
  subtitle,
  manageHref,
  viewHref,
  publishLabel,
  onPublish,
  isPublishing,
}: {
  label: string;
  title?: string | null;
  subtitle?: string;
  manageHref?: string;
  viewHref?: string;
  publishLabel?: string;
  onPublish?: () => void;
  isPublishing?: boolean;
}) {
  return (
    <div className="rounded-2xl border bg-muted/20 p-3">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      {title ? (
        <>
          <p className="mt-1 font-medium text-foreground">{title}</p>
          {subtitle ? <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p> : null}
          <div className="mt-3 flex gap-2">
            {manageHref ? (
              <Button size="sm" variant="outline" asChild>
                <Link href={manageHref}>Beheer</Link>
              </Button>
            ) : null}
            {viewHref ? (
              <Button size="sm" variant="ghost" asChild>
                <Link href={viewHref}>Bekijk</Link>
              </Button>
            ) : null}
            {publishLabel && onPublish ? (
              <Button size="sm" onClick={onPublish} disabled={isPublishing}>
                {isPublishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {publishLabel}
              </Button>
            ) : null}
          </div>
        </>
      ) : (
        <p className="mt-1 text-sm">Nog niet aangemaakt.</p>
      )}
    </div>
  );
}
