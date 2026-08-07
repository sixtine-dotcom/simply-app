"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Bot, ImagePlus, LayoutTemplate, Loader2, Palette, Upload, Users, Video } from "lucide-react";
import { AdminHubCard } from "@/components/admin/hub-card";

type BrandingForm = {
  platformName: string;
  logoUrl: string;
  faviconUrl: string;
  loginBackgroundUrl: string;
  loginVideoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  emailSenderName: string;
  emailReplyTo: string;
  footerText: string;
  hidePoweredBy: boolean;
  customCss: string;
  featureAccess?: {
    hidePoweredBy: boolean;
    customCss: boolean;
  };
};

const defaultForm: BrandingForm = {
  platformName: "",
  logoUrl: "",
  faviconUrl: "",
  loginBackgroundUrl: "",
  loginVideoUrl: "",
  primaryColor: "#385739",
  secondaryColor: "#B18A4A",
  emailSenderName: "",
  emailReplyTo: "",
  footerText: "",
  hidePoweredBy: false,
  customCss: "",
  featureAccess: {
    hidePoweredBy: true,
    customCss: true,
  },
};

export default function AdminBrandingPage() {
  const { toast } = useToast();
  const [form, setForm] = useState<BrandingForm>(defaultForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const backgroundInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/admin/branding");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Kon branding niet laden");
        setForm({ ...defaultForm, ...data.branding });
      } catch (error) {
        toast({
          title: "Fout",
          description:
            error instanceof Error ? error.message : "Kon branding niet laden",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [toast]);

  const handleUpload = async (
    file: File | undefined,
    field: "logoUrl" | "faviconUrl" | "loginBackgroundUrl"
  ) => {
    if (!file) return;

    const payload = new FormData();
    payload.set("file", file);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: payload });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload mislukt");
      setForm((prev) => ({ ...prev, [field]: data.url }));
      toast({ title: "Bestand geupload" });
    } catch (error) {
      toast({
        title: "Fout",
        description: error instanceof Error ? error.message : "Upload mislukt",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);

    try {
      const res = await fetch("/api/admin/branding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Opslaan mislukt");
      toast({
        title: "Branding opgeslagen",
        description: "De loginpagina en platformstijl zijn bijgewerkt.",
      });
    } catch (error) {
      toast({
        title: "Fout",
        description: error instanceof Error ? error.message : "Opslaan mislukt",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 lg:p-12">
      <section className="relative overflow-hidden rounded-[2rem] border border-border bg-[linear-gradient(135deg,rgba(247,244,237,0.98),rgba(255,255,255,0.95))] px-6 py-7 shadow-card md:px-8 md:py-8">
        <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-[radial-gradient(circle_at_top,rgba(120,148,118,0.16),transparent_60%)] lg:block" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-3 py-1 text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground">
              <Palette className="h-3.5 w-3.5" />
              Brand Hub
            </div>
            <h1 className="font-display text-3xl tracking-[0.16em] text-foreground md:text-4xl">
              BRANDING EN LOOK & FEEL
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
              Beheer je visuele identiteit, loginervaring en white-label details vanuit één brand hub.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-4">
        <AdminHubCard
          icon={<Palette className="h-5 w-5" />}
          title="Brand"
          description="Deze hub stuurt logo, kleuren, loginbeleving en white-label details."
          href="/admin/branding"
          cta="Open brand"
          active
        />
        <AdminHubCard
          icon={<LayoutTemplate className="h-5 w-5" />}
          title="Website"
          description="Laat je publieke pagina’s visueel aansluiten op dezelfde merktaal."
          href="/admin/landing-pages"
          cta="Open website"
        />
        <AdminHubCard
          icon={<Users className="h-5 w-5" />}
          title="People"
          description="Gebruik branding om de klant- en loginervaring van je members consistenter te maken."
          href="/admin/users"
          cta="Open people"
        />
        <AdminHubCard
          icon={<Bot className="h-5 w-5" />}
          title="AI Knowledge"
          description="Stem later ook SIX AI af op dezelfde merktoon en platformervaring."
          href="/admin/ai"
          cta="Open AI"
        />
      </section>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Merkidentiteit</CardTitle>
            <CardDescription>Logo, platformnaam en basisinstellingen.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="platformName">Platformnaam</Label>
                <Input
                  id="platformName"
                  value={form.platformName}
                  onChange={(e) => setForm((prev) => ({ ...prev, platformName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emailSenderName">Email afzender</Label>
                <Input
                  id="emailSenderName"
                  value={form.emailSenderName}
                  onChange={(e) => setForm((prev) => ({ ...prev, emailSenderName: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Logo</Label>
                <div className="flex gap-2">
                  <Input
                    value={form.logoUrl}
                    onChange={(e) => setForm((prev) => ({ ...prev, logoUrl: e.target.value }))}
                    placeholder="https://..."
                  />
                  <Button type="button" variant="outline" onClick={() => logoInputRef.current?.click()}>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload
                  </Button>
                </div>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => handleUpload(e.target.files?.[0], "logoUrl")}
                />
              </div>
              <div className="space-y-2">
                <Label>Favicon</Label>
                <div className="flex gap-2">
                  <Input
                    value={form.faviconUrl}
                    onChange={(e) => setForm((prev) => ({ ...prev, faviconUrl: e.target.value }))}
                    placeholder="https://..."
                  />
                  <Button type="button" variant="outline" onClick={() => faviconInputRef.current?.click()}>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload
                  </Button>
                </div>
                <input
                  ref={faviconInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/x-icon"
                  className="hidden"
                  onChange={(e) => handleUpload(e.target.files?.[0], "faviconUrl")}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Primaire kleur</Label>
                <div className="flex gap-2">
                  <Input
                    id="primaryColor"
                    type="color"
                    value={form.primaryColor}
                    onChange={(e) => setForm((prev) => ({ ...prev, primaryColor: e.target.value }))}
                    className="h-11 w-16 p-1"
                  />
                  <Input
                    value={form.primaryColor}
                    onChange={(e) => setForm((prev) => ({ ...prev, primaryColor: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="secondaryColor">Goud / accentkleur</Label>
                <div className="flex gap-2">
                  <Input
                    id="secondaryColor"
                    type="color"
                    value={form.secondaryColor}
                    onChange={(e) => setForm((prev) => ({ ...prev, secondaryColor: e.target.value }))}
                    className="h-11 w-16 p-1"
                  />
                  <Input
                    value={form.secondaryColor}
                    onChange={(e) => setForm((prev) => ({ ...prev, secondaryColor: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="emailReplyTo">Reply-to email</Label>
                <Input
                  id="emailReplyTo"
                  value={form.emailReplyTo}
                  onChange={(e) => setForm((prev) => ({ ...prev, emailReplyTo: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="footerText">Footer tekst</Label>
                <Input
                  id="footerText"
                  value={form.footerText}
                  onChange={(e) => setForm((prev) => ({ ...prev, footerText: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="customCss">Custom CSS</Label>
              <textarea
                id="customCss"
                value={form.customCss}
                onChange={(e) => setForm((prev) => ({ ...prev, customCss: e.target.value }))}
                className="min-h-[180px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                placeholder=".my-custom-class { letter-spacing: 0.08em; }"
                disabled={!form.featureAccess?.customCss}
              />
              {!form.featureAccess?.customCss ? (
                <p className="text-xs text-muted-foreground">
                  Custom CSS is alleen beschikbaar op het Enterprise plan of via een feature override.
                </p>
              ) : null}
            </div>

            <label className="flex items-center gap-3 rounded-lg border border-border p-4 text-sm">
              <input
                type="checkbox"
                checked={form.hidePoweredBy}
                onChange={(e) => setForm((prev) => ({ ...prev, hidePoweredBy: e.target.checked }))}
                className="h-4 w-4 rounded border-border"
                disabled={!form.featureAccess?.hidePoweredBy}
              />
              Verberg de &quot;Powered by&quot; badge
            </label>
            {!form.featureAccess?.hidePoweredBy ? (
              <p className="-mt-3 text-xs text-muted-foreground">
                Deze optie is beschikbaar vanaf Pro of via een SuperAdmin override.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Login achtergrond</CardTitle>
              <CardDescription>Foto of stille welkomstvideo voor de loginpagina.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Achtergrondfoto</Label>
                <div className="flex gap-2">
                  <Input
                    value={form.loginBackgroundUrl}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, loginBackgroundUrl: e.target.value }))
                    }
                    placeholder="https://..."
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => backgroundInputRef.current?.click()}
                  >
                    <ImagePlus className="mr-2 h-4 w-4" />
                    Upload
                  </Button>
                </div>
                <input
                  ref={backgroundInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => handleUpload(e.target.files?.[0], "loginBackgroundUrl")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="loginVideoUrl">Welkomstvideo URL</Label>
                <Input
                  id="loginVideoUrl"
                  value={form.loginVideoUrl}
                  onChange={(e) => setForm((prev) => ({ ...prev, loginVideoUrl: e.target.value }))}
                  placeholder="https://..."
                />
                <p className="text-xs text-muted-foreground">
                  Gebruik een rechtstreeks afspeelbare video-URL. Als er een video is ingesteld, krijgt die voorrang op de foto.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>Een snelle indicatie van de loginlook.</CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className="relative overflow-hidden rounded-3xl border border-border p-5 text-white"
                style={{
                  background:
                    `linear-gradient(135deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.08) 42%, rgba(255, 255, 255, 0.22)), url(${form.loginBackgroundUrl || "/auth-login-bg.jpg"}) center/cover`,
                }}
              >
                <div className="rounded-2xl border border-white/30 bg-white/18 p-4 backdrop-blur-md">
                  <div className="mb-8 flex items-center gap-3">
                    {form.logoUrl ? (
                      <img src={form.logoUrl} alt={form.platformName} className="h-10 w-auto rounded" />
                    ) : (
                      <img
                        src="/simply-leaf-logo.jpg"
                        alt={form.platformName}
                        className="h-10 w-10 rounded-full object-cover ring-1 ring-white/70"
                      />
                    )}
                    <div>
                      <p className="font-display text-xl">{form.platformName || "Jouw platform"}</p>
                      <p className="text-xs text-white/80">Warm, rustig en premium.</p>
                    </div>
                  </div>
                  <div className="grid gap-3 text-sm text-white/90">
                    <div className="rounded-xl bg-white/12 p-3">Cursussen, community en coaching in een omgeving.</div>
                    <div className="rounded-xl bg-white/12 p-3">Persoonlijke branding met botanische loginervaring.</div>
                  </div>
                  {form.loginVideoUrl ? (
                    <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-black/20 px-3 py-1 text-xs">
                      <Video className="h-3.5 w-3.5" />
                      Welkomstvideo actief
                    </div>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>

          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Opslaan...
              </>
            ) : (
              "Branding opslaan"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
