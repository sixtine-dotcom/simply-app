"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Download, MonitorSmartphone, Share, Smartphone } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export function InstallPanel() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);

    setIsStandalone(standalone);
    setIsIOS(/iphone|ipad|ipod/i.test(window.navigator.userAgent));

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const installLabel = useMemo(() => {
    if (isStandalone) return "App is geinstalleerd";
    if (installPrompt) return "Installeer app";
    return isIOS ? "Gebruik delen" : "Open in browser";
  }, [installPrompt, isIOS, isStandalone]);

  const handleInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 sm:px-6 lg:px-8">
      <section className="overflow-hidden rounded-[28px] border border-white/70 bg-white/82 shadow-[0_24px_70px_-46px_rgba(33,24,18,0.45)] backdrop-blur">
        <div className="grid gap-0 lg:grid-cols-[1fr_340px]">
          <div className="p-6 sm:p-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-normal text-primary">
              <MonitorSmartphone className="h-3.5 w-3.5" />
              Mobile app
            </div>
            <h1 className="mt-5 max-w-2xl text-3xl font-semibold tracking-normal text-slate-950 sm:text-4xl">
              Simply op je telefoon of tablet
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              De leeromgeving is klaar als installeerbare app. Je krijgt een eigen icoon, volledig scherm en snelle toegang tot cursussen, community, trackers en coaching.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                size="lg"
                onClick={handleInstall}
                disabled={isStandalone || !installPrompt}
                className="h-12 rounded-2xl"
              >
                {isStandalone ? (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                {installLabel}
              </Button>
              <Button asChild variant="outline" size="lg" className="h-12 rounded-2xl">
                <a href="/login">
                  <Smartphone className="mr-2 h-4 w-4" />
                  Open leeromgeving
                </a>
              </Button>
            </div>
          </div>

          <div className="border-t border-white/70 bg-[linear-gradient(160deg,rgba(95,127,111,0.14),rgba(255,255,255,0.72))] p-6 lg:border-l lg:border-t-0">
            <div className="mx-auto flex aspect-[9/16] max-h-[430px] w-full max-w-[230px] flex-col rounded-[36px] border border-slate-950/10 bg-slate-950 p-2 shadow-[0_28px_70px_-44px_rgba(15,23,42,0.8)]">
              <div className="mx-auto mb-2 h-1.5 w-16 rounded-full bg-white/20" />
              <div className="flex flex-1 flex-col rounded-[28px] bg-[#f8f5ef] p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                    <Smartphone className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-950">Simply</p>
                    <p className="text-xs text-muted-foreground">Leeromgeving</p>
                  </div>
                </div>
                <div className="mt-6 space-y-3">
                  {["Cursussen", "Community", "Trackers", "Coaching"].map((item) => (
                    <div key={item} className="rounded-2xl border border-white/80 bg-white/82 px-4 py-3 text-sm font-medium text-slate-800">
                      {item}
                    </div>
                  ))}
                </div>
                <div className="mt-auto rounded-2xl bg-primary/10 px-4 py-3 text-xs font-medium leading-5 text-primary">
                  Klaar voor homescreen op smartphone en tablet.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[24px] border border-white/70 bg-white/78 p-5 shadow-[0_20px_55px_-42px_rgba(33,24,18,0.4)]">
          <Download className="h-5 w-5 text-primary" />
          <h2 className="mt-4 text-base font-semibold text-slate-950">Android en desktop</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Chrome en Edge tonen automatisch de installatieknop zodra het domein actief is.
          </p>
        </div>
        <div className="rounded-[24px] border border-white/70 bg-white/78 p-5 shadow-[0_20px_55px_-42px_rgba(33,24,18,0.4)]">
          <Share className="h-5 w-5 text-primary" />
          <h2 className="mt-4 text-base font-semibold text-slate-950">iPhone en iPad</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Safari gebruikt de deelknop en zet Simply daarna als eigen app op het beginscherm.
          </p>
        </div>
        <div className="rounded-[24px] border border-white/70 bg-white/78 p-5 shadow-[0_20px_55px_-42px_rgba(33,24,18,0.4)]">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          <h2 className="mt-4 text-base font-semibold text-slate-950">Productie klaar</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Iconen, manifest, themakleur en service worker zijn voorzien voor gebruik via HTTPS.
          </p>
        </div>
      </section>
    </div>
  );
}
