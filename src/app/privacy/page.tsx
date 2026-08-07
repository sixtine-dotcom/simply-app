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
      updatedAt="1 juli 2026"
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
        apparaat en sessie.
      </p>

      <h2>Waarvoor gebruiken we deze gegevens?</h2>
      <p>
        We gebruiken gegevens om toegang te geven tot je account, leerinhoud te tonen, sessies te plannen,
        ondersteuning te bieden, beveiliging te bewaken en de werking van het platform te verbeteren.
      </p>

      <h2>Delen met derden</h2>
      <p>
        We delen gegevens alleen met dienstverleners die nodig zijn voor hosting, e-mail, betalingen,
        videovergaderingen, opslag of technische ondersteuning. Zij mogen gegevens niet voor eigen doeleinden
        gebruiken.
      </p>

      <h2>Bewaartermijn</h2>
      <p>
        We bewaren gegevens zolang je account actief is of zolang dit nodig is voor begeleiding, administratie,
        beveiliging en wettelijke verplichtingen.
      </p>

      <h2>Je rechten</h2>
      <p>
        Je kan vragen om inzage, correctie, verwijdering of overdracht van je gegevens. Je kan ook bezwaar maken
        tegen bepaalde verwerkingen. Mail hiervoor naar{" "}
        <a href={`mailto:${publicAppConfig.supportEmail}`}>{publicAppConfig.supportEmail}</a>.
      </p>
    </PublicPageShell>
  );
}
