# Stil toevoegen aan de community — 17 november 2026

Toevoegen is privébeheer: er verschijnt geen automatisch welkomstbericht, ‘nieuw lid’-activiteit, deelnemersmelding of publieke tellerwijziging. Dit gold al voor de bestaande toevoegroutes; het is nu vastgelegd in één gedeelde, idempotente toevoegfunctie voor de bulkactie, klantdetail en cursus-/aankooptoegang. Privéaccount- en activatiemails worden elders afgehandeld en zijn geen bericht aan andere deelnemers.

Aanvullend is de tagzoekfunctie afgeschermd. Klanten zien stille nieuwe deelnemers niet in de standaardlijst of bij zoeken op hun naam. Een deelnemer wordt voor andere klanten tagbaar na een eigen bericht of reactie in dat kanaal. Zelf, teamleden en al actieve deelnemers blijven normaal bruikbaar. Beheerders en teamleden kunnen de deelnemers in hun toegankelijke kanaal blijven taggen; de volledige ledenadministratie blijft achter de bestaande adminrechten. Registratie- en toetredingsdatums worden niet aan klanten teruggestuurd.

Dezelfde zichtbaarheid geldt bij het daadwerkelijk versturen van tagmeldingen, zodat een klant de zoekbeperking niet met geraden gebruikers-ID's kan omzeilen. Expliciete tags door een beheerder zijn nog mogelijk; zulke zelfgeschreven berichten zijn geen automatische toetredingsaankondiging. Teamleden buiten het kanaal komen alleen uit dezelfde tenant in de suggesties.

Verificatie: `scripts/tests/silent-community-membership.ts` test bulktoevoegen, individuele toewijzing, cursuslidmaatschap, herhalen/synchroniseren, toegang voor de nieuwe deelnemer, geen berichten/wachtrij/meldingen/publieke wijzigingen, adminlijst privé, rolafhankelijke suggesties, geen toetredingsdatum/e-mail in klantresultaten, blokkeren van verborgen mention-ID's en normale mentions na vrijwillige activiteit. Tijdelijke privéfixtures zijn opgeruimd; geen echte mails verstuurd. Run met de lokale app: `node --env-file=.env --env-file=.env.local --import tsx scripts/tests/silent-community-membership.ts`.

TypeScript, gerichte ESLint, productiebuild en de bestaande aankoop-/activatieregressietests zijn geslaagd. Geen databasemigratie nodig.
