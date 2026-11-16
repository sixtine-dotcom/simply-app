# Open Design voor Carousel Studio

De lokale Simply-app kan goedgekeurde carouselteksten overzetten naar de Open Design-desktopapp. Het project bevat `slides.json`, `LEESMIJ.md` en één bewerkbaar HTML-bestand per slide (`slide-01.html` enzovoort), met ingesloten lettertypes en een startontwerp op 1080 × 1350 pixels.

Elk nieuw project krijgt dezelfde `STIJLBRIEFING.md`, de oorspronkelijke Canva-briefing, de Canva-werkinstructie, twee bestaande Canva-afbeeldingsvoorbeelden en de negen unieke voorbeeldlinks van Sixtine in `referenties/canva-sjablonen.md`. Die linklijst vermeldt afzonderlijk welke ontwerpen nog niet bekeken konden worden; alleen een link opslaan importeert het ontwerp niet. De vaste stijlbriefing wordt ook opgeslagen als Open Design-projectinstructie, zodat ze na de eerste ontwerpvraag blijft gelden. De bronnen zijn vastgelegd onder `src/lib/carousel-render/briefing/`; de oorspronkelijke Claude-bestanden worden niet gewijzigd. Wijzig de centrale stijlbriefing wanneer Sixtine de huisstijl bewust aanpast. Het start-HTML blijft een placeholder; de briefing en de bekeken Canva-voorbeelden bepalen de uiteindelijke vormgeving.

## Gebruik

1. Start Open Design en Simply op dezelfde Mac.
   Upload in de carousel bij **Jouw foto’s** je eigen JPG-, PNG- of WebP-foto’s (maximaal 15 MB per foto). De collectie wordt per organisatie bewaard en is beschikbaar bij volgende carousels. Kies één foto voor de carousel; met **Foto voor slide** kies je desgewenst een andere collectiefoto per slide. De eerste foto van een upload wordt automatisch gekozen als de carousel nog geen foto heeft. Verander je de fotoselectie na het aanmaken van een Open Design-project, maak dan een nieuw ontwerp met die inhoud.
2. Open een AI-carousel, kijk de tekst na en klik op **Tekst goedkeuren**.
3. Klik op **Maak in Open Design** en daarna op **Open ontwerp**. Het project opent in de lokale Open Design-webinterface van de desktopapp. Hetzelfde project staat in de desktopapp.
4. **Maak in Open Design** start nu de echte ontwerpopdracht in de ingestelde Open Design-runtime. Hiervoor moet de gekozen runtime geconfigureerd zijn en beschikbaar tegoed hebben. Simply volgt de voortgang en toont fouten, waaronder onvoldoende AMR-tegoed. Werk zo nodig de bestaande `slide-XX.html`-bestanden verder af in Open Design; behoud bestandsnamen, volgorde en formaat.
5. Klik in Simply op **Haal slides op**. Open Design exporteert alle slides als JPEG; Simply bewaart ze in R2 en zet de carousel op **Na te kijken**. Goedkeuren en inplannen blijven afzonderlijke acties.

Ophalen is geblokkeerd zolang geen ontwerpopdracht is geslaagd. `startbestanden.json` bewaart de hashes van de technische HTML-startbestanden: een onveranderde slide wordt niet als afgewerkt ontwerp geïmporteerd. Oudere projecten zonder ontwerpopdracht worden expliciet als startbestanden aangeduid.

De huidige briefing vraagt een vrijstaand portret met verwijderde achtergrond op een ontworpen merksurface. Een onbewerkte foto met een donkere laag voldoet daar niet aan. Originelen staan in de centrale `CarouselBrandPhoto`-bibliotheek; `cutoutUrl` bewaart een afzonderlijke transparante versie wanneer die gemaakt is. Niet iedere upload wordt automatisch vrijstaand gemaakt. De achtergrondbewerking is een aparte stap; de eerste uitsnede is als proef via de ingebouwde imagegen-tool gemaakt.

Als tekst, foto’s of volgorde in Simply veranderen, blokkeert het ophalen totdat je een nieuw ontwerp met die inhoud maakt. **Nieuw ontwerp met deze tekst** bewaart het vorige project in Open Design. Een import vervangt de bestaande slides pas wanneer alle exports en uploads gelukt zijn. Ondertussen gewijzigde carousels worden niet overschreven.

## Installatie

Pas de Prisma-migratie `20261104120000_carousel_open_design` toe en genereer de Prisma-client. De bestaande R2-configuratie is nodig om slides op te halen. De API gebruikt de bestaande admin- en tenantcontrole.

Op macOS ontdekt Simply de wisselende desktoppoorten via `lsof` en verifieert ze via `/api/daemon/status`. Er worden uitsluitend lokale HTTP-adressen gebruikt. Voor een afwijkende lokale installatie kun je instellen:

```env
OPENDESIGN_DAEMON_URL=http://127.0.0.1:7456
OPENDESIGN_WEB_URL=http://127.0.0.1:7457
```

Gebruik de werkelijke poorten van jouw installatie; deze voorbeelden zijn geen vaste desktoppoorten. Na een configuratiewijziging moet de Simply-server herstarten.

## Grenzen

Deze koppeling ondersteunt de lokale desktop-API van Open Design 0.24.1. Een gehoste Simply-server kan de desktopapp op de Mac van de gebruiker niet bereiken. Op Vercel meldt de interface dat deze handeling lokaal moet gebeuren; een toekomstige koppeling voor de online app vereist een afzonderlijke lokale bridge. Projecten en hun bronbestanden blijven in Open Design op de Mac; de geïmporteerde JPEGs staan in Simply/R2.

Verificatie: `npx tsx --test scripts/tests/open-design.ts` en een lokale proef van project aanmaken → HTML-bestand exporteren → JPEG ophalen.
