import type { Metadata } from "next";
import { PublicPageShell } from "@/components/legal/public-page-shell";
import { publicAppConfig } from "@/lib/public-app";

export const metadata: Metadata = {
  title: `Privacybeleid | ${publicAppConfig.name}`,
  description: `Privacybeleid van ${publicAppConfig.name}.`,
};

export default function PrivacyPage() {
  return (
    <PublicPageShell
      title="Privacybeleid"
      description="Hoe Simply App omgaat met accountgegevens, leeractiviteiten en communicatie binnen het platform."
      updatedAt="16 november 2026"
    >
      <h2>Wie is verantwoordelijk?</h2>
      <p>
        {publicAppConfig.legalName} beheert {publicAppConfig.name}. Voor vragen over privacy kan je contact
        opnemen via{" "}
        <a href={`mailto:${publicAppConfig.supportEmail}`}>{publicAppConfig.supportEmail}</a>.
      </p>

      <h2>Welke gegevens verwerken we?</h2>
      <p>
        We verwerken gegevens die nodig zijn om de leeromgeving te laten werken, zoals je naam, e-mailadres,
        accountrol, cursusvoortgang, sessies, berichten, communitybijdragen en technische informatie over je
        apparaat en sessie. Als je die functies gebruikt, verwerken we ook intakeantwoorden, voedings- en bewegingsgegevens, lichaamsmetingen, voortgangsfoto’s en bestanden die je zelf toevoegt.
      </p>

      <h2>Waarvoor gebruiken we deze gegevens?</h2>
      <p>
        We gebruiken gegevens om toegang te geven tot je account, leerinhoud te tonen, sessies te plannen,
        ondersteuning te bieden, beveiliging te bewaken en de werking van het platform te verbeteren.
      </p>

      <h2>Delen met derden</h2>
      <p>
        We delen gegevens alleen met dienstverleners die nodig zijn voor hosting, e-mail, betalingen,
        videovergaderingen, opslag, AI-functies of technische ondersteuning.
      </p>

      <h2>Optionele functies</h2>
      <p>Bij gebruik van AI-functies kunnen je ingevoerde berichten en relevante profielgegevens aan de AI-dienst worden aangeboden om een antwoord te maken. Camera en microfoon worden gebruikt voor de functies waarvoor je toestemming geeft, zoals een videogesprek. Externe agenda- en fitnesskoppelingen verwerken gegevens wanneer je die zelf verbindt.</p>
      <h2>Bewaartermijn</h2>
      <p>
        We bewaren gegevens zolang je account actief is of zolang dit nodig is voor begeleiding, administratie,
        beveiliging en wettelijke verplichtingen.
      </p>

      <h2>Account verwijderen</h2>
      <p>Je kunt via Instellingen → Account verwijderen een verwijderverzoek indienen. Zonder toegang tot je account kan dit per e-mail. De werkwijze, de gegevens die worden verwijderd en de beperkte gegevens die kunnen blijven staan, vind je op <a href="/account-deletion">Account verwijderen</a>.</p>
      <h2>Je rechten</h2>
      <p>
        Je kan vragen om inzage, correctie, verwijdering of overdracht van je gegevens. Je kan ook bezwaar maken
        tegen bepaalde verwerkingen. Mail hiervoor naar{" "}
        <a href={`mailto:${publicAppConfig.supportEmail}`}>{publicAppConfig.supportEmail}</a>.
      </p>
    </PublicPageShell>
  );
}
