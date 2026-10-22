# Agenda en terugkerende coaching — 3 oktober 2026

De twee reeksen van 2 oktober zijn aanwezig in de opgeslagen groepsplanningen. De gekozen cursus heeft nul inschrijvingen, waardoor nul CoachingSession-records werden aangemaakt. De agenda las alleen CoachingSession-records; opgeslagen planningen bleven daardoor onzichtbaar.

De reeksen beginnen op 5 oktober (tweewekelijks tot 27 november) en 12 oktober (tweewekelijks tot 18 januari), telkens om 19.30 uur Belgische tijd. Het zijn verschillende schema’s; geen opgeslagen reeks is verwijderd of gewijzigd.

## Herstel

- De beheerdersagenda toont opgeslagen groepsplanningen ook zonder deelnemers en vermeldt dat er nog geen deelnemers zijn. Een gepland item opent de dagweergave.
- Zodra deelnemende sessies bestaan, worden zij per coach en groepsmoment samengevoegd in één agendavermelding. De planning verschijnt niet nogmaals als leeg groepsmoment.
- De vaste limiet van 500 sessies is verwijderd uit deze agenda-opvraging; die kon bij grotere groepen agenda-items verbergen.
- Nieuwe reeksen openen de maand van de gekozen begindatum.
- Reeksdatums en tijd worden bepaald in Europe/Brussels, onafhankelijk van de servertijdzone, inclusief wintertijd.
- Latere inschrijvingen behouden het originele tweewekelijkse/maandelijkse ritme. Alleen nog komende sessies worden toegevoegd.
- Nieuwe deelnemende sessies worden aangeboden aan bestaande agendakoppelingen. Bij zo’n update worden alle genodigden van hetzelfde groepsmoment meegenomen; bestaande deelnemers verdwijnen niet uit de uitnodiging.
- De externe uitnodiging verwijst naar de coachingpagina voor deelnemers, niet de beheerpagina.
- De aanmaakmelding onderscheidt opgeslagen reeksen, ontbrekende agendakoppelingen en mislukte externe uitnodigingen.
- De maandweergave en actiebalk kunnen op mobiel horizontaal scrollen zonder de gehele pagina breder te maken.

## Niet geactiveerd

Er zijn geen gekoppelde agenda-accounts. Zowel de Microsoft- als Google OAuth-configuratie ontbreekt in de gecontroleerde omgeving. Er zijn tijdens dit herstel geen echte uitnodigingen verstuurd, geen deelnemers toegevoegd en geen externe afspraken aangemaakt. De bestaande Microsoft-code maakt nog geen Teams-vergaderlink aan en importeert geen opnames. De sync-knop voert synchronisatie uit; er is geen geplande automatische agendasync geconfigureerd.

Een proef met Teams vraagt eerst configuratie van de Microsoft-app en aanmelden via Instellingen → Integraties → Outlook Calendar. Kalenderafspraken, Teams-deelnamelinks en opname-import zijn afzonderlijke onderdelen. Opname-import vereist aanvullende Microsoft Graph-toegang en inrichting.

## Verificatie

- Ingelogde browsercontrole op desktop en mobiel: bestaande groepsplanningen zichtbaar zonder deelnemers.
- Dagweergaven 5 en 12 oktober: beide sessies zichtbaar om 19.30 uur.
- Reekstests: tweewekelijks ritme, wintertijd, maandeinde en ontdubbeling van flexibele datums.
- Dezelfde reeks levert identieke tijdstippen op onder lokale en UTC-servertijdzone.
- Gemockte kalender-update: nieuwe én bestaande deelnemers behouden, één externe update; geen echte netwerkverzending.
- TypeScriptcontrole geslaagd. Wijzigingen lokaal getest, niet live gedeployd.
