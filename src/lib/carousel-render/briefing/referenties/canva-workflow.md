# Carousel Studio → Canva

## Standaard en proef

Lees `node src/canva-jobs.mjs list`. Gebruik `template` uit de uitvoer; de instelling staat in Carousel Studio → instellingen → Canva-sjabloon.
De oude standaard DAHXbZyD6NQ blijft actief tot Sixtine het proefontwerp heeft gezien en goedgekeurd.

Eenmalige proef, zonder statuswijziging of standaardwijziging:

```sh
node src/canva-jobs.mjs trial cmv5db1u3000emnoklqxjgx9o DAHXZ5e-kPk
```

Dit maakt een werkopdracht, GEEN Canva-ontwerp. Een verbonden Canva-editor is vereist voor uitvoering.

## Nieuw sjabloon: One day in my life

1. Open DAHXZ5e-kPk in de verbonden Canva-editor en maak een kopie. Wijzig nooit het origineel.
2. Inspecteer de echte pagina’s. Identificeer openingspagina, de verschillende inhoudspagina’s en de CTA-pagina. Raad het aantal of de element-ID’s niet.
3. Gebruik `planCarousel` uit `src/canva-layout.mjs` met de geïnspecteerde `templatePageCount`, `ctaPage` en `bodyPages`. Alleen als de laatste sjabloonpagina de CTA is en alle tussenpagina’s inhoudspagina’s zijn, kan de CLI met het geïnspecteerde aantal gebruikt worden.
4. Bouw precies één pagina per inhoudsslide. Kopieer bestaande inhoudspagina’s, wissel hun types cyclisch af en plaats extra pagina’s vóór de afsluitende CTA. Verwijder ongebruikte pagina’s uitsluitend uit de kopie. Behoud alle carouselinhoud.
5. Zet de titel in het grootste titelvak. Ontbreekt een titel, gebruik een korte titel die uitsluitend uit de bestaande tekst volgt; voeg geen claims toe.
6. Voeg per pagina een uitlegtekstvak toe: witte tekst (#FFFFFF), Montserrat, ongeveer 30 px. Bewaar de hele uitleg. Plaats dit vrij van de titel en controleer contrast, tekstoverloop en marges. Pas het tekstvak aan; laat tekst niet stilzwijgend weg.
7. Controleer alle pagina’s visueel en exporteer een preview. Geef Sixtine de bewerkbare Canva-link en toon de preview.
8. Proef: NIET `filled`, `save` of `fail` uitvoeren op het oorspronkelijke item, niet publiceren en de standaard niet wijzigen vóór de beoordeling.
9. Na expliciete goedkeuring mag DAHXZ5e-kPk als Canva-sjabloon opgeslagen worden. Normale opdrachten: pas na een volledig gecontroleerd ontwerp `filled <carouselId> <newDesignId>` uitvoeren.

`fields` in de CLI-uitvoer is uitsluitend voor het oude autofill-sjabloon. Bij `workflow: editable-pages` nooit gebruiken; gebruik de volledige `slides`.
