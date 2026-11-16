# Boodschappenlijst — werkruimte voor dagelijks gebruik

Mode: Operate. Scope: `/recipes/grocery-list`, bijbehorende handelingen en API's. De overige pagina's en de navigatie blijven behouden.

De gebruiker koos expliciet Impeccable.style als visuele referentie: ruim wit, grote rustige sans-serif titels, zwart voor hiërarchie, fijne lijnen, beheerste accentkleur en directe bediening. Die keuze bepaalt deze code-led uitvoering; geen alternatieve visuele werelden of conceptselectie nodig. Montserrat en het bestaande Simply-groen verbinden de pagina met het merk.

De actieve lijstnaam is de grootste tekst op de pagina. Desktop: compacte lijstenkolom links, open werkvlak rechts. Mobiel: lijstkeuze boven de titel, daarna direct de producten. Een nieuwe lijst maken is een bewust geopende inline stap, ook zonder recepten. Recepten zijn optioneel en doorzoekbaar. Geen grote introductiekaart of permanent receptenvak vóór de actieve lijst.

Directe handelingen: naam wijzigen, product toevoegen, product/hoeveelheid wijzigen, afvinken en weer terugzetten, product verwijderen met bevestiging, kopiëren als leesbare checklist voor Notities. Bewaar wijzigingen in de database en toon fouten met herstelmogelijkheid. Afvinken reageert direct en draait terug bij een opslagfout. Alleen de eigenaar kan de lijst aanpassen.

Quality bar: de lijstnaam is direct herkenbaar; de eerste producten en toevoegen staan op een gangbaar mobiel scherm; echte checkboxen met ruime aanraakvlakken; geen horizontale overflow op 390px; lange namen mogen afbreken; toetsenbordfocus en reduced-motion; fout, leeg, laden en klembordfallback uitgewerkt. Referentie: `.impeccable/review/grocery/reference.png`, incumbent: `before.png`.
