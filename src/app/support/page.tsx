import type { Metadata } from "next";
import { PublicPageShell } from "@/components/legal/public-page-shell";
import { publicAppConfig } from "@/lib/public-app";

export const metadata: Metadata = {
  title: `Support | ${publicAppConfig.name}`,
  description: `Supportinformatie voor ${publicAppConfig.name}.`,
};

export default function SupportPage() {
  return (
    <PublicPageShell
      title="Support"
      description="Hulp bij aanmelden, toegang tot je leeromgeving, sessies en het gebruik van de app."
      updatedAt="1 juli 2026"
    >
      <h2>Contact</h2>
      <p>
        Heb je hulp nodig met {publicAppConfig.name}? Mail naar{" "}
        <a href={`mailto:${publicAppConfig.supportEmail}`}>{publicAppConfig.supportEmail}</a>.
      </p>

      <h2>Wat vermeld je best?</h2>
      <ul>
        <li>Het e-mailadres waarmee je probeert aan te melden.</li>
        <li>Of je de desktopsite, Android-app, iPhone of iPad gebruikt.</li>
        <li>Een korte beschrijving van wat er misloopt.</li>
        <li>Een screenshot als dat helpt om het probleem te tonen.</li>
      </ul>

      <h2>App installeren</h2>
      <p>
        Je kan de app gebruiken via <a href={publicAppConfig.url}>{publicAppConfig.domain}</a>. Zodra de mobiele
        app in de stores beschikbaar is, kan je dezelfde accountgegevens gebruiken.
      </p>
    </PublicPageShell>
  );
}
