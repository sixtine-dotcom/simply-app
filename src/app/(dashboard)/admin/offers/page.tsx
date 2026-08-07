"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  BarChart3,
  ArrowRight,
  BadgeEuro,
  ClipboardCopy,
  CreditCard,
  Download,
  Flame,
  Gauge,
  Lightbulb,
  Layers3,
  Loader2,
  Pencil,
  Plus,
  Radar,
  ShoppingBag,
  Target,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { AdminHubCard } from "@/components/admin/hub-card";

type CourseOption = {
  id: string;
  title: string;
  slug: string;
  isPublished: boolean;
};

type Offer = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  pricingType: "one_time" | "subscription" | "payment_plan";
  priceCents: number;
  currency: string;
  billingInterval: "monthly" | "yearly" | null;
  trialDays: number | null;
  installmentCount: number | null;
  accessDurationDays: number | null;
  isPublished: boolean;
  createdAt: string;
  courses: Array<{
    course: {
      id: string;
      title: string;
      slug: string;
    };
  }>;
  assignments: Array<{
    id: string;
    startDate: string;
    endDate: string | null;
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
    };
  }>;
  recentAssignments: Array<{
    id: string;
    startDate: string;
    endDate: string | null;
    revokedAt: string | null;
    createdAt: string;
    updatedAt: string;
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
    };
  }>;
  leads: Array<{
    id: string;
    firstName: string;
    lastName: string | null;
    email: string;
    note: string | null;
    status: string;
    createdAt: string;
  }>;
  stats: {
    activeAssignments: number;
    totalAssignments: number;
    revokedAssignments: number;
    totalEnrollmentsGranted: number;
    recurringMonthlyValueCents: number;
    leadCount: number;
    newLeadCount: number;
    contactedLeadCount: number;
    convertedLeadCount: number;
    leadsLast30Days: number;
    assignmentsLast30Days: number;
    conversionRate: number;
    contactRate: number;
    lastAssignedAt: string | null;
    lastRevokedAt: string | null;
    timeline: Array<{
      key: string;
      label: string;
      leads: number;
      convertedLeads: number;
      assignments: number;
    }>;
  };
};

type OfferSummary = {
  totalOffers: number;
  publishedOffers: number;
  activeAssignments: number;
  totalEnrollmentsGranted: number;
  projectedMonthlyRecurringCents: number;
  totalLeads: number;
};

function formatEuro(cents: number) {
  return new Intl.NumberFormat("nl-BE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("nl-BE");
}

function formatPercent(value: number) {
  return `${value}%`;
}

function getPricingLabel(offer: Offer) {
  if (offer.pricingType === "subscription") {
    return `Membership${offer.billingInterval ? ` • ${offer.billingInterval}` : ""}`;
  }

  if (offer.pricingType === "payment_plan") {
    return `Payment plan${offer.installmentCount ? ` • ${offer.installmentCount} termijnen` : ""}`;
  }

  return "Eenmalige aankoop";
}

function getLeadStatusClasses(status: string) {
  if (status === "converted") return "bg-emerald-50 text-emerald-700";
  if (status === "contacted") return "bg-amber-100 text-amber-800";
  return "bg-stone-900 text-white";
}

function getOfferHealth(offer: Offer) {
  const hasRecentDemand = offer.stats.leadsLast30Days > 0;
  const isConverting = offer.stats.conversionRate >= 20;
  const hasFollowUp = offer.stats.contactRate >= 45;

  if (hasRecentDemand && isConverting) {
    return {
      label: "Scaling",
      classes: "bg-emerald-50 text-emerald-700",
      description: "Dit offer trekt vraag en zet die ook om in activatie.",
    };
  }

  if (hasRecentDemand && !hasFollowUp) {
    return {
      label: "Needs follow-up",
      classes: "bg-amber-100 text-amber-800",
      description: "Er komt vraag binnen, maar de pipeline warmt niet snel genoeg op.",
    };
  }

  if (!hasRecentDemand && offer.isPublished) {
    return {
      label: "Needs traffic",
      classes: "bg-sky-100 text-sky-800",
      description: "De offerpagina staat live, maar recente vraag blijft achter.",
    };
  }

  return {
    label: "Early",
    classes: "bg-stone-900 text-white",
    description: "Nog weinig signaal. Gebruik publicatie, traffic en outreach om tractie te testen.",
  };
}

function getOfferActionPlan(offer: Offer) {
  if (!offer.isPublished) {
    return {
      title: "Publish and test",
      detail: "Deze offer staat nog in concept. Zet hem live en stuur de eerste traffic ernaartoe.",
      priority: 95,
      tone: "bg-stone-900 text-white",
    };
  }

  if (offer.stats.newLeadCount >= 3 && offer.stats.contactRate < 40) {
    return {
      title: "Follow up leads faster",
      detail: "Er liggen warme leads in de pipeline. Voeg outreach of een handmatige opvolging toe.",
      priority: 92,
      tone: "bg-amber-100 text-amber-900",
    };
  }

  if (offer.stats.contactRate >= 40 && offer.stats.conversionRate < 15 && offer.stats.leadCount >= 4) {
    return {
      title: "Tighten the pitch",
      detail: "Interesse is er, maar de stap naar activatie blijft achter. Herwerk pricing, promise of CTA.",
      priority: 88,
      tone: "bg-rose-100 text-rose-900",
    };
  }

  if (offer.stats.leadsLast30Days === 0 && offer.stats.activeAssignments === 0) {
    return {
      title: "Drive new demand",
      detail: "Geen recente leads of activaties. Koppel deze offer aan landing pages, email of social traffic.",
      priority: 82,
      tone: "bg-sky-100 text-sky-900",
    };
  }

  if (offer.pricingType === "subscription" && offer.stats.activeAssignments > 0) {
    return {
      title: "Protect recurring revenue",
      detail: "Deze membership heeft actieve klanten. Voeg onboarding, retention en upsell-momenten toe.",
      priority: 76,
      tone: "bg-emerald-100 text-emerald-900",
    };
  }

  return {
    title: "Keep testing",
    detail: "Dit offer heeft basis-signaal. Verhoog volume met meer traffic of snellere follow-up.",
    priority: 64,
    tone: "bg-muted text-foreground",
  };
}

export default function AdminOffersPage() {
  const { toast } = useToast();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [summary, setSummary] = useState<OfferSummary>({
    totalOffers: 0,
    publishedOffers: 0,
    activeAssignments: 0,
    totalEnrollmentsGranted: 0,
    projectedMonthlyRecurringCents: 0,
    totalLeads: 0,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingOfferId, setEditingOfferId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [publicationFilter, setPublicationFilter] = useState<"all" | "live" | "draft">("all");
  const [pipelineFilter, setPipelineFilter] = useState<
    "all" | "new" | "contacted" | "converted"
  >("all");
  const [sortMode, setSortMode] = useState<
    "performance" | "recent" | "mrr" | "leads" | "title"
  >("performance");
  const [assignEmailText, setAssignEmailText] = useState<Record<string, string>>({});
  const [assignLoading, setAssignLoading] = useState<string | null>(null);
  const [revokingAssignmentId, setRevokingAssignmentId] = useState<string | null>(null);
  const [deletingOfferId, setDeletingOfferId] = useState<string | null>(null);
  const [updatingLeadId, setUpdatingLeadId] = useState<string | null>(null);
  const [convertingLeadId, setConvertingLeadId] = useState<string | null>(null);
  const [exportingType, setExportingType] = useState<null | "leads" | "assignments">(null);
  const [form, setForm] = useState({
    title: "",
    slug: "",
    description: "",
    pricingType: "one_time" as Offer["pricingType"],
    priceEuros: "49",
    billingInterval: "monthly" as "monthly" | "yearly",
    trialDays: "",
    installmentCount: "",
    accessDurationDays: "",
    isPublished: false,
    courseIds: [] as string[],
  });

  const filteredOffers = useMemo(() => {
    const value = query.trim().toLowerCase();
    return offers.filter((offer) => {
      const matchesQuery =
        !value ||
        offer.title.toLowerCase().includes(value) ||
        offer.slug.toLowerCase().includes(value);
      const matchesPublication =
        publicationFilter === "all" ||
        (publicationFilter === "live" ? offer.isPublished : !offer.isPublished);
      const matchesPipeline =
        pipelineFilter === "all" ||
        offer.leads.some((lead) => lead.status === pipelineFilter);

      return matchesQuery && matchesPublication && matchesPipeline;
    });
  }, [offers, pipelineFilter, publicationFilter, query]);

  const analytics = useMemo(() => {
    const totals = filteredOffers.reduce(
      (accumulator, offer) => {
        accumulator.leads += offer.stats.leadCount;
        accumulator.newLeads += offer.stats.newLeadCount;
        accumulator.contactedLeads += offer.stats.contactedLeadCount;
        accumulator.convertedLeads += offer.stats.convertedLeadCount;
        accumulator.activeAssignments += offer.stats.activeAssignments;
        accumulator.assignmentsLast30Days += offer.stats.assignmentsLast30Days;
        accumulator.leadsLast30Days += offer.stats.leadsLast30Days;
        accumulator.mrr += offer.stats.recurringMonthlyValueCents;
        return accumulator;
      },
      {
        leads: 0,
        newLeads: 0,
        contactedLeads: 0,
        convertedLeads: 0,
        activeAssignments: 0,
        assignmentsLast30Days: 0,
        leadsLast30Days: 0,
        mrr: 0,
      }
    );

    const timelineMap = new Map<
      string,
      { key: string; label: string; leads: number; convertedLeads: number; assignments: number }
    >();

    for (const offer of filteredOffers) {
      for (const bucket of offer.stats.timeline) {
        const current = timelineMap.get(bucket.key) || {
          key: bucket.key,
          label: bucket.label,
          leads: 0,
          convertedLeads: 0,
          assignments: 0,
        };
        current.leads += bucket.leads;
        current.convertedLeads += bucket.convertedLeads;
        current.assignments += bucket.assignments;
        timelineMap.set(bucket.key, current);
      }
    }

    const timeline = Array.from(timelineMap.values()).sort((a, b) => a.key.localeCompare(b.key));
    const strongestMonth = timeline.reduce(
      (best, bucket) => (bucket.leads > best.leads ? bucket : best),
      timeline[0] || { key: "", label: "-", leads: 0, convertedLeads: 0, assignments: 0 }
    );
    const topConversionOffer = [...filteredOffers]
      .filter((offer) => offer.stats.leadCount > 0)
      .sort((a, b) => {
        if (b.stats.conversionRate !== a.stats.conversionRate) {
          return b.stats.conversionRate - a.stats.conversionRate;
        }
        return b.stats.leadCount - a.stats.leadCount;
      })[0];
    const topMomentumOffer = [...filteredOffers]
      .filter((offer) => offer.stats.leadsLast30Days > 0 || offer.stats.assignmentsLast30Days > 0)
      .sort((a, b) => {
        const scoreA = a.stats.leadsLast30Days + a.stats.assignmentsLast30Days * 2;
        const scoreB = b.stats.leadsLast30Days + b.stats.assignmentsLast30Days * 2;
        return scoreB - scoreA;
      })[0];
    const topMrrOffer = [...filteredOffers]
      .filter((offer) => offer.stats.recurringMonthlyValueCents > 0)
      .sort(
        (a, b) => b.stats.recurringMonthlyValueCents - a.stats.recurringMonthlyValueCents
      )[0];

    return {
      ...totals,
      conversionRate:
        totals.leads > 0 ? Math.round((totals.convertedLeads / totals.leads) * 100) : 0,
      contactRate:
        totals.leads > 0
          ? Math.round(((totals.contactedLeads + totals.convertedLeads) / totals.leads) * 100)
          : 0,
      timeline,
      strongestMonth,
      topConversionOffer,
      topMomentumOffer,
      topMrrOffer,
    };
  }, [filteredOffers]);

  const timelinePeak = useMemo(
    () =>
      analytics.timeline.reduce(
        (peak, bucket) => Math.max(peak, bucket.leads, bucket.assignments, bucket.convertedLeads),
        0
      ),
    [analytics.timeline]
  );

  const sortedOffers = useMemo(() => {
    const list = [...filteredOffers];

    list.sort((a, b) => {
      if (sortMode === "recent") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }

      if (sortMode === "mrr") {
        return b.stats.recurringMonthlyValueCents - a.stats.recurringMonthlyValueCents;
      }

      if (sortMode === "leads") {
        return b.stats.leadCount - a.stats.leadCount;
      }

      if (sortMode === "title") {
        return a.title.localeCompare(b.title);
      }

      const scoreA =
        a.stats.conversionRate * 4 +
        a.stats.contactRate * 2 +
        a.stats.leadsLast30Days * 3 +
        a.stats.assignmentsLast30Days * 5;
      const scoreB =
        b.stats.conversionRate * 4 +
        b.stats.contactRate * 2 +
        b.stats.leadsLast30Days * 3 +
        b.stats.assignmentsLast30Days * 5;

      return scoreB - scoreA;
    });

    return list;
  }, [filteredOffers, sortMode]);

  const focusBoard = useMemo(
    () =>
      [...filteredOffers]
        .map((offer) => ({
          offer,
          health: getOfferHealth(offer),
          action: getOfferActionPlan(offer),
        }))
        .sort((a, b) => b.action.priority - a.action.priority)
        .slice(0, 4),
    [filteredOffers]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/offers");
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Kon offers niet laden");
      setOffers(result.offers || []);
      setCourses(result.courses || []);
      setSummary(
        result.summary || {
          totalOffers: 0,
          publishedOffers: 0,
          activeAssignments: 0,
          totalEnrollmentsGranted: 0,
          projectedMonthlyRecurringCents: 0,
          totalLeads: 0,
        }
      );
    } catch (error) {
      toast({
        title: "Fout",
        description: error instanceof Error ? error.message : "Kon offers niet laden",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const resetForm = () => {
    setEditingOfferId(null);
    setForm({
      title: "",
      slug: "",
      description: "",
      pricingType: "one_time",
      priceEuros: "49",
      billingInterval: "monthly",
      trialDays: "",
      installmentCount: "",
      accessDurationDays: "",
      isPublished: false,
      courseIds: [],
    });
  };

  const autoSlug = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        slug: form.slug,
        description: form.description || null,
        pricingType: form.pricingType,
        priceCents: Math.round(Number(form.priceEuros || "0") * 100),
        billingInterval: form.pricingType === "subscription" ? form.billingInterval : null,
        trialDays:
          form.pricingType === "subscription" && form.trialDays
            ? Number(form.trialDays)
            : null,
        installmentCount:
          form.pricingType === "payment_plan" && form.installmentCount
            ? Number(form.installmentCount)
            : null,
        accessDurationDays: form.accessDurationDays ? Number(form.accessDurationDays) : null,
        isPublished: form.isPublished,
        courseIds: form.courseIds,
      };

      const response = await fetch(
        editingOfferId ? `/api/admin/offers/${editingOfferId}` : "/api/admin/offers",
        {
          method: editingOfferId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Kon offer niet opslaan");
      }

      toast({ title: editingOfferId ? "Offer bijgewerkt" : "Offer aangemaakt" });
      resetForm();
      await load();
    } catch (error) {
      toast({
        title: "Fout",
        description: error instanceof Error ? error.message : "Kon offer niet opslaan",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const startEditing = (offer: Offer) => {
    setEditingOfferId(offer.id);
    setForm({
      title: offer.title,
      slug: offer.slug,
      description: offer.description || "",
      pricingType: offer.pricingType,
      priceEuros: (offer.priceCents / 100).toFixed(2),
      billingInterval: offer.billingInterval || "monthly",
      trialDays: offer.trialDays ? String(offer.trialDays) : "",
      installmentCount: offer.installmentCount ? String(offer.installmentCount) : "",
      accessDurationDays: offer.accessDurationDays ? String(offer.accessDurationDays) : "",
      isPublished: offer.isPublished,
      courseIds: offer.courses.map((entry) => entry.course.id),
    });
  };

  const toggleCourse = (courseId: string) => {
    setForm((prev) => ({
      ...prev,
      courseIds: prev.courseIds.includes(courseId)
        ? prev.courseIds.filter((id) => id !== courseId)
        : [...prev.courseIds, courseId],
    }));
  };

  const assignAccess = async (offerId: string) => {
    const raw = assignEmailText[offerId] || "";
    const emails = raw
      .split(/[\n,;]/)
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);

    if (emails.length === 0) {
      toast({
        title: "Geen emails",
        description: "Voeg minstens 1 email toe om toegang te geven.",
        variant: "destructive",
      });
      return;
    }

    setAssignLoading(offerId);
    try {
      const response = await fetch(`/api/admin/offers/${offerId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Toegang toekennen mislukt");

      toast({
        title: "Toegang toegekend",
        description: `${result.created} inschrijvingen aangemaakt, ${result.skipped} overgeslagen.`,
      });
      setAssignEmailText((prev) => ({ ...prev, [offerId]: "" }));
      await load();
    } catch (error) {
      toast({
        title: "Fout",
        description: error instanceof Error ? error.message : "Toegang toekennen mislukt",
        variant: "destructive",
      });
    } finally {
      setAssignLoading(null);
    }
  };

  const revokeAccess = async (offerId: string, assignmentId: string) => {
    setRevokingAssignmentId(assignmentId);
    try {
      const response = await fetch(
        `/api/admin/offers/${offerId}/assignments/${assignmentId}`,
        { method: "DELETE" }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Toegang intrekken mislukt");
      toast({ title: "Toegang ingetrokken" });
      await load();
    } catch (error) {
      toast({
        title: "Fout",
        description: error instanceof Error ? error.message : "Toegang intrekken mislukt",
        variant: "destructive",
      });
    } finally {
      setRevokingAssignmentId(null);
    }
  };

  const deleteOffer = async (offerId: string) => {
    if (!window.confirm("Weet je zeker dat je dit offer wilt verwijderen?")) {
      return;
    }

    setDeletingOfferId(offerId);
    try {
      const response = await fetch(`/api/admin/offers/${offerId}`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Offer verwijderen mislukt");

      if (editingOfferId === offerId) {
        resetForm();
      }
      toast({ title: "Offer verwijderd" });
      await load();
    } catch (error) {
      toast({
        title: "Fout",
        description: error instanceof Error ? error.message : "Offer verwijderen mislukt",
        variant: "destructive",
      });
    } finally {
      setDeletingOfferId(null);
    }
  };

  const copyPublicLink = async (offerSlug: string) => {
    const url = `${window.location.origin}/offers/${offerSlug}`;
    await navigator.clipboard.writeText(url);
    toast({ title: "Publieke link gekopieerd" });
  };

  const updateLeadStatus = async (
    offerId: string,
    leadId: string,
    status: "new" | "contacted" | "converted"
  ) => {
    setUpdatingLeadId(leadId);
    try {
      const response = await fetch(`/api/admin/offers/${offerId}/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Leadstatus bijwerken mislukt");
      await load();
      toast({ title: "Leadstatus bijgewerkt" });
    } catch (error) {
      toast({
        title: "Fout",
        description:
          error instanceof Error ? error.message : "Leadstatus bijwerken mislukt",
        variant: "destructive",
      });
    } finally {
      setUpdatingLeadId(null);
    }
  };

  const convertLead = async (offerId: string, leadId: string) => {
    setConvertingLeadId(leadId);
    try {
      const response = await fetch(`/api/admin/offers/${offerId}/leads/${leadId}/convert`, {
        method: "POST",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Lead converteren mislukt");
      await load();
      toast({
        title: "Lead geconverteerd",
        description: `${result.createdEnrollments} inschrijvingen aangemaakt, ${result.skippedEnrollments} overgeslagen.`,
      });
    } catch (error) {
      toast({
        title: "Fout",
        description:
          error instanceof Error ? error.message : "Lead converteren mislukt",
        variant: "destructive",
      });
    } finally {
      setConvertingLeadId(null);
    }
  };

  const exportCsv = async (type: "leads" | "assignments") => {
    setExportingType(type);
    try {
      const params = new URLSearchParams({
        type,
        query: query.trim(),
        publication: publicationFilter,
      });
      if (type === "leads" && pipelineFilter !== "all") {
        params.set("leadStatus", pipelineFilter);
      }

      const response = await fetch(`/api/admin/offers/export?${params.toString()}`);
      if (!response.ok) {
        let message = "Export mislukt";
        try {
          const result = await response.json();
          message = result.error || message;
        } catch {
          // Ignore JSON parse errors and keep the fallback message.
        }
        throw new Error(message);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `offers-${type}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast({ title: `${type === "leads" ? "Lead" : "Assignment"} export gestart` });
    } catch (error) {
      toast({
        title: "Fout",
        description: error instanceof Error ? error.message : "Export mislukt",
        variant: "destructive",
      });
    } finally {
      setExportingType(null);
    }
  };

  return (
    <div className="p-6 md:p-8 lg:p-12">
      <section className="relative overflow-hidden rounded-[2rem] border border-border bg-[linear-gradient(135deg,rgba(248,244,236,0.98),rgba(255,255,255,0.95))] px-6 py-7 shadow-card md:px-8 md:py-8">
        <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-[radial-gradient(circle_at_top,rgba(213,154,72,0.16),transparent_60%)] lg:block" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-3 py-1 text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground">
              <BadgeEuro className="h-3.5 w-3.5" />
              Sales Workspace
            </div>
            <h1 className="font-display text-3xl tracking-[0.16em] text-foreground md:text-4xl">
              OFFERS EN MEMBERSHIPS
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
              Bouw je revenue engine rond pakketten, memberships en trajecten. Deze laag verbindt
              je producten, leads en klanttoegang in één commercieel overzicht.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              disabled={exportingType !== null}
              onClick={() => void exportCsv("leads")}
            >
              {exportingType === "leads" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Export leads
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={exportingType !== null}
              onClick={() => void exportCsv("assignments")}
            >
              {exportingType === "assignments" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Export assignments
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/courses">
                <Layers3 className="mr-2 h-4 w-4" />
                Naar cursussen
              </Link>
            </Button>
            <Button
              type="button"
              onClick={() => {
                resetForm();
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Nieuw offer
            </Button>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Link href="/admin/offers" className="block">
          <Card className="border-0 bg-stone-950 text-white shadow-lg hover:opacity-90 transition-opacity cursor-pointer">
            <CardContent className="p-6">
              <p className="text-xs uppercase tracking-[0.22em] text-white/60">Live offers</p>
              <p className="mt-3 text-3xl font-semibold">
                {summary.publishedOffers}/{summary.totalOffers}
              </p>
              <p className="mt-2 text-sm text-white/70">publiceerbare sales pages in je catalogus</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/users?role=CLIENT" className="block">
          <Card className="hover:border-primary/30 transition-colors cursor-pointer">
            <CardContent className="p-6">
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                Actieve klanten
              </p>
              <p className="mt-3 text-3xl font-semibold">{summary.activeAssignments}</p>
              <p className="mt-2 text-sm text-muted-foreground">lopende toegang via offers</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/courses" className="block">
          <Card className="hover:border-primary/30 transition-colors cursor-pointer">
            <CardContent className="p-6">
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                Inschrijvingen
              </p>
              <p className="mt-3 text-3xl font-semibold">{summary.totalEnrollmentsGranted}</p>
              <p className="mt-2 text-sm text-muted-foreground">totale cursusactivatie via sales</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/billing" className="block">
          <Card className="hover:border-primary/30 transition-colors cursor-pointer">
            <CardContent className="p-6">
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">MRR</p>
              <p className="mt-3 text-3xl font-semibold">
                {formatEuro(summary.projectedMonthlyRecurringCents)}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">geschatte maandelijkse recurring omzet</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/offers" className="block">
          <Card className="hover:border-primary/30 transition-colors cursor-pointer">
            <CardContent className="p-6">
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Leads</p>
              <p className="mt-3 text-3xl font-semibold">{summary.totalLeads}</p>
              <p className="mt-2 text-sm text-muted-foreground">interesse vanuit publieke offerpagina’s</p>
            </CardContent>
          </Card>
        </Link>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="overflow-hidden">
          <CardHeader className="gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Sales analytics
              </CardTitle>
              <CardDescription>
                Filter-aware funnel metrics voor je huidige offerselectie.
              </CardDescription>
            </div>
            <div className="rounded-full border border-border bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
              {filteredOffers.length} offers in scope
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-2xl bg-stone-950 px-4 py-4 text-white">
                <p className="text-xs uppercase tracking-[0.2em] text-white/60">Conversion</p>
                <p className="mt-3 text-3xl font-semibold">
                  {formatPercent(analytics.conversionRate)}
                </p>
                <p className="mt-2 text-sm text-white/70">
                  {analytics.convertedLeads} van {analytics.leads} leads zijn klant geworden
                </p>
              </div>
              <div className="rounded-2xl bg-muted/50 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Contact rate
                </p>
                <p className="mt-3 text-3xl font-semibold">
                  {formatPercent(analytics.contactRate)}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  leads die minimaal opgevolgd of geconverteerd zijn
                </p>
              </div>
              <div className="rounded-2xl bg-muted/50 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Laatste 30 dagen
                </p>
                <p className="mt-3 text-3xl font-semibold">{analytics.leadsLast30Days}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  nieuwe inbound leads in de recente periode
                </p>
              </div>
              <div className="rounded-2xl bg-muted/50 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Fulfilment 30d
                </p>
                <p className="mt-3 text-3xl font-semibold">{analytics.assignmentsLast30Days}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  nieuwe activaties vanuit sales en handmatige toekenning
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
              <div className="rounded-[1.6rem] border border-border bg-background/80 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">6-maanden trend</p>
                    <p className="text-xs text-muted-foreground">
                      Leads, conversies en activaties per maand.
                    </p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    Sterkste maand: <span className="font-medium text-foreground">{analytics.strongestMonth.label}</span>
                  </div>
                </div>
                {analytics.timeline.length === 0 ? (
                  <p className="mt-6 text-sm text-muted-foreground">Nog geen trenddata.</p>
                ) : (
                  <div className="mt-6 grid grid-cols-6 gap-3">
                    {analytics.timeline.map((bucket) => (
                      <div key={bucket.key} className="flex flex-col items-center gap-3">
                        <div className="flex h-40 items-end gap-1">
                          <div
                            className="w-3 rounded-t-full bg-stone-900/85"
                            style={{
                              height: `${timelinePeak > 0 ? Math.max((bucket.leads / timelinePeak) * 100, bucket.leads > 0 ? 8 : 0) : 0}%`,
                            }}
                            title={`${bucket.leads} leads`}
                          />
                          <div
                            className="w-3 rounded-t-full bg-amber-400"
                            style={{
                              height: `${timelinePeak > 0 ? Math.max((bucket.convertedLeads / timelinePeak) * 100, bucket.convertedLeads > 0 ? 8 : 0) : 0}%`,
                            }}
                            title={`${bucket.convertedLeads} converted`}
                          />
                          <div
                            className="w-3 rounded-t-full bg-emerald-500"
                            style={{
                              height: `${timelinePeak > 0 ? Math.max((bucket.assignments / timelinePeak) * 100, bucket.assignments > 0 ? 8 : 0) : 0}%`,
                            }}
                            title={`${bucket.assignments} assignments`}
                          />
                        </div>
                        <div className="text-center text-xs text-muted-foreground">
                          <p className="font-medium text-foreground">{bucket.label}</p>
                          <p>{bucket.leads} leads</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="rounded-[1.6rem] border border-border bg-muted/40 p-4">
                  <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Gauge className="h-4 w-4 text-primary" />
                    Beste conversie
                  </p>
                  <p className="mt-3 text-lg font-semibold">
                    {analytics.topConversionOffer?.title || "Nog geen leaddata"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {analytics.topConversionOffer
                      ? `${formatPercent(analytics.topConversionOffer.stats.conversionRate)} conversie op ${analytics.topConversionOffer.stats.leadCount} leads`
                      : "Zodra leads binnenkomen, verschijnt hier je best converterende offer."}
                  </p>
                </div>
                <div className="rounded-[1.6rem] border border-border bg-muted/40 p-4">
                  <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Flame className="h-4 w-4 text-primary" />
                    Hoogste momentum
                  </p>
                  <p className="mt-3 text-lg font-semibold">
                    {analytics.topMomentumOffer?.title || "Nog geen recente activiteit"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {analytics.topMomentumOffer
                      ? `${analytics.topMomentumOffer.stats.leadsLast30Days} leads en ${analytics.topMomentumOffer.stats.assignmentsLast30Days} activaties in 30 dagen`
                      : "Gebruik publicatie en follow-up om nieuwe beweging in de funnel te krijgen."}
                  </p>
                </div>
                <div className="rounded-[1.6rem] border border-border bg-muted/40 p-4">
                  <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <CreditCard className="h-4 w-4 text-primary" />
                    Grootste recurring driver
                  </p>
                  <p className="mt-3 text-lg font-semibold">
                    {analytics.topMrrOffer?.title || "Nog geen MRR-offer"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {analytics.topMrrOffer
                      ? `${formatEuro(analytics.topMrrOffer.stats.recurringMonthlyValueCents)} MRR uit actieve memberships`
                      : "Subscriptions en memberships verschijnen hier zodra er actieve klanten zijn."}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Offer leaderboard</CardTitle>
            <CardDescription>
              Vergelijk pipelinekwaliteit en actuele tractie per offer.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredOffers.length === 0 ? (
                <p className="text-sm text-muted-foreground">Geen offers binnen deze filters.</p>
              ) : (
                filteredOffers
                  .slice()
                  .sort((a, b) => {
                    const scoreA =
                      a.stats.conversionRate * 4 +
                      a.stats.leadsLast30Days * 3 +
                      a.stats.assignmentsLast30Days * 5;
                    const scoreB =
                      b.stats.conversionRate * 4 +
                      b.stats.leadsLast30Days * 3 +
                      b.stats.assignmentsLast30Days * 5;
                    return scoreB - scoreA;
                  })
                  .slice(0, 5)
                  .map((offer) => {
                    const performanceScore = Math.min(
                      100,
                      offer.stats.conversionRate * 0.5 +
                        offer.stats.contactRate * 0.2 +
                        offer.stats.leadsLast30Days * 4 +
                        offer.stats.assignmentsLast30Days * 6
                    );

                    return (
                      <div key={offer.id} className="rounded-2xl border border-border bg-background/80 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-foreground">{offer.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {offer.stats.leadCount} leads • {offer.stats.activeAssignments} actief
                            </p>
                          </div>
                          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                            {Math.round(performanceScore)}/100
                          </span>
                        </div>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-stone-900"
                            style={{ width: `${Math.max(performanceScore, 6)}%` }}
                          />
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                          <div className="rounded-xl bg-muted/50 px-3 py-2">
                            Conv. <span className="font-medium text-foreground">{formatPercent(offer.stats.conversionRate)}</span>
                          </div>
                          <div className="rounded-xl bg-muted/50 px-3 py-2">
                            30d leads <span className="font-medium text-foreground">{offer.stats.leadsLast30Days}</span>
                          </div>
                          <div className="rounded-xl bg-muted/50 px-3 py-2">
                            30d activaties <span className="font-medium text-foreground">{offer.stats.assignmentsLast30Days}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Radar className="h-5 w-5 text-primary" />
              Focus board
            </CardTitle>
            <CardDescription>
              Prioriteiten voor deze week op basis van publicatie, leadflow en conversie.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {focusBoard.length === 0 ? (
              <p className="text-sm text-muted-foreground">Geen offers binnen de huidige filters.</p>
            ) : (
              <div className="space-y-3">
                {focusBoard.map(({ offer, health, action }) => (
                  <div
                    key={offer.id}
                    className="rounded-[1.4rem] border border-border bg-background/80 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">{offer.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {offer.stats.leadCount} leads • {offer.stats.activeAssignments} actief •{" "}
                          {formatPercent(offer.stats.conversionRate)} conversie
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${health.classes}`}>
                          {health.label}
                        </span>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${action.tone}`}>
                          P{action.priority}
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 rounded-2xl bg-muted/40 p-3">
                      <p className="text-sm font-medium text-foreground">{action.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{action.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-primary" />
              Sales playbook
            </CardTitle>
            <CardDescription>
              Richting voor wat je nu moet optimaliseren, afhankelijk van het signaal in je funnel.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <div className="rounded-[1.4rem] border border-border bg-muted/30 p-4">
              <p className="text-sm font-medium text-foreground">If traffic is weak</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Gebruik live offers zonder recente leads als distributie-prioriteit. Koppel ze aan
                landing pages, homepage CTA&apos;s en emailcampagnes.
              </p>
            </div>
            <div className="rounded-[1.4rem] border border-border bg-muted/30 p-4">
              <p className="text-sm font-medium text-foreground">If follow-up is weak</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Nieuwe leads zonder contactmoment betekenen meestal een procesprobleem. Werk met
                dagelijkse follow-up en conversion notes.
              </p>
            </div>
            <div className="rounded-[1.4rem] border border-border bg-muted/30 p-4">
              <p className="text-sm font-medium text-foreground">If conversion is weak</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Wanneer leads wel warm worden maar niet kopen, moet de pitch scherper: resultaat,
                offer stack, prijsframe en CTA.
              </p>
            </div>
            <div className="rounded-[1.4rem] border border-border bg-muted/30 p-4">
              <p className="text-sm font-medium text-foreground">If MRR is growing</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Memberships met actieve klanten verdienen retention flows: onboarding, check-ins,
                upgrades en community-ritme.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-4">
        <AdminHubCard
          icon={<BadgeEuro className="h-5 w-5" />}
          title="Offers"
          description="Deze hub stuurt pricing, publication, fulfilment en recurring revenue."
          href="/admin/offers"
          cta="Open offers"
          active
        />
        <AdminHubCard
          icon={<Layers3 className="h-5 w-5" />}
          title="Products"
          description="Koppel je saleslaag aan cursussen, trajecten en community-access."
          href="/admin/courses"
          cta="Open products"
        />
        <AdminHubCard
          icon={<Target className="h-5 w-5" />}
          title="Website"
          description="Gebruik landing pages als conversion surface voor offers en memberships."
          href="/admin/landing-pages"
          cta="Open website"
        />
        <AdminHubCard
          icon={<UserRound className="h-5 w-5" />}
          title="People"
          description="Geef handmatig toegang, volg leads op en beheer klantactivatie."
          href="/admin/users"
          cta="Open people"
        />
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              {editingOfferId ? "Offer bewerken" : "Nieuw offer"}
            </CardTitle>
            <CardDescription>
              Zet een eenmalig pakket, membership of payment plan live en koppel direct je producten.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              {editingOfferId ? (
                <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
                  <span>Je bewerkt een bestaand offer.</span>
                  <Button type="button" variant="ghost" size="sm" onClick={resetForm}>
                    <X className="mr-2 h-4 w-4" />
                    Annuleren
                  </Button>
                </div>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="title">Titel</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      title: e.target.value,
                      slug: !prev.slug || prev.slug === autoSlug(prev.title)
                        ? autoSlug(e.target.value)
                        : prev.slug,
                    }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={form.slug}
                  onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Beschrijving</Label>
                <textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="min-h-[80px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="pricingType">Prijsmodel</Label>
                  <select
                    id="pricingType"
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                    value={form.pricingType}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        pricingType: e.target.value as Offer["pricingType"],
                      }))
                    }
                  >
                    <option value="one_time">Eenmalig</option>
                    <option value="subscription">Membership / subscription</option>
                    <option value="payment_plan">Payment plan</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Prijs (EUR)</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.priceEuros}
                    onChange={(e) => setForm((prev) => ({ ...prev, priceEuros: e.target.value }))}
                    required
                  />
                </div>
              </div>

              {form.pricingType === "subscription" ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="billingInterval">Interval</Label>
                    <select
                      id="billingInterval"
                      className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                      value={form.billingInterval}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          billingInterval: e.target.value as "monthly" | "yearly",
                        }))
                      }
                    >
                      <option value="monthly">Maandelijks</option>
                      <option value="yearly">Jaarlijks</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="trialDays">Trial dagen</Label>
                    <Input
                      id="trialDays"
                      type="number"
                      min="0"
                      value={form.trialDays}
                      onChange={(e) => setForm((prev) => ({ ...prev, trialDays: e.target.value }))}
                    />
                  </div>
                </div>
              ) : null}

              {form.pricingType === "payment_plan" ? (
                <div className="space-y-2">
                  <Label htmlFor="installmentCount">Aantal termijnen</Label>
                  <Input
                    id="installmentCount"
                    type="number"
                    min="2"
                    value={form.installmentCount}
                    onChange={(e) => setForm((prev) => ({ ...prev, installmentCount: e.target.value }))}
                  />
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="accessDurationDays">Toegang in dagen (optioneel)</Label>
                <Input
                  id="accessDurationDays"
                  type="number"
                  min="1"
                  value={form.accessDurationDays}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, accessDurationDays: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Gekoppelde cursussen</Label>
                <div className="max-h-44 space-y-2 overflow-auto rounded-xl border p-3">
                  {courses.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Maak eerst een cursus aan.</p>
                  ) : (
                    courses.map((course) => (
                      <label key={course.id} className="flex items-center gap-3 text-sm">
                        <input
                          type="checkbox"
                          checked={form.courseIds.includes(course.id)}
                          onChange={() => toggleCourse(course.id)}
                        />
                        <span>
                          {course.title}
                          {!course.isPublished ? " (concept)" : ""}
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <label className="flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={form.isPublished}
                  onChange={(e) => setForm((prev) => ({ ...prev, isPublished: e.target.checked }))}
                />
                Direct publiceren
              </label>

              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShoppingBag className="mr-2 h-4 w-4" />}
                {editingOfferId ? "Offer bijwerken" : "Offer opslaan"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="gap-4 md:flex-row md:items-end md:justify-between">
            <CardTitle className="flex items-center gap-2">
              <BadgeEuro className="h-5 w-5 text-primary" />
              Revenue overview
            </CardTitle>
            <CardDescription>
              Volg publicatie, fulfillment en leadopvolging per offer.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_180px]">
              <Input
                placeholder="Zoek offer, slug of aanbod..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <select
                className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
                value={publicationFilter}
                onChange={(e) =>
                  setPublicationFilter(e.target.value as "all" | "live" | "draft")
                }
              >
                <option value="all">Alle publicatiestatussen</option>
                <option value="live">Alleen live</option>
                <option value="draft">Alleen concept</option>
              </select>
              <div className="grid gap-3 md:col-span-3 md:grid-cols-[180px_180px]">
                <select
                  className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
                  value={pipelineFilter}
                  onChange={(e) =>
                    setPipelineFilter(
                      e.target.value as "all" | "new" | "contacted" | "converted"
                    )
                  }
                >
                  <option value="all">Alle leadfasen</option>
                  <option value="new">Nieuwe leads</option>
                  <option value="contacted">Contact opgenomen</option>
                  <option value="converted">Geconverteerd</option>
                </select>
                <select
                  className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
                  value={sortMode}
                  onChange={(e) =>
                    setSortMode(
                      e.target.value as "performance" | "recent" | "mrr" | "leads" | "title"
                    )
                  }
                >
                  <option value="performance">Sorteer op performance</option>
                  <option value="recent">Sorteer op nieuwst</option>
                  <option value="mrr">Sorteer op MRR</option>
                  <option value="leads">Sorteer op leads</option>
                  <option value="title">Sorteer op titel</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="py-12 text-center">
                <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : sortedOffers.length === 0 ? (
              <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                Nog geen offers aangemaakt.
              </div>
            ) : (
              <div className="space-y-3">
                {sortedOffers.map((offer) => {
                  const health = getOfferHealth(offer);
                  const stageTotal = Math.max(
                    offer.stats.newLeadCount +
                      offer.stats.contactedLeadCount +
                      offer.stats.convertedLeadCount,
                    1
                  );
                  const offerTimelinePeak = Math.max(
                    ...offer.stats.timeline.map((bucket) =>
                      Math.max(bucket.leads, bucket.convertedLeads, bucket.assignments)
                    ),
                    0
                  );

                  return (
                    <div
                      key={offer.id}
                      className="rounded-[1.6rem] border border-border bg-background/90 p-5 shadow-sm transition-colors hover:border-primary/30"
                    >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-lg font-semibold">{offer.title}</p>
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                              offer.isPublished
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {offer.isPublished ? "Live" : "Concept"}
                          </span>
                          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                            {getPricingLabel(offer)}
                          </span>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${health.classes}`}>
                            {health.label}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">/{offer.slug}</p>
                        {offer.description ? (
                          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                            {offer.description}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => startEditing(offer)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Bewerken
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={deletingOfferId === offer.id}
                          onClick={() => void deleteOffer(offer.id)}
                        >
                          {deletingOfferId === offer.id ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="mr-2 h-4 w-4" />
                          )}
                          Verwijderen
                        </Button>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span className="rounded-full bg-muted px-3 py-1.5">
                        {formatEuro(offer.priceCents)}
                        {offer.billingInterval ? ` / ${offer.billingInterval}` : ""}
                      </span>
                      {offer.trialDays ? (
                        <span className="rounded-full bg-muted px-3 py-1.5">
                          {offer.trialDays} dagen trial
                        </span>
                      ) : null}
                      {offer.installmentCount ? (
                        <span className="rounded-full bg-muted px-3 py-1.5">
                          {offer.installmentCount} termijnen
                        </span>
                      ) : null}
                      {offer.accessDurationDays ? (
                        <span className="rounded-full bg-muted px-3 py-1.5">
                          {offer.accessDurationDays} dagen toegang
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-4 grid gap-3 text-xs text-muted-foreground md:grid-cols-2 xl:grid-cols-7">
                      <div className="rounded-2xl bg-muted/50 px-4 py-3">
                        Actief:{" "}
                        <span className="font-medium text-foreground">{offer.stats.activeAssignments}</span>
                      </div>
                      <div className="rounded-2xl bg-muted/50 px-4 py-3">
                        Historisch:{" "}
                        <span className="font-medium text-foreground">{offer.stats.totalAssignments}</span>
                      </div>
                      <div className="rounded-2xl bg-muted/50 px-4 py-3">
                        Enrollments:{" "}
                        <span className="font-medium text-foreground">{offer.stats.totalEnrollmentsGranted}</span>
                      </div>
                      <div className="rounded-2xl bg-muted/50 px-4 py-3">
                        MRR:{" "}
                        <span className="font-medium text-foreground">
                          {formatEuro(offer.stats.recurringMonthlyValueCents)}
                        </span>
                      </div>
                      <div className="rounded-2xl bg-muted/50 px-4 py-3">
                        Leads:{" "}
                        <span className="font-medium text-foreground">{offer.stats.leadCount}</span>
                      </div>
                      <div className="rounded-2xl bg-muted/50 px-4 py-3">
                        Conv.:{" "}
                        <span className="font-medium text-foreground">
                          {formatPercent(offer.stats.conversionRate)}
                        </span>
                      </div>
                      <div className="rounded-2xl bg-muted/50 px-4 py-3">
                        30d:{" "}
                        <span className="font-medium text-foreground">
                          {offer.stats.leadsLast30Days} leads / {offer.stats.assignmentsLast30Days} activaties
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 text-sm text-muted-foreground">
                      {offer.courses.length === 0
                        ? "Nog geen cursussen gekoppeld."
                        : `Cursussen: ${offer.courses.map((entry) => entry.course.title).join(", ")}`}
                    </div>

                    <div className="mt-2 text-xs text-muted-foreground">
                      {offer.stats.lastAssignedAt
                        ? `Laatste toekenning: ${formatDate(offer.stats.lastAssignedAt)}`
                        : "Nog geen toegang toegekend."}
                      {offer.stats.lastRevokedAt
                        ? ` • Laatste intrekking: ${formatDate(offer.stats.lastRevokedAt)}`
                        : ""}
                    </div>

                    <div className="mt-4 grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
                      <div className="rounded-[1.4rem] border border-border bg-muted/25 p-4">
                        <div className="flex items-center gap-2">
                          <Activity className="h-4 w-4 text-primary" />
                          <p className="text-sm font-medium text-foreground">Offer diagnostics</p>
                        </div>
                        <p className="mt-2 text-xs leading-5 text-muted-foreground">
                          {health.description}
                        </p>

                        <div className="mt-4">
                          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                            <span>Pipeline stage mix</span>
                            <span>{offer.stats.leadCount} leads totaal</span>
                          </div>
                          <div className="flex h-3 overflow-hidden rounded-full bg-muted">
                            <div
                              className="bg-stone-900"
                              style={{
                                width: `${(offer.stats.newLeadCount / stageTotal) * 100}%`,
                              }}
                            />
                            <div
                              className="bg-amber-400"
                              style={{
                                width: `${(offer.stats.contactedLeadCount / stageTotal) * 100}%`,
                              }}
                            />
                            <div
                              className="bg-emerald-500"
                              style={{
                                width: `${(offer.stats.convertedLeadCount / stageTotal) * 100}%`,
                              }}
                            />
                          </div>
                          <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                            <div className="rounded-xl bg-background px-3 py-2">
                              New <span className="font-medium text-foreground">{offer.stats.newLeadCount}</span>
                            </div>
                            <div className="rounded-xl bg-background px-3 py-2">
                              Contacted <span className="font-medium text-foreground">{offer.stats.contactedLeadCount}</span>
                            </div>
                            <div className="rounded-xl bg-background px-3 py-2">
                              Converted <span className="font-medium text-foreground">{offer.stats.convertedLeadCount}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-[1.4rem] border border-border bg-muted/25 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-foreground">Offer trendline</p>
                            <p className="text-xs text-muted-foreground">
                              Micro-view van de laatste 6 maanden.
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {offer.stats.leadsLast30Days} nieuwe leads in 30d
                          </p>
                        </div>
                        <div className="mt-4 grid grid-cols-6 gap-2">
                          {offer.stats.timeline.map((bucket) => (
                            <div key={bucket.key} className="flex flex-col items-center gap-2">
                              <div className="flex h-24 items-end gap-1">
                                <div
                                  className="w-2 rounded-t-full bg-stone-900/85"
                                  style={{
                                    height: `${offerTimelinePeak > 0 ? Math.max((bucket.leads / offerTimelinePeak) * 100, bucket.leads > 0 ? 8 : 0) : 0}%`,
                                  }}
                                />
                                <div
                                  className="w-2 rounded-t-full bg-amber-400"
                                  style={{
                                    height: `${offerTimelinePeak > 0 ? Math.max((bucket.convertedLeads / offerTimelinePeak) * 100, bucket.convertedLeads > 0 ? 8 : 0) : 0}%`,
                                  }}
                                />
                                <div
                                  className="w-2 rounded-t-full bg-emerald-500"
                                  style={{
                                    height: `${offerTimelinePeak > 0 ? Math.max((bucket.assignments / offerTimelinePeak) * 100, bucket.assignments > 0 ? 8 : 0) : 0}%`,
                                  }}
                                />
                              </div>
                              <div className="text-center text-[11px] text-muted-foreground">
                                <p className="font-medium text-foreground">{bucket.label}</p>
                                <p>{bucket.leads}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {offer.isPublished ? (
                      <div className="mt-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void copyPublicLink(offer.slug)}
                        >
                          <ClipboardCopy className="mr-2 h-4 w-4" />
                          Kopieer publieke offerlink
                        </Button>
                      </div>
                    ) : null}
                    <div className="mt-4 rounded-[1.4rem] bg-muted/40 p-4">
                      <p className="mb-2 text-sm font-medium text-foreground">
                        Toegang geven via dit offer
                      </p>
                      <p className="mb-3 text-xs text-muted-foreground">
                        Gebruik dit voor handmatige fulfilment of concierge sales.
                      </p>
                      <textarea
                        value={assignEmailText[offer.id] || ""}
                        onChange={(e) =>
                          setAssignEmailText((prev) => ({
                            ...prev,
                            [offer.id]: e.target.value,
                          }))
                        }
                        placeholder="klant1@email.com&#10;klant2@email.com"
                        className="min-h-[84px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      />
                      <div className="mt-3">
                        <Button
                          size="sm"
                          disabled={assignLoading === offer.id || offer.courses.length === 0}
                          onClick={() => void assignAccess(offer.id)}
                        >
                          {assignLoading === offer.id ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : null}
                          Toegang toekennen
                        </Button>
                      </div>
                    </div>

                    <div className="mt-4">
                      <p className="mb-2 text-sm font-medium text-foreground">
                        Actieve assignments
                      </p>
                      {offer.assignments.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          Nog geen actieve assignments.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {offer.assignments.map((assignment) => (
                            <div
                              key={assignment.id}
                              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-background p-3"
                            >
                              <div>
                                <p className="text-sm font-medium">
                                  {assignment.user.firstName} {assignment.user.lastName}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {assignment.user.email}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Start: {formatDate(assignment.startDate)}
                                  {assignment.endDate
                                    ? ` • Eind: ${formatDate(assignment.endDate)}`
                                    : ""}
                                </p>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={revokingAssignmentId === assignment.id}
                                onClick={() => void revokeAccess(offer.id, assignment.id)}
                              >
                                {revokingAssignmentId === assignment.id ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="mr-2 h-4 w-4" />
                                )}
                                Intrekken
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="mt-4">
                      <p className="mb-2 text-sm font-medium text-foreground">
                        Recente activiteit
                      </p>
                      {offer.recentAssignments.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          Nog geen recente offer-activiteit.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {offer.recentAssignments.map((assignment) => (
                            <div
                              key={assignment.id}
                              className="rounded-xl border bg-background px-3 py-3 text-sm"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="font-medium">
                                  {assignment.user.firstName} {assignment.user.lastName}
                                </p>
                                <span
                                  className={`rounded-full px-2 py-1 text-xs ${
                                    assignment.revokedAt
                                      ? "bg-yellow-100 text-yellow-700"
                                      : "bg-green-100 text-green-700"
                                  }`}
                                >
                                  {assignment.revokedAt ? "Ingetrokken" : "Actief"}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {assignment.user.email}
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                Toegekend op {formatDate(assignment.createdAt)}
                                {assignment.revokedAt
                                  ? ` • Ingetrokken op ${formatDate(assignment.revokedAt)}`
                                  : ""}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="mt-4">
                      <p className="mb-2 text-sm font-medium text-foreground">
                        Recente leads
                      </p>
                      {offer.leads.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          Nog geen leads voor dit offer.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {offer.leads.map((lead) => (
                            <div
                              key={lead.id}
                              className="rounded-xl border bg-background px-3 py-3 text-sm"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="font-medium">
                                  {lead.firstName} {lead.lastName || ""}
                                </p>
                                <div className="flex flex-wrap items-center gap-2">
                                  <select
                                    value={lead.status}
                                    disabled={
                                      updatingLeadId === lead.id || convertingLeadId === lead.id
                                    }
                                    onChange={(e) =>
                                      void updateLeadStatus(
                                        offer.id,
                                        lead.id,
                                        e.target.value as "new" | "contacted" | "converted"
                                      )
                                    }
                                    className={`rounded-full border border-border px-2 py-1 text-xs ${getLeadStatusClasses(lead.status)}`}
                                  >
                                    <option value="new">new</option>
                                    <option value="contacted">contacted</option>
                                    <option value="converted">converted</option>
                                  </select>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    disabled={
                                      lead.status === "converted" || convertingLeadId === lead.id
                                    }
                                    onClick={() => void convertLead(offer.id, lead.id)}
                                  >
                                    {convertingLeadId === lead.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      "Convert & grant"
                                    )}
                                  </Button>
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground">{lead.email}</p>
                              {lead.note ? (
                                <p className="mt-1 text-xs text-muted-foreground">{lead.note}</p>
                              ) : null}
                              <p className="mt-1 text-xs text-muted-foreground">
                                Aangevraagd op {formatDate(lead.createdAt)}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Sales operating model</CardTitle>
            <CardDescription>
              Richt deze pagina in als revenue hub, niet als losse prijslijst.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div className="rounded-2xl bg-muted/50 p-4">
              <p className="font-medium text-foreground">1. Core offer</p>
              <p className="mt-1">
                Start met een flagship offer dat je belangrijkste transformatie en community bundelt.
              </p>
            </div>
            <div className="rounded-2xl bg-muted/50 p-4">
              <p className="font-medium text-foreground">2. Recurring layer</p>
              <p className="mt-1">
                Gebruik memberships voor continuïteit, support en voorspelbare maandelijkse omzet.
              </p>
            </div>
            <div className="rounded-2xl bg-muted/50 p-4">
              <p className="font-medium text-foreground">3. Concierge fulfilment</p>
              <p className="mt-1">
                Ken handmatig toegang toe voor high-ticket sales, affiliate deals of support cases.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Snelle acties</CardTitle>
            <CardDescription>Werk verder aan je commerciële funnel.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-between" variant="outline" asChild>
              <Link href="/admin/courses">
                Producten koppelen
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button className="w-full justify-between" variant="outline" asChild>
              <Link href="/admin/landing-pages">
                Landing pages beheren
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button className="w-full justify-between" variant="outline" asChild>
              <Link href="/admin/billing">
                Billing bekijken
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pipeline stage mix</CardTitle>
            <CardDescription>Verhouding tussen nieuwe, opgevolgde en geconverteerde leads.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl bg-muted/50 p-4">
              <p className="text-sm text-muted-foreground">Nieuwe leads</p>
              <p className="mt-2 text-2xl font-semibold">
                {analytics.newLeads}
              </p>
            </div>
            <div className="rounded-2xl bg-muted/50 p-4">
              <p className="text-sm text-muted-foreground">Contact opgenomen</p>
              <p className="mt-2 text-2xl font-semibold">
                {analytics.contactedLeads}
              </p>
            </div>
            <div className="rounded-2xl bg-muted/50 p-4">
              <p className="text-sm text-muted-foreground">Geconverteerd</p>
              <p className="mt-2 text-2xl font-semibold">{analytics.convertedLeads}</p>
            </div>
            <div className="rounded-2xl border border-dashed border-border p-4">
              <p className="text-sm text-muted-foreground">Opvolgingsefficiëntie</p>
              <p className="mt-2 text-2xl font-semibold">{formatPercent(analytics.contactRate)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                aandeel leads dat niet meer in de ruwe &quot;new&quot; fase zit
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
