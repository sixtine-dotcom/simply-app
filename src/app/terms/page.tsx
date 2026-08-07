import type { Metadata } from "next";
import { PublicPageShell } from "@/components/legal/public-page-shell";
import { publicAppConfig } from "@/lib/public-app";

export const metadata: Metadata = {
  title: `Voorwaarden | ${publicAppConfig.name}`,
  description: `Gebruiksvoorwaarden van ${publicAppConfig.name}.`,
};

export default function TermsPage() {
  return (
    <PublicPageShell
      title="Gebruiksvoorwaarden"
      description="De basisafspraken voor het gebruik van Simply App als leeromgeving en community."
      updatedAt="1 juli 2026"
    >
      <h2>Gebruik van het platform</h2>
      <p>
        {publicAppConfig.name} is bedoeld voor toegang tot leerinhoud, sessies, community, berichten en
        begeleiding. Je gebruikt je account persoonlijk en deelt je toegang niet met anderen.
      </p>

      <h2>Account en veiligheid</h2>
      <p>
        Je bent verantwoordelijk voor correct gebruik van je account. Meld verdachte toegang of technische
        problemen via <a href={`mailto:${publicAppConfig.supportEmail}`}>{publicAppConfig.supportEmail}</a>.
      </p>

      <h2>Inhoud en community</h2>
      <p>
        Deel geen inhoud die onwettig, kwetsend, discriminerend of schadelijk is. Begeleiders kunnen inhoud
        verwijderen of toegang beperken wanneer dat nodig is voor veiligheid of kwaliteit van de community.
      </p>

      <h2>Beschikbaarheid</h2>
      <p>
        We doen ons best om het platform betrouwbaar beschikbaar te houden, maar tijdelijke onderbrekingen door
        onderhoud, updates of externe diensten kunnen voorkomen.
      </p>
    </PublicPageShell>
  );
}
