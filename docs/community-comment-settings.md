# Reacties per communitybericht beheren — 17 november 2026

Beheerders (ADMIN en SUPERADMIN) kunnen bij het schrijven **Reacties uitschakelen** aanvinken. Bestaande berichten hebben in de feed en op de berichtpagina een actie om reacties uit of weer aan te zetten. De actie vereist toegang tot de betreffende communityruimte.

Klanten en coaches zien deze beheeroptie niet en kunnen de instelling ook niet via een API-aanroep wijzigen. Een gesloten bericht houdt eerdere reacties zichtbaar, maar accepteert geen nieuwe reacties of antwoorden, ook niet vanuit een eerder geopend scherm. De sluiting geldt ook voor beheerders. Likes en peilingen zijn afzonderlijke functies.

Opslag: `Post.commentsClosed`, standaard `false`; bestaande berichten blijven open. De additieve migratie is `20261117090000_post_comment_settings`. Het toevoegen van een reactie vergrendelt de postrij binnen dezelfde databasetransactie, zodat een sluiting niet tussen controle en insert kan worden omzeild.

Controles:

- `scripts/tests/community-comment-settings.ts`: tijdelijk privétestkanaal met admin, superadmin, klant, coach en beheerder zonder lidmaatschap; create/close/reopen, verkeerde rollen, geen toegang, ongeldige invoer, bestaande reacties behouden, geneste antwoorden, normale klantposts, host-only superadminpublicatie en gelijktijdige sluiting/reactie. Geen echte mails verzonden; fixtures worden opgeruimd. Uitvoeren met een lokale server: `node --env-file=.env --env-file=.env.local --import tsx scripts/tests/community-comment-settings.ts`.
- Browsercontrole met tijdelijke privétestdata: beheeroptie in composer, sluiten bij publicatie, bestaande posts sluiten/heropenen, klantopties afwezig, verouderd reactiescherm krijgt 403 en wordt alleen-lezen, dialoog en aparte berichtpagina respecteren sluiting, opnieuw antwoorden na heropenen; desktop en 390px mobiel.
- TypeScript en productiebuild gecontroleerd. Gerichte ESLint heeft geen fouten; bestaande afbeeldingswaarschuwingen in de communitycomponenten blijven staan.
- Databaseback-up vóór migratie: `~/Library/Application Support/Simply App/Backups/database-2026-11-17T08-54-43-269Z.dump` (archiefinhoudsopgave gecontroleerd, geen volledige hersteltest; object storage niet inbegrepen).
