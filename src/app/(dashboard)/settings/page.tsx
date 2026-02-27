"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, User, Lock, Bell, MessageCircle, Camera } from "lucide-react";

interface UserData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  bio: string | null;
  phone: string | null;
  role: string;
}

export default function SettingsPage() {
  const { toast } = useToast();
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    bio: "",
  });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const response = await fetch("/api/auth/me");
      const data = await response.json();
      if (data.user) {
        setUser(data.user);
        setFormData({
          firstName: data.user.firstName,
          lastName: data.user.lastName,
          phone: data.user.phone ?? "",
          bio: data.user.bio ?? "",
        });
        setAvatarUrl(data.user.avatarUrl ?? null);
      }
    } catch (error) {
      console.error("Failed to fetch user:", error);
    } finally {
      setIsLoading(false);
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
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update profile");
      }

      toast({
        title: "Opgeslagen",
        description: "Je profiel is bijgewerkt.",
      });

      fetchUser();
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <div className="p-6 md:p-8 lg:p-12 max-w-3xl">
      <div className="mb-8">
        <h1 className="font-display text-2xl md:text-3xl tracking-wider">
          INSTELLINGEN
        </h1>
        <p className="mt-2 text-muted-foreground">
          Beheer je account en voorkeuren
        </p>
      </div>

      <div className="space-y-6">
        {/* Profile Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profiel
            </CardTitle>
            <CardDescription>
              Je persoonlijke gegevens
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Avatar */}
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
                      fetchUser();
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
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Camera className="h-4 w-4 mr-2" />
                    )}
                    Foto wijzigen
                  </Button>
                </div>
              </div>

              {/* Name fields */}
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

              {/* Bio */}
              <div className="space-y-2">
                <Label htmlFor="bio">Korte beschrijving (optioneel)</Label>
                <textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Stel jezelf kort voor – waar anderen zich in kunnen herkennen"
                  className="flex w-full rounded-lg border border-border bg-background px-3 py-2 text-sm min-h-[80px]"
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground">
                  Niet verplicht. Bijv. wat je doet, je doel, of waarom je meedoet.
                </p>
              </div>

              {/* Email (read-only) */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={user.email}
                  disabled
                  className="bg-muted"
                />
                <p className="text-sm text-muted-foreground">
                  Neem contact op om je email te wijzigen
                </p>
              </div>

              {/* WhatsApp / telefoon */}
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

        {/* Security Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Beveiliging
            </CardTitle>
            <CardDescription>
              Wachtwoord en inlogopties
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Wachtwoord</p>
                <p className="text-sm text-muted-foreground">
                  Je logt momenteel in via magic link
                </p>
              </div>
              <Button variant="outline">
                Wachtwoord instellen
              </Button>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Actieve sessies</p>
                  <p className="text-sm text-muted-foreground">
                    Beheer waar je bent ingelogd
                  </p>
                </div>
                <Button variant="outline">
                  Bekijken
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notificaties
            </CardTitle>
            <CardDescription>
              Kies welke meldingen je wilt ontvangen
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Email notificaties</p>
                <p className="text-sm text-muted-foreground">
                  Ontvang updates via email
                </p>
              </div>
              <Button variant="outline" size="sm">
                Beheren
              </Button>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">WhatsApp berichten</p>
                  <p className="text-sm text-muted-foreground">
                    Ontvang reminders via WhatsApp
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Beheren
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-error/20">
          <CardHeader>
            <CardTitle className="text-error">Gevarenzone</CardTitle>
            <CardDescription>
              Onomkeerbare acties
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Account verwijderen</p>
                <p className="text-sm text-muted-foreground">
                  Verwijder al je gegevens permanent
                </p>
              </div>
              <Button variant="outline" className="text-error border-error hover:bg-error/10">
                Verwijderen
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
