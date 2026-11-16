import Link from "next/link";
import { PublicPageShell } from "@/components/legal/public-page-shell";
import { publicAppConfig } from "@/lib/public-app";
export const metadata = { title: "Hulp | Simply App" };
export default function SupportPage() {
  return <PublicPageShell title="Hulp bij Simply App" description="Ondersteuning voor je account en het gebruik van de app." updatedAt="16 november 2026">
    <h2>Contact</h2><p>Mail <a href={`mailto:${publicAppConfig.supportEmail}`}>{publicAppConfig.supportEmail}</a>. Beschrijf op welk scherm je vastloopt en of je een iPhone, Android of computer gebruikt. Stuur geen wachtwoorden of medische gegevens mee.</p>
    <h2>Inloggen</h2><p>Gebruik het e-mailadres waarop je toegang hebt gekregen. Via <Link href="/login">Inloggen</Link> kun je een persoonlijke inloglink aanvragen. Controleer ook je ongewenste e-mail. Je kunt in de instellingen een wachtwoord instellen.</p>
    <h2>Privacy en verwijderen</h2><p>Bekijk het <Link href="/privacy">privacybeleid</Link> of <Link href="/account-deletion">vraag accountverwijdering aan</Link>.</p>
  </PublicPageShell>;
}
