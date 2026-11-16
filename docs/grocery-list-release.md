# Boodschappenlijst — 16 november 2026

De actieve lijst staat centraal, met een opvallende naam, een compacte lijstkeuze en direct zichtbare producten. De gebruiker koos Impeccable.style als referentie; de uitvoering behoudt Montserrat en Simply-groen. De overige apppagina's zijn niet herontworpen.

## Gebruik

- Maak een lijst met een eigen naam, met of zonder recepten.
- Voeg zelf producten met een optionele hoeveelheid toe.
- Vink producten af en zet een vinkje terug; wijzigingen blijven bewaard.
- Pas productnamen en hoeveelheden aan via het potlood. Verwijderen vraagt bevestiging.
- Kopieer de volledige lijst als tekstchecklist en plak die in Notities. Bij geweigerde klembordtoegang verschijnt selecteerbare tekst.
- Op mobiel blijft de SIX-chat bereikbaar via een compacte knop op deze pagina.

## Verificatie

- TypeScript, gerichte ESLint en productiebuild geslaagd.
- Browsercontrole bij 1440×1000 en 390×844: geen horizontale overflow, naam wijzigen, toevoegen/bewerken/verwijderen, afvinken na herladen, lijsten wisselen, lege lijst maken, recepten zoeken/toevoegen, kopiëren en klembordfallback. Een mislukte opslag van een vinkje wordt teruggedraaid met foutmelding.
- Eindcontrole: eerste producten zichtbaar op mobiel, toetsenbordbediening, focus terug in het productveld na toevoegen, lange lijstnaam breekt af zonder overflow.
- Integratietest `scripts/tests/grocery-api.ts`: alleen eigen lijsten wijzigen, andere klant krijgt geen toegang, invoervalidatie en blijvende opslag. Run met de lokale app: `node --env-file=.env --env-file=.env.local --import tsx scripts/tests/grocery-api.ts`. Dit maakt alleen tijdelijke testaccounts en ruimt ze op; er wordt geen mail verstuurd.
- `npx tsx scripts/tests/grocery-generation.ts`: hoeveelheden worden gecombineerd, verschillende eenheden blijven apart, numerieke en tekstuele hoeveelheden behouden. Zonder echte database.
- Impeccable-detector: nul bevindingen. Onafhankelijke finish review: `ship` na het oplossen van de twee gevonden punten (toetsenbordfocus en tekstcontrast). Het tweede oordeel betreft die twee correcties, geen onbeperkte kwaliteitsclaim.
- Tijdelijke testaccounts en boodschappenlijsten zijn verwijderd. Tests op een echte iPhone/Capacitor blijven onderdeel van het TestFlight-traject.
