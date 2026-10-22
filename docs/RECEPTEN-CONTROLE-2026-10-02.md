# Controle recepten — 2 oktober 2026

## Fotokwaliteit hersteld

De eerste foto-export rasterde de afbeeldingsvlakken op een vaste schaal van 2. Dit verlaagde bij 105 van 114 foto’s het aantal beeldpixels. De nieuwe extractor neemt de oorspronkelijke JPEG-bestanden rechtstreeks uit de PDF over, zonder herschaling of hercompressie. Voor zes gedraaide afbeeldingen legt EXIF uitsluitend de oorspronkelijke weergaverichting vast.

Alle 114 bestanden zijn vervangen in R2 en de database. De gecomprimeerde JPEG-beeldgegevens zijn voor alle foto’s byte voor byte gelijk aan die in de PDF. Het mediane aantal pixels is 1,91 keer de oude export; de totale bestandsgrootte daalt van 78,74 MB naar 11,39 MB. Unieke bestandsnamen voorkomen dat de oude wazige versies uit de afbeeldingscache terugkomen.

Gebruik `extract-recipe-bundle-images.py` met uitvoermap `.tmp/recipe-bundle-originals`, gevolgd door `repair-recipe-library.ts --photos-only --apply` om uitsluitend deze foto’s bij te werken. De twee recepten zonder bronfoto blijven ongewijzigd.

## Herstel uitgevoerd

- De beheerpagina was begrensd op 100; die grens en de standaardlimiet van 500 in de query zijn verwijderd.
- Zes ontbrekende recepten zijn toegevoegd met gecontroleerde inhoud en foto uit de PDF. Alle 116 bundelrecepten zijn aanwezig.
- 13 dubbele records zijn samengevoegd, uitsluitend bij exact gelijke ingrediënten én bereidingsstappen. Boodschappenlijsten, weekmenu’s en favorieten zijn meegenomen. Er blijven 178 gepubliceerde recepten over. Oude slugs worden in de aangepaste code naar het behouden recept vertaald.
- 114 originele bundelfoto’s zijn uit hun afbeeldingsvlakken gehaald en naar R2 geüpload. Geen lokale fotoverwijzingen blijven over.
- Een verouderde bananenbroodfoto is vervangen door de actuele originele websitefoto.
- Mugcake (p. 5) en Muhammara (p. 121) bevatten geen bronfoto; de eerdere lege/tekstuitsneden zijn verwijderd. Deze twee recepten hebben nog een originele foto nodig.
- HTTP-controle: alle 176 gekoppelde foto’s geven een succesvolle response met een afbeeldingscontenttype.
- Lokale ingelogde HTTP-controle: `/admin/recipes` en `/recipes` geven beide 200 en bevatten elk precies 178 unieke receptkaarten. Geen actieve filters gebruikt.
- Alle 15 bestaande boodschappenlijstkoppelingen zijn behouden. Er waren geen gekoppelde favorieten of weekmenu-items tijdens deze controle.
- TypeScript-controle (`tsc --noEmit`) geslaagd. Database en online afbeeldingen zijn bijgewerkt; er is geen nieuwe app-deployment uitgevoerd.
- Volledige back-up van recepten en relaties is privé lokaal opgeslagen vóór herstel (`.tmp-recipe-repair-backup-*.json`).

### Herhaalbare scripts

`extract-recipe-bundle-images.py` gebruikt PyMuPDF en de gecontroleerde paginamapping. `repair-recipe-library.ts` toont standaard alleen een preview; mutaties vereisen `--apply`. Gecontroleerde receptinhoud en afbeeldingsmapping staan onder `scripts/data/`.

## Oorspronkelijke controle vóór herstel

Bron: `/Users/sixtineophoff/Desktop/Simply Receptenbundel.pdf` (121 pagina’s), ingestelde database en huidige import- en synchronisatiecode. De live deployment is niet afzonderlijk gecontroleerd.

## Ontbrekende bundelrecepten

De bestaande parser herkent 110 recepten; deze zijn allemaal teruggevonden op slug of genormaliseerde titel. Zes extra receptpagina’s worden overgeslagen en zijn niet onder herkenbare titels aangetroffen:

| Pagina | Recept |
| --- | --- |
| 56 | Pasta vongolé met linzenpasta |
| 85 | Gehaktballetjes met knolselder-pastinaak-wortelpuree |
| 89 | Wortelini bolognaise |
| 103 | Geroosterde noten |
| 114 | Gegrilde pompoen met amandelpasta |
| 120 | Hapje met scampi |

De parser zoekt een beperkte lijst beginwoorden voor bereidingsstappen. ‘Snipper’, emoji’s en inleidende tekst worden niet goed herkend. Overgeslagen pagina’s worden niet gerapporteerd.

## Synchronisatie

De synchronisatie werkt van de Shopify-website naar de app; zij publiceert de PDF niet op Shopify. Er wordt één Atom-feed opgehaald. Bij controle bevat deze 30 recepten; alle 30 slugs staan in de database. Ook `?page=2` levert dezelfde recepten op, dus simpelweg een paginanummer toevoegen is geen oplossing voor volledige historische synchronisatie.

## Dubbelen en foto’s

De database bevat 185 recepten, alle gepubliceerd. Er zijn minstens 12 paren met dezelfde titel na normalisatie van spaties, accenten en leestekens. De synchronisatie vergelijkt alleen slugs; de PDF-import vergelijkt exacte titels en slugs, waardoor schrijfvarianten als nieuwe recepten kunnen worden toegevoegd. Inhoudelijke vergelijking blijft nodig vóór samenvoegen.

13 records hebben geen foto-URL. 110 records verwijzen naar lokale bestanden onder `/uploads/pdf-recipes/`. Die bestanden bestaan lokaal, maar `public/uploads` is uitgesloten in zowel `.gitignore` als `.vercelignore`. Dit veroorzaakt een risico op ontbrekende afbeeldingen bij deployment; de live afbeeldings-URL’s zijn niet gecontroleerd.

### Records zonder foto-URL

- Poke ́ bowl met gebakken zalm
- Vijgen met vegan feta tofu, amandelschilfers en basilicum
- Quinoa salade met pompoen kerstomaat, babyspinazie, zwarte olijven noten 4 personen
- Salade met kip zeekraal, spitskool, kerstomaatjes en geroosterde amandelschilfers
- Slaatje met asperges kerstomaatjesuitdeoven, kip, pijnboompitten
- Frissesalade met kippenreepjes eenhardgekookteitje, granaatappel, edamame, gegrildewortelsliertenengeroosterdeamandelschilfers
- Zalmmetzwarteolijvenkorst, bloemkool puree en aspergebroccoli 4 personen
- Groene currymet zoete aardappel kip en bloemkoolrijst 4 personen
- Gegrildetonijnsteakmetgegrildeaubergine, rucola en zoete aardappel frietjes 2 personen
- Groene currymet zalm en broccolirijst 4 personen
- Ovenschotel met aubergines & kippengehakt
- Gebakken koolraap tagliatelle met avocado - truffelsaus en kalkoenspekjes
- Koolsalade met vegetarisch gehakt koriander, granaatappel avocado en pijpajuin

## Herstelvolgorde

1. De zes overgeslagen pagina’s correct uitlezen en met de originele PDF controleren.
2. Dubbele records inhoudelijk vergelijken en koppelingen naar favorieten en weekmenu’s bewaren bij samenvoegen.
3. Bundelfoto’s duurzaam beschikbaar maken via publieke opslag of meegeleverde statische bestanden.
4. Import en synchronisatie voorzien van consistente herkenning van bestaande recepten en een overzicht van overgeslagen recepten.

Deze controle heeft geen recepten gewijzigd of verwijderd en niets gedeployd.
