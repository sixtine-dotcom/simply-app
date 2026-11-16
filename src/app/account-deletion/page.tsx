import Link from "next/link";
import { PublicPageShell } from "@/components/legal/public-page-shell";
import { publicAppConfig } from "@/lib/public-app";
export const metadata = { title: "Account verwijderen | Simply App" };
export default function AccountDeletionPage() {
  return <PublicPageShell title="Je Simply App-account verwijderen" description="Vraag de verwijdering van je account en bijbehorende persoonsgegevens aan." updatedAt="16 november 2026">
    <h2>Vanuit je account</h2>
    <p>Open <Link href="/settings#delete-account">Instellingen → Account verwijderen</Link>. Bevestig je e-mailadres en typ VERWIJDER. Je verzoek wordt handmatig behandeld; we streven naar afhandeling binnen 30 dagen en sturen een bevestiging zodra het is afgerond.</p>
    <h2>Kun je niet meer inloggen?</h2>
    <p>Mail <a href={`mailto:${publicAppConfig.supportEmail}?subject=Simply%20App%20account%20verwijderen`}>{publicAppConfig.supportEmail}</a> vanuit het e-mailadres van je account, met als onderwerp ‘Simply App account verwijderen’. Vermeld dat je je account en gegevens wilt laten verwijderen. We kunnen aanvullende bevestiging vragen om te voorkomen dat iemand anders je account verwijdert.</p>
    <h2>Wat wordt verwijderd?</h2>
    <p>Je profiel, toegang, cursusvoortgang, ingevulde formulieren, trackers en bijbehorende persoonlijke appgegevens worden verwijderd. Persoonlijke bestanden en gekoppelde diensten worden bij de behandeling afzonderlijk gecontroleerd. Je verliest toegang tot je lessen en berichten; dit kan niet worden teruggedraaid.</p>
    <h2>Welke gegevens kunnen nog bewaard blijven?</h2>
    <p>Een beperkt technisch bewijs van de afhandeling blijft bewaard, zonder je naam of leesbaar e-mailadres. Hiermee voorkomen we ook dat een oude aankoopmelding je account opnieuw aanmaakt. Gegevens die wettelijk moeten worden bewaard, zoals facturen in de verkoopadministratie, vallen buiten het app-account. Reservekopieën kunnen oudere gegevens bevatten totdat die volgens het back-upbeheer worden vervangen.</p>
    <p>Een verwijderverzoek beëindigt niet automatisch een betaalafspraak of overeenkomst voor je traject. Neem daarvoor contact met ons op.</p>
    <p>Lees ook ons <Link href="/privacy">privacybeleid</Link>.</p>
  </PublicPageShell>;
}
