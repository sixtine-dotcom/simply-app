# Carousel-stijlgids (kennisbank)

Vaste basis voor de carousel-tool: elke week worden carouselteksten gegenereerd en ingevuld in deze sjablonen. Deze gids is de bron van waarheid voor lettertypes, opbouw en sjablonen. Nieuwe sjablonen of regels hier toevoegen.

## Merkregels

- **Geen kleurgebruik.** Elke slide is een foto over de volledige slide met **alleen witte tekst** (`#FFFFFF`).
- Spelen met **typografie** (grote serif-titels, cursieve accentwoorden, schaalcontrast) en eventueel losse beelden of witte krabbels (pijl, sterretje, cirkel, onderstreping).
- Formaat: **1080 × 1350 px (4:5)**.
- Handle: `@simplyinbalance`.

## Lettertypes

| Rol | Lettertype | Gebruik |
|---|---|---|
| Titels | **Noto Serif Display ExtraCondensed** (regular) | Grote koppen, 96–210 px, regelafstand 0,71–0,97, letterafstand −3 tot −6 % |
| Hooks / accentwoord | **Noto Serif Display ExtraCondensed *Italic*** | Eén woord of regel per titel cursief ("monthly / *business* / recap"), of als nummering ("*Habit 01*", ±73 px). Af en toe, niet op elke slide. |
| Leestekst | **Montserrat** (regular) | 27–35 px, regelafstand 1,0–1,4 |
| Labels | **Montserrat** (bold / extra bold) | Hoeklabels, handle, slidenummer: 20–27 px, soms in hoofdletters |

Beschikbaarheid in de app:
- **Montserrat** staat al in de app (`next/font/google`).
- **Noto Serif Display** is gratis via Google Fonts. ExtraCondensed is de breedte-as `wdth` = 62,5.

## Vaste opbouw (uit de voorbeeldsjablonen)

- Marge rondom: 108 px (compacte variant: 54 px).
- Labels in de hoeken (Montserrat, wit): linksboven thema, rechtsboven `@simplyinbalance`, linksonder reeks (bv. "Tips van six"), rechtsonder slidenummer ("Slide 01" of "01/05").
- Optioneel: dunne witte lijn (1 px) over de volle breedte onder de bovenste en boven de onderste labels.
- Titel met één cursief woord, korte leestekst eronder.
- Uitlijning wisselt per slide (links / rechts / gecentreerd) voor ritme.

## Sjablonen

Bronnen staan in Canva (account Simply in Balance).

### 1. Tips / gewoontes ("Habits that changed my life")
Canva: `DAHXZx3Tgew`. Let op: het origineel is 1080 × 1440 en moet naar 4:5.
- **Cover:** titel 192 px links uitgelijnd over 3–4 regels, witte krul-pijl, intro-tekst 31 px (regelafstand 1,4).
- **Inhoud (per tip):** cursief nummer "*Tip 01*" (73 px) boven een titel van 181 px, twee alinea's leestekst (35 px). Wisselt per slide tussen links en rechts uitgelijnd.
- Hoeklabels + dunne lijnen boven en onder.
- Velden: `thema`, `titel`, `intro`, en per tip `nummer`, `titel`, `tekst1`, `tekst2`.

### 2. Recap / getal in de kijker ("Monthly business recap")
Canva: `DAHXZzQxx0I`
- **Cover:** drie gestapelde regels van 127 px, licht verspringend, middelste regel cursief ("maandelijkse / *balans* / update").
- **Inhoud:** groot getal of kernwoord + cursieve regel + woord ("1208 / *nieuwe* / volgers"), met een smalle kolom leestekst (27 px, uitgevuld).
- Labels: linksboven "01/05", linksonder maand, rechtsonder thema.
- Velden: `regel1`, `accent`, `regel2`, `tekst`.

### 3. Dagboek / day in my life ("One day in my life")
Canva: `DAHXZ5e-kPk`
- Woorden verspreid over de foto: grote titelwoorden (210 px, regelafstand 0,71) + klein tussenwoord in hoofdletters ("IN", 73 px, letterafstand 12 %).
- Labels in serif-hoofdletters (45 px) linksboven en rechtsboven.
- Optioneel: losse uitgeknipte foto's of polaroids. De gele en beige accenten uit het origineel vallen weg (wit houden).
- Velden: `titelDeel1`, `tussenwoord`, `titelDeel2`, `label`.

### 4. Mythe vs. feit ("Myths vs. Facts")
Canva: `DAHXZ2CzKCE`
- **Cover:** gecentreerde titel van 166 px (regelafstand 0,82) op een donkere foto. Label linksboven (bold, 24 px), pijl-icoon rechtsboven (50 % dekking), handle onderaan.
- **Inhoud:** stelling als titel van 96 px links uitgelijnd, uitleg eronder over de volle breedte (27,5 px, uitgevuld).
- Velden: `stelling`, `uitleg` (per mythe).

### 5. Highlights ("Highlights of my year")
Canva: `DAHXZ2p8NXA`
- Compacte marge (54 px), kleine labels in de vier hoeken.
- Cover: klein label boven de titel ("(2026) jaaroverzicht"), titel van 127 px gecentreerd, handgeschreven regel schuin eronder, witte krabbels (ster, cirkel rond een woord, pijl).
- Het origineel gebruikt andere lettertypes en op slide 2 donkere tekst op beige. Bij omzetting: Noto Serif Display + Montserrat, alles wit op foto.
- Velden: `label`, `titel`, `handgeschreven`, `tekst`.

## Open vragen

- Handgeschreven lettertype voor de krabbelwoorden (sjabloon 5): gebruiken of niet?
- Eigen fotobibliotheek en/of stockfoto's.
- Aantal carousels per week en vaste thema's.
