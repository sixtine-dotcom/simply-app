"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCurrentUserSummary } from "@/hooks/use-current-user";
import { getDashboardHomeHref, isAdminRole } from "@/lib/current-user";
import { useToast } from "@/components/ui/use-toast";
import { useLocale } from "@/components/layout/locale-provider";
import { Loader2, User, Lock, Bell, MessageCircle, Camera, Laptop, Shield, Smartphone, Trash2, ChevronLeft, Activity, Target, Dumbbell } from "lucide-react";
import { FavoriteRecipeButton } from "@/components/recipes/favorite-recipe-button";

interface SessionData {
  id: string;
  createdAt: string;
  expiresAt: string;
  userAgent: string | null;
  ipAddress: string | null;
  isCurrent: boolean;
  deviceLabel: string;
}

interface SecurityAlert {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  isRead: boolean;
}

interface FavoriteRecipeEntry {
  id: string;
  recipeId: string | null;
  customRecipeId: string | null;
  recipe: {
    id: string;
    slug: string;
    title: string;
    imageUrl: string | null;
  } | null;
  customRecipe: {
    id: string;
    title: string;
    imageUrl: string | null;
  } | null;
}

interface MealPlanHistoryEntry {
  id: string;
  weekStart: string;
  items: Array<{
    id: string;
    dayOfWeek: number;
    mealType: string;
    isCustom: boolean;
    customTitle: string | null;
    recipe: {
      id: string;
      title: string;
    } | null;
  }>;
}

type HealthProfileForm = {
  goal: "WEIGHT_LOSS" | "WEIGHT_GAIN" | "SYMPTOM_RELIEF" | "MUSCLE_GAIN";
  biologicalSex: "FEMALE" | "MALE";
  age: string;
  heightCm: string;
  weightKg: string;
  targetWeightKg: string;
  activityLevel: "SEDENTARY" | "LIGHT" | "MODERATE" | "HIGH" | "ATHLETE";
  trainingSessionsPerWeek: string;
  averageDailySteps: string;
  primarySport: string;
  symptoms: string;
};

type HealthProfileResponse = {
  profile: {
    goal: HealthProfileForm["goal"];
    biologicalSex: HealthProfileForm["biologicalSex"];
    age: number;
    heightCm: number;
    weightKg: number;
    targetWeightKg: number | null;
    activityLevel: HealthProfileForm["activityLevel"];
    trainingSessionsPerWeek: number;
    averageDailySteps: number;
    primarySport: string | null;
    symptoms: string | null;
    calorieTarget: number;
    proteinTargetGrams: number;
    carbsTargetGrams: number;
    fatTargetGrams: number;
    completedAt: string | null;
  } | null;
  isComplete: boolean;
};

const goalOptions = [
  { value: "WEIGHT_LOSS", label: "Gewichtsverlies" },
  { value: "WEIGHT_GAIN", label: "Bijkomen" },
  { value: "SYMPTOM_RELIEF", label: "Klachten elimineren" },
  { value: "MUSCLE_GAIN", label: "Spieropbouw" },
] as const;

const activityOptions = [
  { value: "SEDENTARY", label: "Zittend / weinig beweging" },
  { value: "LIGHT", label: "Licht actief" },
  { value: "MODERATE", label: "Matig actief" },
  { value: "HIGH", label: "Zeer actief" },
  { value: "ATHLETE", label: "Sportief / atleet" },
] as const;

const emptyHealthProfile: HealthProfileForm = {
  goal: "WEIGHT_LOSS",
  biologicalSex: "FEMALE",
  age: "",
  heightCm: "",
  weightKg: "",
  targetWeightKg: "",
  activityLevel: "MODERATE",
  trainingSessionsPerWeek: "",
  averageDailySteps: "",
  primarySport: "",
  symptoms: "",
};

function toLocalDateInput(value: string) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function SettingsPage() {
  const { toast } = useToast();
  const { t } = useLocale();
  const searchParams = useSearchParams();
  const { user, refreshUser } = useCurrentUserSummary();
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingHealthProfile, setIsSavingHealthProfile] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    bio: "",
    preferredLanguage: "nl" as "nl" | "en",
  });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);
  const [revokingOthers, setRevokingOthers] = useState(false);
  const [securityAlerts, setSecurityAlerts] = useState<SecurityAlert[]>([]);
  const [favoriteRecipes, setFavoriteRecipes] = useState<FavoriteRecipeEntry[]>([]);
  const [mealPlanHistory, setMealPlanHistory] = useState<MealPlanHistoryEntry[]>([]);
  const [loadingRecipeAccountData, setLoadingRecipeAccountData] = useState(true);
  const [healthProfile, setHealthProfile] = useState<HealthProfileForm>(emptyHealthProfile);
  const [healthProfileResult, setHealthProfileResult] = useState<HealthProfileResponse | null>(null);
  const [loadingHealthProfile, setLoadingHealthProfile] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const healthProfileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSessions();
    fetchHealthProfile();
    fetchRecipeAccountData();
  }, []);

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone ?? "",
        bio: user.bio ?? "",
        preferredLanguage: user.preferredLanguage ?? "nl",
      });
      setAvatarUrl(user.avatarUrl ?? null);
    }
  }, [user]);

  useEffect(() => {
    if (searchParams.get("focus") === "health-profile") {
      healthProfileRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [searchParams]);

  const fetchSessions = async () => {
    setLoadingSessions(true);
    try {
      const response = await fetch("/api/auth/sessions");
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Kon sessies niet laden");
      }
      setSessions(data.sessions || []);
      setSecurityAlerts(data.securityAlerts || []);
    } catch (error) {
      console.error("Failed to fetch sessions:", error);
    } finally {
      setLoadingSessions(false);
    }
  };

  const fetchHealthProfile = async () => {
    setLoadingHealthProfile(true);
    try {
      const response = await fetch("/api/user/health-profile");
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Kon gezondheidsprofiel niet laden");
      }
      setHealthProfileResult(data);
      if (data.profile) {
        setHealthProfile({
          goal: data.profile.goal,
          biologicalSex: data.profile.biologicalSex,
          age: String(data.profile.age ?? ""),
          heightCm: String(data.profile.heightCm ?? ""),
          weightKg: String(data.profile.weightKg ?? ""),
          targetWeightKg: data.profile.targetWeightKg != null ? String(data.profile.targetWeightKg) : "",
          activityLevel: data.profile.activityLevel,
          trainingSessionsPerWeek: String(data.profile.trainingSessionsPerWeek ?? ""),
          averageDailySteps: String(data.profile.averageDailySteps ?? ""),
          primarySport: data.profile.primarySport ?? "",
          symptoms: data.profile.symptoms ?? "",
        });
      }
    } catch (error) {
      console.error("Failed to fetch health profile:", error);
    } finally {
      setLoadingHealthProfile(false);
    }
  };

  const fetchRecipeAccountData = async () => {
    setLoadingRecipeAccountData(true);
    try {
      const [favoritesResponse, historyResponse] = await Promise.all([
        fetch("/api/recipes/favorites"),
        fetch("/api/recipes/meal-plan/history"),
      ]);

      const favoritesData = await favoritesResponse.json();
      const historyData = await historyResponse.json();

      if (favoritesResponse.ok) {
        setFavoriteRecipes(favoritesData);
      }

      if (historyResponse.ok) {
        setMealPlanHistory(historyData);
      }
    } catch (error) {
      console.error("Failed to fetch recipe account data:", error);
    } finally {
      setLoadingRecipeAccountData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone.trim() || null,
          bio: formData.bio.trim() || null,
          preferredLanguage: formData.preferredLanguage,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update profile");
      }

      toast({
        title: "Saved",
        description: t("settings_saved"),
      });

      await refreshUser();
    } catch (error) {
      toast({
        title: "Fout",
        description: "Kon profiel niet opslaan.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleHealthProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingHealthProfile(true);

    try {
      const response = await fetch("/api/user/health-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal: healthProfile.goal,
          biologicalSex: healthProfile.biologicalSex,
          age: Number(healthProfile.age),
          heightCm: Number(healthProfile.heightCm),
          weightKg: Number(healthProfile.weightKg),
          targetWeightKg: healthProfile.targetWeightKg.trim() ? Number(healthProfile.targetWeightKg) : null,
          activityLevel: healthProfile.activityLevel,
          trainingSessionsPerWeek: Number(healthProfile.trainingSessionsPerWeek),
          averageDailySteps: Number(healthProfile.averageDailySteps),
          primarySport: healthProfile.primarySport.trim() || null,
          symptoms: healthProfile.symptoms.trim() || null,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Kon gezondheidsprofiel niet opslaan");
      }

      setHealthProfileResult(data);
      await refreshUser();
      toast({
        title: "Gezondheidsprofiel opgeslagen",
        description: "Je kcal- en macrodoelen zijn automatisch bijgewerkt.",
      });
    } catch (error) {
      toast({
        title: "Fout",
        description: error instanceof Error ? error.message : "Kon gezondheidsprofiel niet opslaan",
        variant: "destructive",
      });
    } finally {
      setIsSavingHealthProfile(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isAdmin = isAdminRole(user.role);
  const backHref = getDashboardHomeHref(user.role);
  const pageKicker = isAdmin ? "Admin account" : "Account center";
  const pageDescription = isAdmin
    ? "Beheer je profiel, beveiliging, meldingen en actieve apparaten zonder je admin-werkruimte te verlaten."
    : "Beheer je profiel, beveiliging, meldingen en actieve apparaten vanuit één premium accountomgeving.";

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getDeviceIcon = (label: string) => {
    const normalized = label.toLowerCase();
    if (normalized.includes("iphone") || normalized.includes("android") || normalized.includes("ipad")) {
      return <Smartphone className="h-4 w-4" />;
    }
    return <Laptop className="h-4 w-4" />;
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="overflow-hidden rounded-[34px] border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.94),rgba(248,242,233,0.82))] p-6 shadow-[0_24px_80px_-34px_rgba(50,32,14,0.28)] md:p-8">
          <Link
            href={backHref}
            className="mb-6 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Terug
          </Link>
          <p className="app-kicker">{pageKicker}</p>
          <h1 className="mt-3 font-display text-3xl tracking-tight text-slate-950 md:text-5xl">
            Instellingen
          </h1>
          <p className="mt-3 text-muted-foreground">
            {pageDescription}
          </p>
        </div>

        <Card className="app-halo">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profiel
            </CardTitle>
            <CardDescription>Je persoonlijke gegevens</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex items-center gap-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setUploadingAvatar(true);
                    try {
                      const fd = new FormData();
                      fd.set("file", file);
                      const up = await fetch("/api/upload", { method: "POST", body: fd });
                      const d = await up.json();
                      if (!up.ok) throw new Error(d.error || "Upload mislukt");
                      const pr = await fetch("/api/user/profile", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ avatarUrl: d.url }),
                      });
                      if (!pr.ok) throw new Error("Profiel bijwerken mislukt");
                      setAvatarUrl(d.url);
                      await refreshUser();
                      toast({ title: "Profielfoto bijgewerkt" });
                    } catch (err) {
                      toast({
                        title: "Fout",
                        description: err instanceof Error ? err.message : "Kon foto niet uploaden",
                        variant: "destructive",
                      });
                    } finally {
                      setUploadingAvatar(false);
                      e.target.value = "";
                    }
                  }}
                />
                <Avatar className="h-20 w-20">
                  <AvatarImage src={avatarUrl ?? user.avatarUrl ?? undefined} />
                  <AvatarFallback className="text-xl">
                    {getInitials(user.firstName, user.lastName)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{user.firstName} {user.lastName}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    type="button"
                    disabled={uploadingAvatar}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploadingAvatar ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="mr-2 h-4 w-4" />
                    )}
                    Foto wijzigen
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Voornaam</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Achternaam</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Korte beschrijving (optioneel)</Label>
                <textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Stel jezelf kort voor – waar anderen zich in kunnen herkennen"
                  className="flex min-h-[80px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground">
                  Niet verplicht. Bijv. wat je doet, je doel, of waarom je meedoet.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={user.email} disabled className="bg-muted" />
                <p className="text-sm text-muted-foreground">Neem contact op om je email te wijzigen</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp / telefoonnummer
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+32 4XX XX XX XX"
                />
                <p className="text-sm text-muted-foreground">
                  Zo kunnen we je tijdens het traject via WhatsApp contacteren
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="preferredLanguage">{t("settings_language_label")}</Label>
                <select
                  id="preferredLanguage"
                  value={formData.preferredLanguage}
                  onChange={(e) =>
                    setFormData({ ...formData, preferredLanguage: e.target.value as "nl" | "en" })
                  }
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="nl">{t("settings_language_nl")}</option>
                  <option value="en">{t("settings_language_en")}</option>
                </select>
                <p className="text-sm text-muted-foreground">{t("settings_language_description")}</p>
              </div>

              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Opslaan...
                  </>
                ) : (
                  "Opslaan"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card ref={healthProfileRef} className="app-halo scroll-mt-24">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Gezondheidsprofiel
            </CardTitle>
            <CardDescription>
              Dit profiel is verplicht en wordt gebruikt om je kcal-behoefte en macrodoelen automatisch te berekenen.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {user.role === "CLIENT" && !user.healthProfileCompleted ? (
              <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-950">
                Vul deze gegevens in voor je verdergaat in het platform.
              </div>
            ) : null}

            {loadingHealthProfile ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <form onSubmit={handleHealthProfileSubmit} className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="goal" className="flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Doel
                    </Label>
                    <select
                      id="goal"
                      value={healthProfile.goal}
                      onChange={(e) => setHealthProfile((current) => ({ ...current, goal: e.target.value as HealthProfileForm["goal"] }))}
                      className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      {goalOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="biologicalSex">Geslacht</Label>
                    <select
                      id="biologicalSex"
                      value={healthProfile.biologicalSex}
                      onChange={(e) =>
                        setHealthProfile((current) => ({
                          ...current,
                          biologicalSex: e.target.value as HealthProfileForm["biologicalSex"],
                        }))
                      }
                      className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="FEMALE">Vrouw</option>
                      <option value="MALE">Man</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-4">
                  <div className="space-y-2">
                    <Label htmlFor="age">Leeftijd</Label>
                    <Input
                      id="age"
                      inputMode="numeric"
                      value={healthProfile.age}
                      onChange={(e) => setHealthProfile((current) => ({ ...current, age: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="heightCm">Lengte (cm)</Label>
                    <Input
                      id="heightCm"
                      inputMode="numeric"
                      value={healthProfile.heightCm}
                      onChange={(e) => setHealthProfile((current) => ({ ...current, heightCm: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weightKg">Gewicht (kg)</Label>
                    <Input
                      id="weightKg"
                      inputMode="decimal"
                      value={healthProfile.weightKg}
                      onChange={(e) => setHealthProfile((current) => ({ ...current, weightKg: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="targetWeightKg">Streefgewicht (optioneel)</Label>
                    <Input
                      id="targetWeightKg"
                      inputMode="decimal"
                      value={healthProfile.targetWeightKg}
                      onChange={(e) => setHealthProfile((current) => ({ ...current, targetWeightKg: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="activityLevel">Activiteitsniveau</Label>
                    <select
                      id="activityLevel"
                      value={healthProfile.activityLevel}
                      onChange={(e) =>
                        setHealthProfile((current) => ({
                          ...current,
                          activityLevel: e.target.value as HealthProfileForm["activityLevel"],
                        }))
                      }
                      className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      {activityOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="trainingSessionsPerWeek" className="flex items-center gap-2">
                      <Dumbbell className="h-4 w-4" />
                      Sport per week
                    </Label>
                    <Input
                      id="trainingSessionsPerWeek"
                      inputMode="numeric"
                      value={healthProfile.trainingSessionsPerWeek}
                      onChange={(e) =>
                        setHealthProfile((current) => ({ ...current, trainingSessionsPerWeek: e.target.value }))
                      }
                      placeholder="Bijv. 3"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="averageDailySteps">Gemiddelde stappen per dag</Label>
                    <Input
                      id="averageDailySteps"
                      inputMode="numeric"
                      value={healthProfile.averageDailySteps}
                      onChange={(e) =>
                        setHealthProfile((current) => ({ ...current, averageDailySteps: e.target.value }))
                      }
                      placeholder="Bijv. 8000"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="primarySport">Hoofdsport (optioneel)</Label>
                    <Input
                      id="primarySport"
                      value={healthProfile.primarySport}
                      onChange={(e) => setHealthProfile((current) => ({ ...current, primarySport: e.target.value }))}
                      placeholder="Bijv. krachttraining, wandelen, lopen"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="symptoms">Klachten of focus (optioneel)</Label>
                    <Input
                      id="symptoms"
                      value={healthProfile.symptoms}
                      onChange={(e) => setHealthProfile((current) => ({ ...current, symptoms: e.target.value }))}
                      placeholder="Bijv. darmklachten, vermoeidheid, hormonale klachten"
                    />
                  </div>
                </div>

                {healthProfileResult?.profile ? (
                  <div className="grid gap-4 rounded-[24px] border border-white/70 bg-white/70 p-5 md:grid-cols-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Kcal doel</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-950">
                        {healthProfileResult.profile.calorieTarget}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Eiwit</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-950">
                        {healthProfileResult.profile.proteinTargetGrams}g
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Koolhydraten</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-950">
                        {healthProfileResult.profile.carbsTargetGrams}g
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Vetten</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-950">
                        {healthProfileResult.profile.fatTargetGrams}g
                      </p>
                    </div>
                  </div>
                ) : null}

                <Button type="submit" disabled={isSavingHealthProfile}>
                  {isSavingHealthProfile ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Berekenen...
                    </>
                  ) : (
                    "Profiel opslaan en berekenen"
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <Card className="app-halo">
          <CardHeader>
            <CardTitle>Favoriete recepten</CardTitle>
            <CardDescription>
              Bewaar recepten en eigen recepten in je account zodat je ze snel opnieuw kunt gebruiken.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingRecipeAccountData ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : favoriteRecipes.length === 0 ? (
              <div className="rounded-2xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                Nog geen favoriete recepten. Je kunt een recept bewaren via het hartje op de receptpagina of bij je eigen recepten.
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {favoriteRecipes.map((favorite) => {
                  const linkedRecipe = favorite.recipe;
                  const linkedCustomRecipe = favorite.customRecipe;
                  const title = linkedRecipe?.title ?? linkedCustomRecipe?.title ?? "Recept";
                  const imageUrl = linkedRecipe?.imageUrl ?? linkedCustomRecipe?.imageUrl ?? null;

                  return (
                    <div key={favorite.id} className="flex items-center gap-4 rounded-2xl border border-border bg-background p-4">
                      <div className="h-16 w-16 overflow-hidden rounded-2xl bg-muted">
                        {imageUrl ? (
                          <img src={imageUrl} alt={title} className="h-full w-full object-cover" />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        {linkedRecipe ? (
                          <Link href={`/recipes/${linkedRecipe.slug}`} className="font-medium text-foreground hover:text-primary">
                            {title}
                          </Link>
                        ) : (
                          <p className="font-medium text-foreground">{title}</p>
                        )}
                        <p className="mt-1 text-sm text-muted-foreground">
                          {linkedRecipe ? "Recept uit bibliotheek" : "Jouw eigen recept"}
                        </p>
                      </div>
                      <FavoriteRecipeButton
                        recipeId={favorite.recipeId}
                        customRecipeId={favorite.customRecipeId}
                        initialIsFavorite
                        size="icon"
                        variant="ghost"
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="app-halo">
          <CardHeader>
            <CardTitle>Vorige weekmenu&apos;s</CardTitle>
            <CardDescription>
              Kijk eerdere weken terug en open ze opnieuw wanneer je inspiratie zoekt of iets wilt herhalen.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingRecipeAccountData ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : mealPlanHistory.length === 0 ? (
              <div className="rounded-2xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                Er zijn nog geen weekmenu&apos;s opgeslagen.
              </div>
            ) : (
              <div className="space-y-3">
                {mealPlanHistory.map((plan) => (
                  <Link
                    key={plan.id}
                    href={`/recipes/meal-plan?weekStart=${toLocalDateInput(plan.weekStart)}`}
                    className="block rounded-2xl border border-border bg-background p-4 transition hover:border-primary/30 hover:bg-white"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-medium text-foreground">
                          Week van {new Date(plan.weekStart).toLocaleDateString("nl-BE", { day: "numeric", month: "long", year: "numeric" })}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {plan.items.length} maaltijd{plan.items.length === 1 ? "" : "en"} opgeslagen
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {plan.items.slice(0, 3).map((item) => (
                          <span key={item.id} className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                            {item.isCustom ? item.customTitle ?? "Eigen recept" : item.recipe?.title ?? "Recept"}
                          </span>
                        ))}
                        {plan.items.length > 3 ? (
                          <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                            +{plan.items.length - 3} meer
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="app-halo">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Beveiliging
            </CardTitle>
            <CardDescription>Wachtwoord en inlogopties</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Wachtwoord</p>
                <p className="text-sm text-muted-foreground">Je logt momenteel in via magic link</p>
              </div>
              <Button variant="outline">Wachtwoord instellen</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="app-halo">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notificaties
            </CardTitle>
            <CardDescription>Kies welke meldingen je wilt ontvangen</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Email notificaties</p>
                <p className="text-sm text-muted-foreground">Ontvang updates via email</p>
              </div>
              <Button variant="outline" size="sm">Beheren</Button>
            </div>
            <div className="border-t pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">WhatsApp berichten</p>
                  <p className="text-sm text-muted-foreground">Ontvang reminders via WhatsApp</p>
                </div>
                <Button variant="outline" size="sm">Beheren</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="app-halo">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Apparaten & sessies
            </CardTitle>
            <CardDescription>
              Maximaal 2 actieve apparaten. Oudere sessies worden automatisch vervangen.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
              Je account blijft aangemeld op maximaal twee apparaten tegelijk. Hier kun je actieve sessies bekijken en intrekken.
            </div>

            {securityAlerts.length > 0 ? (
              <div className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-4">
                <p className="text-sm font-medium text-amber-950">Recente beveiligingssignalen</p>
                {securityAlerts.map((alert) => (
                  <div key={alert.id} className="text-sm text-amber-950/85">
                    <p>{alert.body}</p>
                    <p className="text-xs text-amber-800/70">
                      {new Date(alert.createdAt).toLocaleString("nl-BE")}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}

            {loadingSessions ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Geen actieve sessies gevonden.</p>
            ) : (
              <div className="space-y-3">
                {sessions.map((session) => (
                  <div key={session.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                      {getDeviceIcon(session.deviceLabel)}
                    </div>
                    <div className="min-w-[200px] flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{session.deviceLabel}</p>
                        {session.isCurrent ? (
                          <span className="rounded bg-primary/10 px-2 py-1 text-xs text-primary">
                            Huidige sessie
                          </span>
                        ) : null}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Gestart op {new Date(session.createdAt).toLocaleString("nl-BE")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Verloopt op {new Date(session.expiresAt).toLocaleString("nl-BE")}
                        {session.ipAddress ? ` · IP ${session.ipAddress}` : ""}
                      </p>
                    </div>
                    {!session.isCurrent ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={revokingSessionId === session.id}
                        onClick={async () => {
                          setRevokingSessionId(session.id);
                          try {
                            const response = await fetch(`/api/auth/sessions/${session.id}`, {
                              method: "DELETE",
                            });
                            const data = await response.json();
                            if (!response.ok) {
                              throw new Error(data.error || "Kon sessie niet intrekken");
                            }
                            toast({ title: "Sessie ingetrokken" });
                            fetchSessions();
                          } catch (error) {
                            toast({
                              title: "Fout",
                              description: error instanceof Error ? error.message : "Kon sessie niet intrekken",
                              variant: "destructive",
                            });
                          } finally {
                            setRevokingSessionId(null);
                          }
                        }}
                      >
                        {revokingSessionId === session.id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="mr-2 h-4 w-4" />
                        )}
                        Intrekken
                      </Button>
                    ) : null}
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end">
              <Button
                variant="outline"
                disabled={revokingOthers || sessions.filter((session) => !session.isCurrent).length === 0}
                onClick={async () => {
                  setRevokingOthers(true);
                  try {
                    const response = await fetch("/api/auth/sessions", { method: "DELETE" });
                    const data = await response.json();
                    if (!response.ok) {
                      throw new Error(data.error || "Kon andere sessies niet intrekken");
                    }
                    toast({
                      title: "Andere sessies ingetrokken",
                      description: `${data.revoked || 0} sessies afgesloten.`,
                    });
                    fetchSessions();
                  } catch (error) {
                    toast({
                      title: "Fout",
                      description: error instanceof Error ? error.message : "Kon andere sessies niet intrekken",
                      variant: "destructive",
                    });
                  } finally {
                    setRevokingOthers(false);
                  }
                }}
              >
                {revokingOthers ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Lock className="mr-2 h-4 w-4" />
                )}
                Sluit andere apparaten af
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
